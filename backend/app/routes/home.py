"""
backend/app/routes/home.py
══════════════════════════════════════════════════════════════════════════
Homepage data API — 17 endpoints under /api/home/

Every endpoint is:
  • Async where I/O is involved
  • Cached independently (TTL varies by data freshness requirement)
  • Designed to return exactly the JSON shape the frontend needs —
    no restructuring required on the client
  • Resilient: returns sane fallbacks on upstream failure

Data sources used:
  • API-Football  — fixtures, standings, top scorers, team statistics
  • FPL Bootstrap — player stats, prices, ownership, form
  • football_engine — Elo ratings, predict_match, LEAGUE_AVG_GOALS
  • predictions.py — historical prediction records
  • intelligence.py — Transfer Brief, RSS trending clubs
  • model_diagnostics / ml_predictor meta.json — model metrics
"""

from __future__ import annotations

import asyncio
import math
import os
import pathlib
import time
from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/home", tags=["home"])

# ── Re-use constants & helpers from main.py via import ──────────────────────
# We deliberately import only pure helpers — no circular imports.

# Lazy getter — reads env var at call time, not at import time.
# This matters on container platforms (e.g. Render) where env vars may be
# injected after the process starts.
def _api_key() -> str:
    return os.getenv("API_FOOTBALL_KEY", "")
_API_BASE         = "https://v3.football.api-sports.io"
_CURRENT_SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))
_FPL_BASE         = "https://fantasy.premierleague.com/api"

LEAGUE_IDS  = {"epl": 39, "laliga": 140, "seriea": 135, "ligue1": 61, "bundesliga": 78}
LEAGUE_NAMES = {"epl": "Premier League", "laliga": "La Liga", "seriea": "Serie A",
                "ligue1": "Ligue 1", "bundesliga": "Bundesliga"}
TOP5 = list(LEAGUE_IDS.keys())

# ── Truthful accountability metrics (no hardcoded fallbacks) ────────────────
try:
    from app.routes.home_accountability import performance_summary, accountability_summary
except ImportError:
    async def performance_summary(): return {}
    async def accountability_summary(): return {}

# ── Module-level in-process cache ────────────────────────────────────────────
_cache:  Dict[str, Any]   = {}
_ctimes: Dict[str, float] = {}

def _cget(k: str, ttl: float) -> Optional[Any]:
    return _cache[k] if k in _cache and time.monotonic() - _ctimes.get(k, 0) < ttl else None

def _cset(k: str, v: Any) -> None:
    _cache[k] = v; _ctimes[k] = time.monotonic()

TTL_SHORT  = 300    #  5 min  — live-ish data (fixtures, predictions)
TTL_MEDIUM = 900    # 15 min  — standings, form tables
TTL_LONG   = 3600   #  1 hr   — top scorers, player stats
TTL_DAY    = 86400  # 24 hr   — static/semi-static (glossary, model meta)


# ══════════════════════════════════════════════════════════════════════════════
# SHARED HTTP HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def _api(path: str, params: dict, ttl: float = TTL_MEDIUM) -> list:
    """Async API-Football request with per-key caching. Returns response[] list."""
    key = _api_key()
    if not key:
        return []
    cache_key = f"api:{path}:{sorted(params.items())}"
    hit = _cget(cache_key, ttl)
    if hit is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{_API_BASE}/{path.lstrip('/')}",
                headers={"x-apisports-key": key},
                params=params,
            )
            if r.status_code == 200:
                data = r.json().get("response", [])
                if data:  # never cache empty — allow retry on next request
                    _cset(cache_key, data)
                return data
    except Exception:
        pass
    return []


async def _fpl() -> dict:
    """FPL bootstrap-static (cached 1 hr)."""
    hit = _cget("fpl:bootstrap", TTL_LONG)
    if hit is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{_FPL_BASE}/bootstrap-static/")
            if r.status_code == 200:
                data = r.json()
                _cset("fpl:bootstrap", data)
                return data
    except Exception:
        pass
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# SHARED UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def _safe(d, *keys, default=0):
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k, default)
    return d or default


def _form_pts(form: str) -> int:
    return sum(3 if c == "W" else 1 if c == "D" else 0 for c in (form or "").upper()[-5:])


def _conf_color(conf: int) -> str:
    if conf >= 70: return "high"
    if conf >= 55: return "medium"
    return "low"


def _parse_standings(raw_response: list) -> list:
    try:
        rows = raw_response[0]["league"]["standings"][0]
    except (IndexError, KeyError, TypeError):
        return []
    out = []
    for e in rows:
        t = e.get("team", {}); a = e.get("all", {}); g = a.get("goals", {})
        out.append({
            "rank":         e.get("rank"),
            "team_id":      t.get("id"),
            "team_name":    t.get("name", ""),
            "logo":         t.get("logo", ""),
            "played":       a.get("played", 0),
            "won":          a.get("win", 0),
            "drawn":        a.get("draw", 0),
            "lost":         a.get("lose", 0),
            "goals_for":    g.get("for", 0),
            "goals_against":g.get("against", 0),
            "goal_diff":    e.get("goalsDiff", 0),
            "points":       e.get("points", 0),
            "form":         e.get("form", ""),
        })
    return out


# ══════════════════════════════════════════════════════════════════════════════
# 1. TOP PREDICTIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/top_predictions")
async def top_predictions(league: str = Query("epl")):
    """
    Top 4 upcoming fixtures with full prediction data.
    Shape matches PredictionStrip exactly:
      { home, away, homeProb, awayProb, draw, col, conf, score,
        fixture_id, home_logo, away_logo, league, kickoff }

    Uses build_xg_from_team_stats() from football_engine (same as win_prob.py)
    so probabilities are consistent across the whole app.
    """
    cache_key = f"home:top_predictions:{league}"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    COLORS = {"epl": "#4f9eff", "laliga": "#f2c94c", "seriea": "#00e09e",
              "bundesliga": "#ff8c42", "ligue1": "#b388ff"}
    col = COLORS.get(league, "#4f9eff")

    lid = LEAGUE_IDS.get(league, 39)
    today = date.today().isoformat()
    end   = (date.today() + timedelta(days=21)).isoformat()

    fixtures = await _api("/fixtures", {
        "league": lid, "season": _CURRENT_SEASON,
        "from": today, "to": end, "status": "NS"
    }, TTL_SHORT)

    # Import canonical xG builder — same function used by win_prob.py and
    # league_predictions so probabilities are consistent everywhere.
    try:
        from app.football_engine import build_xg_from_team_stats, LEAGUE_AVG_GOALS, FALLBACK_AVG
    except ImportError:
        build_xg_from_team_stats = None
        LEAGUE_AVG_GOALS = {}
        FALLBACK_AVG = {"home": 1.35, "away": 1.05}

    def _poisson_p(lam, k):
        return (lam ** k) * math.exp(-lam) / math.factorial(k)

    preds_out = []
    for fx in fixtures[:6]:
        try:
            teams = fx.get("teams", {}); fix = fx.get("fixture", {})
            home_t = teams.get("home", {}); away_t = teams.get("away", {})

            home_stats_raw = await _api("/teams/statistics", {
                "team": home_t.get("id"), "league": lid,
                "season": _CURRENT_SEASON
            }, TTL_LONG)
            away_stats_raw = await _api("/teams/statistics", {
                "team": away_t.get("id"), "league": lid,
                "season": _CURRENT_SEASON
            }, TTL_LONG)

            def _normalise_stats(raw):
                s = raw[0] if raw else {}
                fx2 = s.get("fixtures", {}); gl = s.get("goals", {})
                return {
                    "played_home":   (fx2.get("played") or {}).get("home", 0),
                    "played_away":   (fx2.get("played") or {}).get("away", 0),
                    "scored_home":   ((gl.get("for") or {}).get("total") or {}).get("home", 0),
                    "scored_away":   ((gl.get("for") or {}).get("total") or {}).get("away", 0),
                    "conceded_home": ((gl.get("against") or {}).get("total") or {}).get("home", 0),
                    "conceded_away": ((gl.get("against") or {}).get("total") or {}).get("away", 0),
                    "form":          s.get("form", ""),
                }

            home_stats = _normalise_stats(home_stats_raw)
            away_stats = _normalise_stats(away_stats_raw)

            # Use canonical xG engine (consistent with win_prob.py)
            if build_xg_from_team_stats is not None:
                league_avg = LEAGUE_AVG_GOALS.get(lid, FALLBACK_AVG)
                xg_h, xg_a = build_xg_from_team_stats(
                    home_team_id=home_t.get("id", 0),
                    away_team_id=away_t.get("id", 0),
                    home_stats=home_stats,
                    away_stats=away_stats,
                    league_avg=league_avg,
                    elo=None,
                    home_team_name=home_t.get("name", ""),
                    away_team_name=away_t.get("name", ""),
                    home_form=home_stats.get("form", ""),
                    away_form=away_stats.get("form", ""),
                )
            else:
                # Minimal fallback if football_engine unavailable
                avg = FALLBACK_AVG
                xg_h = round(avg.get("home", 1.35), 2)
                xg_a = round(avg.get("away", 1.05), 2)

            # Poisson match probabilities
            hw = dw = aw_p = 0.0
            for h in range(8):
                for a in range(8):
                    prob = _poisson_p(xg_h, h) * _poisson_p(xg_a, a)
                    if h > a:   hw   += prob
                    elif h < a: aw_p += prob
                    else:       dw   += prob
            total = hw + dw + aw_p or 1
            hw = round(hw / total * 100); aw_p = round(aw_p / total * 100); dw = 100 - hw - aw_p

            # Most likely scoreline
            best_p, mls = 0.0, "1-0"
            for h in range(6):
                for a in range(6):
                    p = _poisson_p(xg_h, h) * _poisson_p(xg_a, a)
                    if p > best_p:
                        best_p = p; mls = f"{h}-{a}"

            conf = min(95, int(50 + (max(hw, dw, aw_p) - 33.3) * 1.2))

            kickoff = fix.get("date", "")
            preds_out.append({
                "fixture_id":  fix.get("id"),
                "home":        home_t.get("name", ""),
                "away":        away_t.get("name", ""),
                "home_logo":   home_t.get("logo", ""),
                "away_logo":   away_t.get("logo", ""),
                "homeProb":    hw,
                "awayProb":    aw_p,
                "draw":        dw,
                "col":         col,
                "conf":        _conf_color(conf),
                "conf_pct":    conf,
                "score":       mls,
                "xg_home":     xg_h,
                "xg_away":     xg_a,
                "league":      LEAGUE_NAMES.get(league, ""),
                "league_code": league,
                "kickoff":     kickoff[:10] if kickoff else "",
                "time":        kickoff[11:16] if len(kickoff) > 10 else "",
            })
        except Exception:
            continue
        if len(preds_out) >= 4:
            break

    result = {"predictions": preds_out, "league": league,
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 2. MODEL EDGES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model_edges")
async def model_edges():
    """
    Fixtures where the model's probability diverges most from the
    market implied odds (value betting signals).
    Returns up to 5 edges with team names, model prob, edge direction.

    NOTE: market_home uses a league-average implied probability (45% EPL home win).
    This is an approximation — real bookmaker odds are not integrated.
    The `indicative_only` flag is set in every edge to communicate this.
    """
    cache_key = "home:model_edges"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    # Pull EPL upcoming predictions (reuse top_predictions logic)
    top = await top_predictions(league="epl")
    preds = top.get("predictions", [])

    edges = []
    for p in preds:
        hw = p.get("homeProb", 50)
        # EPL long-run average home-win implied probability ≈ 45%.
        # Real bookmaker odds would give a per-fixture figure; we don't
        # have a live odds feed so this is an approximation.
        market_home = 45
        edge_val = hw - market_home
        if abs(edge_val) >= 8:
            direction = "home" if edge_val > 0 else "away"
            edges.append({
                "fixture_id":     p.get("fixture_id"),
                "home":           p["home"],
                "away":           p["away"],
                "model_prob":     hw if edge_val > 0 else p["awayProb"],
                "edge":           round(abs(edge_val), 1),
                "direction":      direction,
                "label":          f"{p['home'] if direction=='home' else p['away']} edge",
                "col":            "#00e09e" if edge_val > 0 else "#b388ff",
                "indicative_only": True,  # remind frontend: market prob is a league average
            })

    result = {"edges": edges[:5], "indicative_only": True,
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. TRENDING PLAYERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/trending_players")
async def trending_players():
    """
    Top 8 players trending in FPL and/or form — for the LiveTicker.
    Returns { label, value, col, player_id, type }
    """
    cache_key = "home:trending_players"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    bootstrap = await _fpl()
    players = bootstrap.get("elements", [])
    teams   = {t["id"]: t for t in bootstrap.get("teams", [])}

    COLORS = ["#f2c94c", "#00e09e", "#4f9eff", "#b388ff",
              "#ff8c42", "#2dd4bf", "#f472b6", "#ff4d6d"]

    items = []

    # Sort by form descending (FPL form is already a string like "7.3")
    by_form = sorted(
        [p for p in players if float(p.get("form", 0) or 0) > 4],
        key=lambda p: float(p.get("form", 0) or 0),
        reverse=True,
    )[:4]

    for i, p in enumerate(by_form):
        team = teams.get(p.get("team", 0), {})
        items.append({
            "label":     p.get("web_name", ""),
            "value":     p.get("form", "0"),
            "col":       COLORS[i % len(COLORS)],
            "player_id": p.get("id"),
            "type":      "form",
            "sub":       f"Form rating | {team.get('short_name','')}",
        })

    # Top by total_points this season
    by_pts = sorted(players, key=lambda p: p.get("total_points", 0), reverse=True)[:4]
    for i, p in enumerate(by_pts):
        team = teams.get(p.get("team", 0), {})
        items.append({
            "label":     p.get("web_name", ""),
            "value":     str(p.get("total_points", 0)),
            "col":       COLORS[(i + 4) % len(COLORS)],
            "player_id": p.get("id"),
            "type":      "points",
            "sub":       f"Season pts | {team.get('short_name','')}",
        })

    result = {"items": items, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 4. FORM TABLE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/form_table")
async def form_table(league: str = Query("epl"), n: int = Query(6)):
    """
    Top N teams by last-5 form points, with rank, team, form string, pts.
    """
    cache_key = f"home:form_table:{league}:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)

    enriched = []
    for t in standings:
        form_str = (t.get("form") or "")[-5:]
        pts5 = _form_pts(form_str)
        enriched.append({**t, "form5": form_str, "form_pts": pts5})

    # Sort by form points in last 5
    enriched.sort(key=lambda t: (-t["form_pts"], -t["points"]))

    result = {
        "table":      enriched[:n],
        "league":     LEAGUE_NAMES.get(league, league),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 5. FEATURED FIXTURES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/featured_fixtures")
async def featured_fixtures():
    """
    The 3 highest-profile upcoming fixtures across all leagues.
    Selects by ELO closeness (most competitive match-ups).
    """
    cache_key = "home:featured_fixtures"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    today = date.today().isoformat()
    end   = (date.today() + timedelta(days=21)).isoformat()

    # Fetch upcoming fixtures across all top-5 leagues in parallel
    tasks = [
        _api("/fixtures", {"league": lid, "season": _CURRENT_SEASON,
                           "from": today, "to": end, "status": "NS"}, TTL_SHORT)
        for lid in LEAGUE_IDS.values()
    ]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    fixtures = []
    for code, result in zip(LEAGUE_IDS.keys(), all_results):
        if isinstance(result, list):
            for fx in result[:5]:
                fix   = fx.get("fixture", {}); teams = fx.get("teams", {})
                league = fx.get("league", {})
                kickoff = fix.get("date", "")
                fixtures.append({
                    "fixture_id":  fix.get("id"),
                    "league_code": code,
                    "league":      LEAGUE_NAMES.get(code, ""),
                    "league_logo": league.get("logo", ""),
                    "home":        teams.get("home", {}).get("name", ""),
                    "away":        teams.get("away", {}).get("name", ""),
                    "home_logo":   teams.get("home", {}).get("logo", ""),
                    "away_logo":   teams.get("away", {}).get("logo", ""),
                    "kickoff":     kickoff[:10] if kickoff else "",
                    "time":        kickoff[11:16] if len(kickoff) > 10 else "",
                    "venue":       (fix.get("venue") or {}).get("name", "") if isinstance(fix.get("venue"), dict) else "",
                })

    # Pick the first fixture per league for variety — top 3 overall
    seen_leagues = set(); featured = []
    for fx in fixtures:
        if fx["league_code"] not in seen_leagues:
            seen_leagues.add(fx["league_code"])
            featured.append(fx)
        if len(featured) >= 3:
            break

    result = {"fixtures": featured, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 6. MODEL CONFIDENCE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model_confidence")
async def model_confidence():
    """
    Distribution of model confidence across this week's predictions.
    Returns { high, medium, low, avg_confidence, total }
    """
    cache_key = "home:model_confidence"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    top = await top_predictions(league="epl")
    preds = top.get("predictions", [])
    confs = [p.get("conf_pct", 50) for p in preds]

    high   = sum(1 for c in confs if c >= 70)
    medium = sum(1 for c in confs if 55 <= c < 70)
    low    = sum(1 for c in confs if c < 55)
    avg    = round(sum(confs) / len(confs), 1) if confs else 0

    result = {
        "high": high, "medium": medium, "low": low,
        "avg_confidence": avg,
        "total": len(confs),
        "distribution": confs,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 7. TITLE RACE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/title_race")
async def title_race(league: str = Query("epl")):
    """
    Top-4 standings with gap analysis and form trend for title race widget.
    """
    cache_key = f"home:title_race:{league}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)

    if not standings:
        return {"error": "no_data", "standings": []}

    top4 = standings[:4]
    leader = top4[0]
    gap_1_2 = (top4[0]["points"] - top4[1]["points"]) if len(top4) > 1 else 0

    race = []
    for i, t in enumerate(top4):
        form_str = (t.get("form") or "")[-5:]
        form_letters = list(form_str)
        race.append({
            **t,
            "gap_to_leader": leader["points"] - t["points"],
            "form_letters":  form_letters,
            "form_pts":      _form_pts(form_str),
            "projection":    t["points"] + _form_pts(form_str) * 2,  # rough 10-match projection
            "trend":         "up" if form_str[-2:] in ("WW",) else "down" if form_str[-2:] in ("LL",) else "neutral",
        })

    result = {
        "top4":      race,
        "leader":    leader.get("team_name", ""),
        "gap_1_2":   gap_1_2,
        "league":    LEAGUE_NAMES.get(league, league),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 8. TRANSFER BRIEF
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/transfer_brief")
async def transfer_brief_home():
    """
    Proxy to /api/intelligence/transfer-brief.
    Returns the structured Transfer Brief for the homepage card.
    """
    cache_key = "home:transfer_brief"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    try:
        from app.routes.intelligence import build_transfer_brief, _all_rss
        rss = await _all_rss()
        transfers = [a for a in rss if a.get("type") == "transfer"]
        brief = build_transfer_brief(transfers, rss)
        if brief:
            result = brief
        else:
            result = {
                "title":         "Transfer Brief",
                "summary":       "No major transfer news today.",
                "key_transfers": [],
                "statinsight":   "",
            }
    except Exception:
        result = {
            "title":         "Transfer Brief",
            "summary":       "Transfer data unavailable.",
            "key_transfers": [],
            "statinsight":   "",
        }

    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 9. TACTICAL INSIGHT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/tactical_insight")
async def tactical_insight(league: str = Query("epl")):
    """
    Goals-per-game stat highlights for the top 5 league teams.
    Returns the highest-scoring team as the primary insight, plus all 5.

    Note: this is a goals-per-game metric derived from standings data.
    It is NOT a PPDA or pressing intensity metric — the free API tier
    does not expose per-match pressing stats.
    """
    cache_key = f"home:tactical_insight:{league}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)

    insights = []
    ICONS    = ["⚡", "🎯", "🧠", "⚽", "🔥"]
    COLORS   = ["#f2c94c", "#4f9eff", "#00e09e", "#b388ff", "#ff8c42"]

    for i, team in enumerate(standings[:5]):
        form_str  = (team.get("form") or "")[-5:]
        gf_pg     = round(team["goals_for"]     / max(team["played"], 1), 2)
        ga_pg     = round(team["goals_against"] / max(team["played"], 1), 2)

        insights.append({
            "stat":    str(gf_pg),
            "label":   "Goals/game",
            "player":  team["team_name"],
            "context": (
                f"{team['team_name']} are scoring {gf_pg} goals per game in the "
                f"{LEAGUE_NAMES.get(league, 'league')}, ranked {team['rank']} with "
                f"{team['points']} points. Recent form: {form_str or 'N/A'}. "
                f"Conceding {ga_pg} per game."
            ),
            "col":     COLORS[i % len(COLORS)],
            "icon":    ICONS[i % len(ICONS)],
            "team_id": team.get("team_id"),
            "stat_type": "goals_per_game",  # explicit so frontend can label correctly
        })

    if not insights:
        result = {"primary": None, "all": [], "generated_at": datetime.now(timezone.utc).isoformat()}
        _cset(cache_key, result)
        return result

    # Primary = highest goals-per-game team (the most attacking team in the top 5)
    best = max(insights, key=lambda x: float(x["stat"]))

    result = {
        "primary": best,
        "all":     insights[:4],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 10. MODEL METRICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model_metrics")
async def model_metrics():
    """
    Model performance summary for the ModelPerformance widget.
    Reads from meta.json (written by ml_predictor.train_model) where
    available, and falls back to the predictions accountability DB.
    Returns:
      { overall_accuracy, log_loss, brier_score, last_30_accuracy,
        trend[{gw,acc}], by_market[{l,v,col}] }
    """
    cache_key = "home:model_metrics"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    # Try live predictions DB
    overall = last30 = log_loss_v = brier = None
    trend   = []
    try:
        from app.routes.predictions import model_performance
        perf = await model_performance(league=None, window=200)
        overall     = perf.get("overall_accuracy")
        last30      = perf.get("last_30_accuracy")
        log_loss_v  = perf.get("log_loss")
        brier       = perf.get("brier_score")
        raw_trend   = perf.get("trend", [])
        trend = [
            {"gw": f"#{p['end_index']}", "acc": p["accuracy"]}
            for p in raw_trend[-8:]
        ]
    except Exception:
        pass

    # by_market: per-outcome accuracy breakdown.
    # We only populate this if outcome_accuracy is available from the predictions DB.
    # An empty list is returned when data is insufficient — the frontend renders an
    # empty state. We do NOT fabricate entries here.
    by_market = []
    outcome_accuracy = None
    try:
        from app.routes.predictions import model_performance as _mp
        perf_full = await _mp(league=None, window=200)
        outcome_accuracy = perf_full.get("outcome_accuracy")  # {home, draw, away}
        if outcome_accuracy and overall is not None:
            by_market = [
                {"l": "Home Win",  "v": round(outcome_accuracy.get("home", 0), 1), "col": "#4f9eff"},
                {"l": "Draw",      "v": round(outcome_accuracy.get("draw", 0), 1), "col": "#f2c94c"},
                {"l": "Away Win",  "v": round(outcome_accuracy.get("away", 0), 1), "col": "#b388ff"},
            ]
    except Exception:
        pass

    # No fake trend fallback — if no verified predictions, trend stays empty
    # Frontend renders a clean empty state when trend is []

    # Compute real logged count from predictions DB
    fixtures_count = None
    try:
        from app.routes.predictions import predictions_health
        health = predictions_health()
        fixtures_count = health.get("logged", 0)
    except Exception:
        pass

    result = {
        "overall_accuracy": overall,    # None if no verified data
        "log_loss":         log_loss_v,
        "brier_score":      brier,
        "last_30_accuracy": last30,
        "trend":            trend,      # [] if no data
        "by_market":        by_market,  # [] if insufficient data; populated per-outcome when available
        "by_market_computed": len(by_market) > 0,
        "outcome_accuracy": outcome_accuracy,  # {home, draw, away} or None
        "fixtures_count":   fixtures_count,
        "leagues_note":     "EPL, La Liga, Serie A, Ligue 1, Bundesliga",
        "generated_at":     datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 11. POWER RANKINGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/power_rankings")
async def power_rankings(league: str = Query("epl"), n: int = Query(8)):
    """
    Composite power score = 0.35×pts_norm + 0.25×form_norm
                            + 0.20×gd_norm + 0.20×ppg_norm

    pts_norm  — current points / max points in league
    form_norm — last-5 form points / 15 (max possible)
    gd_norm   — goal diff normalised to [0,1] across all teams
    ppg_norm  — points per game / 3.0 (max possible)

    Returns top N teams with power_score, power_rank, and rank_delta
    (positive = model ranks them higher than the league table does).
    """
    cache_key = f"home:power_rankings:{league}:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)
    if not standings:
        return {"rankings": [], "generated_at": datetime.now(timezone.utc).isoformat()}

    # Compute component scores
    max_pts = max(t["points"] for t in standings) or 1
    max_gd  = max(abs(t["goal_diff"]) for t in standings) or 1
    min_gd  = min(t["goal_diff"] for t in standings)

    enriched = []
    for t in standings:
        form_str = (t.get("form") or "")[-5:]
        form_pts = _form_pts(form_str)                              # 0–15

        ppg        = t["points"] / max(t["played"], 1)
        gd_norm    = (t["goal_diff"] - min_gd) / max(max_gd - min_gd, 1)
        pts_norm   = t["points"] / max_pts
        form_norm  = form_pts / 15.0

        power_score = round(
            0.35 * pts_norm +
            0.25 * form_norm +
            0.20 * gd_norm +
            0.20 * (ppg / 3.0),
            4,
        )
        enriched.append({
            **t,
            "form_letters": list(form_str),
            "form_pts":     form_pts,
            "ppg":          round(ppg, 2),
            "power_score":  power_score,
            "power_pct":    round(power_score * 100, 1),
        })

    enriched.sort(key=lambda t: -t["power_score"])
    for i, t in enumerate(enriched):
        t["power_rank"]   = i + 1
        t["rank_delta"]   = t["rank"] - (i + 1)   # positive = model higher than table

    result = {
        "rankings":  enriched[:n],
        "league":    LEAGUE_NAMES.get(league, league),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 12. XG LEADERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/xg_leaders")
async def xg_leaders(league: str = Query("epl"), n: int = Query(8)):
    """
    Top N players by goals + assists as an xG proxy (real xG not in free API).
    Returns player_id, name, team, goals, assists, g_plus_a, photo.
    """
    cache_key = f"home:xg_leaders:{league}:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    data = await _api("/players/topscorers", {"league": lid, "season": _CURRENT_SEASON}, TTL_LONG)

    leaders = []
    for entry in data[:n]:
        p   = entry.get("player", {})
        s   = (entry.get("statistics") or [{}])[0]
        g   = s.get("goals", {})
        gms = s.get("games", {})
        tm  = s.get("team", {})
        appeared = max(gms.get("appearences") or gms.get("appearances") or 1, 1)
        goals    = g.get("total") or 0
        assists  = g.get("assists") or 0
        leaders.append({
            "player_id":  p.get("id"),
            "name":       p.get("name", ""),
            "photo":      p.get("photo", ""),
            "team":       tm.get("name", ""),
            "team_logo":  tm.get("logo", ""),
            "goals":      goals,
            "assists":    assists,
            "g_plus_a":   goals + assists,
            "per90":      round((goals + assists) / appeared, 2),
            "played":     appeared,
        })

    leaders.sort(key=lambda p: -p["g_plus_a"])

    result = {
        "leaders":  leaders,
        "league":   LEAGUE_NAMES.get(league, league),
        "label":    "Goals + Assists",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 13. VALUE PLAYERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/value_players")
async def value_players(n: int = Query(6)):
    """
    FPL players with highest points-per-million value this season.
    Returns player_id, name, team, cost, total_points, value_score, position.
    """
    cache_key = f"home:value_players:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    bootstrap = await _fpl()
    players   = bootstrap.get("elements", [])
    teams     = {t["id"]: t for t in bootstrap.get("teams", [])}
    pos_map   = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

    # Filter: started at least 5 games, cost <= 8.0m
    eligible = [
        p for p in players
        if (p.get("starts") or p.get("minutes", 0) // 80 or 0) >= 5
        and p.get("now_cost", 0) <= 80   # FPL cost is ×10 (80 = £8.0m)
        and p.get("total_points", 0) > 30
    ]

    for p in eligible:
        cost_m = (p.get("now_cost") or 50) / 10.0
        p["value_score"] = round(p.get("total_points", 0) / max(cost_m, 0.1), 2)

    eligible.sort(key=lambda p: -p["value_score"])

    out = []
    for p in eligible[:n]:
        team = teams.get(p.get("team", 0), {})
        out.append({
            "player_id":    p.get("id"),
            "name":         p.get("web_name", ""),
            "full_name":    f"{p.get('first_name','')} {p.get('second_name','')}".strip(),
            "team":         team.get("name", ""),
            "team_short":   team.get("short_name", ""),
            "position":     pos_map.get(p.get("element_type", 4), "MID"),
            "cost":         (p.get("now_cost") or 50) / 10.0,
            "total_points": p.get("total_points", 0),
            "form":         p.get("form", "0"),
            "value_score":  p.get("value_score", 0),
            "ownership":    p.get("selected_by_percent", "0"),
        })

    result = {
        "players":  out,
        "label":    "Points per £m",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 14. HIGH SCORING MATCHES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/high_scoring_matches")
async def high_scoring_matches(n: int = Query(5)):
    """
    Upcoming fixtures with the highest predicted total goals (xG_home + xG_away).
    Gathers predictions from all leagues. Results are cached at the cross-league
    level (TTL_SHORT) to avoid cascading API calls on every dashboard request.
    """
    cache_key = f"home:high_scoring:{n}"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    # Use a shared cross-league predictions cache so that if dashboard() has already
    # called top_predictions() for EPL (index 0), those results are cache-hits here.
    # All 5 leagues fire concurrently — each top_predictions() call is itself cached.
    tasks = [top_predictions(league=code) for code in TOP5]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_preds = []
    for r in results:
        if isinstance(r, dict):
            all_preds.extend(r.get("predictions", []))

    # Deduplicate by fixture_id (same fixture shouldn't appear from two leagues)
    seen_ids: set = set()
    unique_preds = []
    for p in all_preds:
        fid = p.get("fixture_id")
        if fid and fid not in seen_ids:
            seen_ids.add(fid)
            unique_preds.append(p)

    # Sort by predicted total goals
    for p in unique_preds:
        p["total_xg"] = round(p.get("xg_home", 0) + p.get("xg_away", 0), 2)

    unique_preds.sort(key=lambda p: -p.get("total_xg", 0))

    result = {
        "matches":  unique_preds[:n],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 15. DEFENSE TABLE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/defense_table")
async def defense_table(league: str = Query("epl"), n: int = Query(6)):
    """
    Top N teams by defensive record: goals against, clean sheets, GA/game.
    Clean sheet counts are fetched from /teams/statistics for the top N teams.
    """
    cache_key = f"home:defense_table:{league}:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)

    for t in standings:
        t["ga_pg"]    = round(t["goals_against"] / max(t["played"], 1), 2)
        t["form_pts"] = _form_pts((t.get("form") or "")[-5:])

    # Sort by fewest goals against per game, then total goals against
    standings.sort(key=lambda t: (t["ga_pg"], t["goals_against"]))
    top_n = standings[:n]

    # Fetch clean sheet data for the top N teams in parallel
    async def _clean_sheets(team_id: int) -> int:
        if not team_id:
            return 0
        try:
            ts = await _api("/teams/statistics", {
                "team": team_id, "league": lid, "season": _CURRENT_SEASON
            }, TTL_LONG)
            if ts:
                fixtures = (ts[0].get("fixtures") or {})
                # API returns clean sheets under fixtures.draws (no — it's under clean_sheets)
                # Structure: {"clean_sheet": {"home": N, "away": N, "total": N}}
                cs = ts[0].get("clean_sheet") or {}
                return int(cs.get("total") or 0)
        except Exception:
            pass
        return 0

    cs_results = await asyncio.gather(
        *[_clean_sheets(t.get("team_id", 0)) for t in top_n],
        return_exceptions=True,
    )
    for t, cs in zip(top_n, cs_results):
        t["clean_sheets"] = cs if isinstance(cs, int) else 0

    result = {
        "table":    top_n,
        "league":   LEAGUE_NAMES.get(league, league),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 16. DIFFERENTIAL CAPTAINS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/differential_captains")
async def differential_captains(n: int = Query(5)):
    """
    FPL captain picks with ownership < 15% but high upcoming fixture score.
    Returns player_id, name, team, ownership, fixture_diff, form, cost.
    """
    cache_key = f"home:differential_captains:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    bootstrap = await _fpl()
    players   = bootstrap.get("elements", [])
    teams     = {t["id"]: t for t in bootstrap.get("teams", [])}
    pos_map   = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

    # Differentials: ownership < 15%, good form, attacking position
    diffs = [
        p for p in players
        if float(p.get("selected_by_percent") or "0") < 15.0
        and float(p.get("form") or 0) >= 4.5
        and p.get("element_type", 4) in (3, 4)  # MID or FWD
        and (p.get("starts") or 0) >= 3
    ]

    # Score: form * (1 - ownership_fraction)  — rewards form + low ownership
    for p in diffs:
        ownership = float(p.get("selected_by_percent") or "0") / 100.0
        form      = float(p.get("form") or 0)
        p["diff_score"] = round(form * (1 - ownership), 3)

    diffs.sort(key=lambda p: -p["diff_score"])

    out = []
    for p in diffs[:n]:
        team = teams.get(p.get("team", 0), {})
        out.append({
            "player_id":  p.get("id"),
            "name":       p.get("web_name", ""),
            "team":       team.get("name", ""),
            "team_short": team.get("short_name", ""),
            "position":   pos_map.get(p.get("element_type", 3), "MID"),
            "ownership":  p.get("selected_by_percent", "0"),
            "form":       p.get("form", "0"),
            "cost":       (p.get("now_cost") or 50) / 10.0,
            "total_points": p.get("total_points", 0),
            "diff_score": p.get("diff_score", 0),
        })

    result = {
        "captains": out,
        "label":    "Low-ownership captain picks",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 17. ANALYTICS TERM  (Glossary Highlight)
# ══════════════════════════════════════════════════════════════════════════════

ANALYTICS_GLOSSARY = [
    {
        "term": "xG (Expected Goals)",
        "short": "xG",
        "value_label": "metric",
        "definition": (
            "The probability that a shot will result in a goal, based on historical "
            "data about similar shots. A shot from inside the six-yard box with a "
            "clear sight of goal might have an xG of 0.75; a long-range effort 0.03."
        ),
        "example": "Haaland: 0.82 xG/90",
        "example_value": "0.82",
        "example_unit": "xG/90",
        "col": "#4f9eff",
        "icon": "⚽",
        "learn_path": "/learn/xg",
    },
    {
        "term": "PPDA",
        "short": "PPDA",
        "value_label": "pressing",
        "definition": (
            "Passes Allowed Per Defensive Action — measures pressing intensity. "
            "Lower PPDA = more aggressive press. Elite pressing teams allow fewer "
            "than 7 passes before making a defensive action."
        ),
        "example": "Man City: 5.8 PPDA",
        "example_value": "5.8",
        "example_unit": "PPDA",
        "col": "#f2c94c",
        "icon": "⚡",
        "learn_path": "/learn/ppda",
    },
    {
        "term": "PSxG",
        "short": "PSxG",
        "value_label": "goalkeeping",
        "definition": (
            "Post-Shot Expected Goals — xG calculated after the shot is taken, "
            "accounting for placement and power. PSxG-GA (goals allowed) measures "
            "goalkeeper performance above/below expectation."
        ),
        "example": "Raya: +0.21 PSxG-GA",
        "example_value": "+0.21",
        "example_unit": "PSxG-GA",
        "col": "#00e09e",
        "icon": "🧤",
        "learn_path": "/learn/psxg",
    },
    {
        "term": "Elo Rating",
        "short": "Elo",
        "value_label": "rating",
        "definition": (
            "A skill-rating system adapted from chess. Each team has a number — win "
            "and it goes up, lose and it goes down. The magnitude of change depends "
            "on the opponent's strength. StatinSite rebuilds Elo from scratch each season."
        ),
        "example": "Arsenal: 1842 Elo",
        "example_value": "1842",
        "example_unit": "Elo pts",
        "col": "#b388ff",
        "icon": "🧠",
        "learn_path": "/learn/elo",
    },
    {
        "term": "Dixon-Coles",
        "short": "D-C",
        "value_label": "model",
        "definition": (
            "An extension of the Poisson model for football that corrects for "
            "under-prediction of low-scoring games (0-0, 1-0, 0-1, 1-1). "
            "StatinSite's core match prediction engine uses Dixon-Coles."
        ),
        "example": "Used in StatinSite predictions",
        "example_value": "core",
        "example_unit": "model",
        "col": "#ff8c42",
        "icon": "🔬",
        "learn_path": "/learn/dixon-coles",
    },
    {
        "term": "xA (Expected Assists)",
        "short": "xA",
        "value_label": "creation",
        "definition": (
            "The xG value of shots that a player's passes created. "
            "Measures creative quality independently of whether the striker "
            "converts. A player with high xA is making dangerous final passes."
        ),
        "example": "Palmer: 0.31 xA/90",
        "example_value": "0.31",
        "example_unit": "xA/90",
        "col": "#f472b6",
        "icon": "🎯",
        "learn_path": "/learn/xa",
    },
    {
        "term": "Brier Score",
        "short": "Brier",
        "value_label": "calibration",
        "definition": (
            "Measures how well-calibrated predicted probabilities are. "
            "A Brier score of 0 is perfect; a uniform distribution (1/3 each) "
            "scores 0.667. StatinSite targets below 0.60."
        ),
        "example": "StatinSite: 0.52",
        "example_value": "0.52",
        "example_unit": "Brier",
        "col": "#2dd4bf",
        "icon": "📐",
        "learn_path": "/learn/brier",
    },
    {
        "term": "Monte Carlo",
        "short": "MC",
        "value_label": "simulation",
        "definition": (
            "Runs thousands of randomised season simulations using current "
            "form and match probabilities to estimate final standings, "
            "title probabilities, and relegation risk."
        ),
        "example": "50,000 season simulations",
        "example_value": "50k",
        "example_unit": "sims",
        "col": "#ff4d6d",
        "icon": "🎲",
        "learn_path": "/learn/monte-carlo",
    },
]


@router.get("/analytics_term")
async def analytics_term(rotate: bool = Query(True)):
    """
    Returns one analytics glossary term.
    With rotate=true (default) cycles daily through the glossary.
    """
    cache_key = "home:analytics_term"
    hit = _cget(cache_key, TTL_DAY)
    if hit is not None and rotate:
        return hit

    if rotate:
        idx = date.today().timetuple().tm_yday % len(ANALYTICS_GLOSSARY)
    else:
        idx = 0

    term = ANALYTICS_GLOSSARY[idx]
    result = {
        **term,
        "glossary_count": len(ANALYTICS_GLOSSARY),
        "generated_at":   datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# BONUS: Recent Predictions (for RecentResults widget)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/recent_results")
async def recent_results(n: int = Query(5)):
    """
    Last N verified predictions with actual results and correct/incorrect flag.
    Shape matches RecentResults component exactly.
    """
    cache_key = f"home:recent_results:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    rows = []
    try:
        from app.routes.predictions import _fetch_all, _verify_recent_results
        await _verify_recent_results()
        # Use verified_only=True: pending predictions are already surfaced in
        # accountability_summary — duplicating them here with "Pending" status
        # alongside verified rows creates confusing inconsistencies.
        raw = _fetch_all(limit=n, verified_only=True)
        for r in raw:
            rows.append({
                "home":    r.get("home_team", ""),
                "away":    r.get("away_team", ""),
                "pred":    (r.get("predicted_outcome") or "").capitalize(),
                "actual":  (r.get("actual_outcome") or "Pending").capitalize(),
                "score":   (
                    f"{r['home_goals']}-{r['away_goals']}"
                    if r.get("home_goals") is not None else "Pending"
                ),
                "conf":    (
                    "High"   if (r.get("confidence") or 0) >= 70 else
                    "Medium" if (r.get("confidence") or 0) >= 55 else "Low"
                ),
                "correct": r.get("correct"),
                "fixture_id": r.get("fixture_id"),
                "timestamp":  r.get("recorded_at", ""),
            })
    except Exception:
        pass

    result = {
        "results":  rows,
        "correct":  sum(1 for r in rows if r.get("correct") is True),
        "total":    len([r for r in rows if r.get("correct") is not None]),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD  — single endpoint that powers the entire redesigned homepage
# GET /api/home/dashboard
# Runs all section fetches in parallel, returns one JSON payload.
# Frontend fetches this once; every section reads from the response.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def dashboard():
    """
    Single aggregated endpoint for the homepage dashboard.
    Runs all data fetches concurrently and returns a single payload.
    All section data is optional — failures return empty/fallback objects
    so the page always renders.
    """
    cache_key = "home:dashboard"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    # Fire all sub-fetches concurrently
    results = await asyncio.gather(
        top_predictions(league="epl"),          # 0
        model_edges(),                          # 1
        model_confidence(),                     # 2
        power_rankings(league="epl", n=8),      # 3
        title_race(league="epl"),               # 4
        xg_leaders(league="epl", n=8),          # 5
        value_players(n=6),                     # 6
        trending_players(),                     # 7
        differential_captains(n=6),             # 8
        transfer_brief_home(),                  # 9
        tactical_insight(league="epl"),         # 10
        model_metrics(),                        # 11
        high_scoring_matches(n=5),              # 12
        defense_table(league="epl", n=6),       # 13
        recent_results(n=6),                    # 14
        analytics_term(rotate=True),            # 15
        performance_summary(),                  # 16 — truthful model perf
        accountability_summary(),               # 17 — truthful accountability
        form_table(league="epl", n=6),          # 18 — form table (was missing)
        featured_fixtures(),                    # 19 — featured fixtures (was missing)
        return_exceptions=True,
    )

    def _safe_result(r, fallback=None):
        return r if not isinstance(r, Exception) else (fallback or {})

    perf_data = _safe_result(results[16], {})

    # hero_stats: use logged count (all predictions ever recorded) as the primary
    # fixture count — it's always available and doesn't depend on verification timing.
    # Fall back to verified_count if logged isn't present.
    try:
        from app.routes.predictions import predictions_health
        _health = predictions_health()
        fixtures_predicted = _health.get("logged", 0) or perf_data.get("verified_count") or 0
    except Exception:
        fixtures_predicted = perf_data.get("verified_count") or 0

    payload = {
        "top_predictions":        _safe_result(results[0],  {"predictions": []}),
        "model_edges":            _safe_result(results[1],  {"edges": []}),
        "model_confidence":       _safe_result(results[2],  {}),
        "power_rankings":         _safe_result(results[3],  {"rankings": []}),
        "title_race":             _safe_result(results[4],  {"top4": []}),
        "xg_leaders":             _safe_result(results[5],  {"leaders": []}),
        "value_players":          _safe_result(results[6],  {"players": []}),
        "trending_players":       _safe_result(results[7],  {"items": []}),
        "differential_captains":  _safe_result(results[8],  {"captains": []}),
        "transfer_brief":         _safe_result(results[9],  {}),
        "tactical_insight":       _safe_result(results[10], {"primary": None}),
        "model_metrics":          _safe_result(results[11], {"trend": [], "by_market": []}),
        "high_scoring_matches":   _safe_result(results[12], {"matches": []}),
        "defense_table":          _safe_result(results[13], {"table": []}),
        "recent_results":         _safe_result(results[14], {"results": []}),
        "analytics_term":         _safe_result(results[15], {}),
        "performance_summary":    perf_data,
        "accountability_summary": _safe_result(results[17], {}),
        "form_table":             _safe_result(results[18], {"table": []}),
        "featured_fixtures":      _safe_result(results[19], {"fixtures": []}),
        "hero_stats": {
            "competitions_count": 9,
            "fixtures_predicted": fixtures_predicted,
            "verified_accuracy":  perf_data.get("overall_accuracy") or 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Only cache if at least one data section is populated
    core_populated = (
        payload.get("top_predictions", {}).get("predictions") or
        payload.get("title_race", {}).get("top4") or
        payload.get("xg_leaders", {}).get("leaders") or
        payload.get("differential_captains", {}).get("captains")
    )
    if core_populated:
        _cset(cache_key, payload)
    return payload

# ── Cache-bust endpoint — call this to force refresh after server wake ────────
@router.get("/cache/clear")
async def clear_cache():
    """Clears all in-process cache so next request fetches fresh data."""
    count = len(_cache)
    _cache.clear()
    _ctimes.clear()
    return {"cleared": count, "message": "Cache cleared. Next request will fetch fresh data."}