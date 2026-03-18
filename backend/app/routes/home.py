"""
backend/app/routes/home.py  — v2 (backend-driven, no fake data)
══════════════════════════════════════════════════════════════════════════
Homepage data API — all endpoints under /api/home/

CHANGES FROM v1:
  • Expanded to 9 competitions (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, UEL, UECL, FA Cup)
  • Added hero_stats, competitions_supported, accountability_summary,
    performance_summary, feature_status to /dashboard
  • model_edges() renamed concept to "model divergence" (no real market data)
  • model_metrics() — removed fake by_market and fake trend fallbacks
  • tactical_insight() — honest labeling
  • fixtures_count computed from predictions DB, not hardcoded
"""

from __future__ import annotations

import asyncio
import math
import os
import time
from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/home", tags=["home"])

_API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
_API_BASE       = "https://v3.football.api-sports.io"
_CURRENT_SEASON = int(os.getenv("CURRENT_SEASON", "2025"))
_FPL_BASE       = "https://fantasy.premierleague.com/api"

# ── Full competition registry ────────────────────────────────────────────────
LEAGUE_IDS = {
    "epl": 39, "laliga": 140, "seriea": 135, "ligue1": 61, "bundesliga": 78,
    "ucl": 2, "uel": 3, "uecl": 848, "facup": 45,
}
LEAGUE_NAMES = {
    "epl": "Premier League", "laliga": "La Liga", "seriea": "Serie A",
    "ligue1": "Ligue 1", "bundesliga": "Bundesliga",
    "ucl": "Champions League", "uel": "Europa League",
    "uecl": "Conference League", "facup": "FA Cup",
}
LEAGUE_SLUGS = {
    "epl": "premier-league", "laliga": "la-liga", "seriea": "serie-a",
    "ligue1": "ligue-1", "bundesliga": "bundesliga",
    "ucl": "champions-league", "uel": "europa-league",
    "uecl": "conference-league", "facup": "fa-cup",
}
LEAGUE_COUNTRIES = {
    "epl": "England", "laliga": "Spain", "seriea": "Italy",
    "ligue1": "France", "bundesliga": "Germany",
    "ucl": "Europe", "uel": "Europe", "uecl": "Europe", "facup": "England",
}
LEAGUE_COLORS = {
    "epl": "#4f9eff", "laliga": "#f2c94c", "seriea": "#00e09e",
    "bundesliga": "#ff8c42", "ligue1": "#b388ff",
    "ucl": "#001489", "uel": "#f26522", "uecl": "#1db954", "facup": "#c8102e",
}

TOP5 = ["epl", "laliga", "seriea", "bundesliga", "ligue1"]
ALL_COMPS = list(LEAGUE_IDS.keys())

# ── Cache ────────────────────────────────────────────────────────────────────
_cache:  Dict[str, Any]   = {}
_ctimes: Dict[str, float] = {}

def _cget(k: str, ttl: float) -> Optional[Any]:
    return _cache[k] if k in _cache and time.monotonic() - _ctimes.get(k, 0) < ttl else None

def _cset(k: str, v: Any) -> None:
    _cache[k] = v; _ctimes[k] = time.monotonic()

TTL_SHORT  = 300
TTL_MEDIUM = 900
TTL_LONG   = 3600
TTL_DAY    = 86400


# ══════════════════════════════════════════════════════════════════════════════
# HTTP HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def _api(path: str, params: dict, ttl: float = TTL_MEDIUM) -> list:
    if not _API_KEY:
        return []
    cache_key = f"api:{path}:{sorted(params.items())}"
    hit = _cget(cache_key, ttl)
    if hit is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{_API_BASE}/{path.lstrip('/')}",
                headers={"x-apisports-key": _API_KEY},
                params=params,
            )
            if r.status_code == 200:
                data = r.json().get("response", [])
                _cset(cache_key, data)
                return data
    except Exception:
        pass
    return []


async def _fpl() -> dict:
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
            "rank": e.get("rank"), "team_id": t.get("id"),
            "team_name": t.get("name", ""), "logo": t.get("logo", ""),
            "played": a.get("played", 0), "won": a.get("win", 0),
            "drawn": a.get("draw", 0), "lost": a.get("lose", 0),
            "goals_for": g.get("for", 0), "goals_against": g.get("against", 0),
            "goal_diff": e.get("goalsDiff", 0), "points": e.get("points", 0),
            "form": e.get("form", ""),
        })
    return out


# ══════════════════════════════════════════════════════════════════════════════
# 1. TOP PREDICTIONS (unchanged logic)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/top_predictions")
async def top_predictions(league: str = Query("epl")):
    cache_key = f"home:top_predictions:{league}"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    COLORS = {"epl": "#4f9eff", "laliga": "#f2c94c", "seriea": "#00e09e",
              "bundesliga": "#ff8c42", "ligue1": "#b388ff",
              "ucl": "#001489", "uel": "#f26522", "uecl": "#1db954", "facup": "#c8102e"}
    col = COLORS.get(league, "#4f9eff")
    lid = LEAGUE_IDS.get(league, 39)
    today = date.today().isoformat()
    end   = (date.today() + timedelta(days=10)).isoformat()

    fixtures = await _api("/fixtures", {
        "league": lid, "season": _CURRENT_SEASON,
        "from": today, "to": end, "status": "NS"
    }, TTL_SHORT)

    preds_out = []
    for fx in fixtures[:6]:
        try:
            teams = fx.get("teams", {}); fix = fx.get("fixture", {})
            home_t = teams.get("home", {}); away_t = teams.get("away", {})

            home_stats = await _api("/teams/statistics", {
                "team": home_t.get("id"), "league": lid, "season": _CURRENT_SEASON
            }, TTL_LONG)
            away_stats = await _api("/teams/statistics", {
                "team": away_t.get("id"), "league": lid, "season": _CURRENT_SEASON
            }, TTL_LONG)

            def _xg_from(s_list):
                s = s_list[0] if s_list else {}
                fx2 = s.get("fixtures", {}); gl = s.get("goals", {})
                ph = _safe(fx2, "played", "home"); pa = _safe(fx2, "played", "away")
                sc_h = _safe(gl, "for", "total", "home")
                sc_a = _safe(gl, "for", "total", "away")
                cc_h = _safe(gl, "against", "total", "home")
                cc_a = _safe(gl, "against", "total", "away")
                p = max(ph + pa, 1)
                return (sc_h + sc_a) / p, (cc_h + cc_a) / p

            h_att, h_def = _xg_from(home_stats)
            a_att, a_def = _xg_from(away_stats)
            avg = 1.35
            xg_h = round(max(0.3, min(4.5, h_att * a_def / max(avg, 0.1))), 2)
            xg_a = round(max(0.2, min(4.0, a_att * h_def / max(avg, 0.1))), 2)

            def _p(lam, k):
                return (lam ** k) * math.exp(-lam) / math.factorial(k)

            hw = dw = aw_p = 0.0
            for h in range(8):
                for a in range(8):
                    prob = _p(xg_h, h) * _p(xg_a, a)
                    if h > a:   hw   += prob
                    elif h < a: aw_p += prob
                    else:       dw   += prob
            total = hw + dw + aw_p or 1
            hw = round(hw / total * 100); aw_p = round(aw_p / total * 100); dw = 100 - hw - aw_p

            best_p, mls = 0.0, "1-0"
            for h in range(6):
                for a in range(6):
                    p = _p(xg_h, h) * _p(xg_a, a)
                    if p > best_p:
                        best_p = p; mls = f"{h}-{a}"

            conf = min(95, int(50 + (max(hw, dw, aw_p) - 33.3) * 1.2))
            kickoff = fix.get("date", "")

            preds_out.append({
                "fixture_id": fix.get("id"),
                "home": home_t.get("name", ""), "away": away_t.get("name", ""),
                "home_logo": home_t.get("logo", ""), "away_logo": away_t.get("logo", ""),
                "homeProb": hw, "awayProb": aw_p, "draw": dw,
                "col": col, "conf": _conf_color(conf), "conf_pct": conf,
                "score": mls, "xg_home": xg_h, "xg_away": xg_a,
                "league": LEAGUE_NAMES.get(league, ""), "league_code": league,
                "kickoff": kickoff[:10] if kickoff else "",
                "time": kickoff[11:16] if len(kickoff) > 10 else "",
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
# 2. MODEL DIVERGENCE (was "model_edges" — honest: no real market data)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model_edges")
async def model_edges():
    """
    Fixtures where the model's probability diverges most from a naive
    baseline (33% per outcome). No real bookmaker data is used.
    """
    cache_key = "home:model_edges"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit

    top = await top_predictions(league="epl")
    preds = top.get("predictions", [])

    edges = []
    for p in preds:
        hw = p.get("homeProb", 33)
        aw = p.get("awayProb", 33)
        # Divergence from naive baseline (33.3% per outcome)
        max_prob = max(hw, aw)
        divergence = round(max_prob - 33.3, 1)
        if divergence >= 12:
            direction = "home" if hw >= aw else "away"
            edges.append({
                "fixture_id":  p.get("fixture_id"),
                "home":        p["home"],
                "away":        p["away"],
                "model_prob":  max_prob,
                "edge":        divergence,
                "direction":   direction,
                "label":       f"Strong {direction} signal: {p['home'] if direction=='home' else p['away']}",
                "col":         "#00e09e" if direction == "home" else "#b388ff",
                "source":      "model_divergence",
            })

    result = {"edges": edges[:5], "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3–9: EXISTING ENDPOINTS (trending_players, form_table, featured_fixtures,
#       model_confidence, title_race, transfer_brief, tactical_insight)
#       — kept with same signatures but tactical_insight updated label
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/trending_players")
async def trending_players():
    cache_key = "home:trending_players"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    bootstrap = await _fpl()
    players = bootstrap.get("elements", [])
    teams   = {t["id"]: t for t in bootstrap.get("teams", [])}
    COLORS  = ["#f2c94c","#00e09e","#4f9eff","#b388ff","#ff8c42","#2dd4bf","#f472b6","#ff4d6d"]
    items   = []

    by_form = sorted(
        [p for p in players if float(p.get("form", 0) or 0) > 4],
        key=lambda p: float(p.get("form", 0) or 0), reverse=True,
    )[:4]
    for i, p in enumerate(by_form):
        team = teams.get(p.get("team", 0), {})
        items.append({
            "label": p.get("web_name", ""), "value": p.get("form", "0"),
            "col": COLORS[i % len(COLORS)], "player_id": p.get("id"),
            "type": "form", "sub": f"Form rating | {team.get('short_name','')}",
        })

    by_pts = sorted(players, key=lambda p: p.get("total_points", 0), reverse=True)[:4]
    for i, p in enumerate(by_pts):
        team = teams.get(p.get("team", 0), {})
        items.append({
            "label": p.get("web_name", ""), "value": str(p.get("total_points", 0)),
            "col": COLORS[(i+4) % len(COLORS)], "player_id": p.get("id"),
            "type": "points", "sub": f"Season pts | {team.get('short_name','')}",
        })

    result = {"items": items, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/form_table")
async def form_table(league: str = Query("epl"), n: int = Query(6)):
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
        enriched.append({**t, "form5": form_str, "form_pts": _form_pts(form_str)})
    enriched.sort(key=lambda t: (-t["form_pts"], -t["points"]))
    result = {"table": enriched[:n], "league": LEAGUE_NAMES.get(league, league),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/featured_fixtures")
async def featured_fixtures():
    cache_key = "home:featured_fixtures"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit
    today = date.today().isoformat()
    end   = (date.today() + timedelta(days=7)).isoformat()
    tasks = [
        _api("/fixtures", {"league": LEAGUE_IDS[code], "season": _CURRENT_SEASON,
                           "from": today, "to": end, "status": "NS"}, TTL_SHORT)
        for code in TOP5
    ]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)
    fixtures = []
    for code, result in zip(TOP5, all_results):
        if isinstance(result, list):
            for fx in result[:5]:
                fix = fx.get("fixture", {}); teams = fx.get("teams", {})
                league = fx.get("league", {}); kickoff = fix.get("date", "")
                fixtures.append({
                    "fixture_id": fix.get("id"), "league_code": code,
                    "league": LEAGUE_NAMES.get(code, ""),
                    "home": teams.get("home", {}).get("name", ""),
                    "away": teams.get("away", {}).get("name", ""),
                    "home_logo": teams.get("home", {}).get("logo", ""),
                    "away_logo": teams.get("away", {}).get("logo", ""),
                    "kickoff": kickoff[:10] if kickoff else "",
                    "time": kickoff[11:16] if len(kickoff) > 10 else "",
                    "venue": (fix.get("venue") or {}).get("name", "") if isinstance(fix.get("venue"), dict) else "",
                })
    seen = set(); featured = []
    for fx in fixtures:
        if fx["league_code"] not in seen:
            seen.add(fx["league_code"]); featured.append(fx)
        if len(featured) >= 3: break
    result = {"fixtures": featured, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/model_confidence")
async def model_confidence():
    cache_key = "home:model_confidence"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    top = await top_predictions(league="epl")
    preds = top.get("predictions", [])
    confs = [p.get("conf_pct", 50) for p in preds]
    high = sum(1 for c in confs if c >= 70)
    medium = sum(1 for c in confs if 55 <= c < 70)
    low = sum(1 for c in confs if c < 55)
    avg = round(sum(confs) / len(confs), 1) if confs else 0
    result = {"high": high, "medium": medium, "low": low,
              "avg_confidence": avg, "total": len(confs),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/title_race")
async def title_race(league: str = Query("epl")):
    cache_key = f"home:title_race:{league}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)
    if not standings:
        return {"top4": [], "leader": "", "gap_1_2": 0, "league": LEAGUE_NAMES.get(league, "")}
    top4 = standings[:4]; leader = top4[0]
    race = []
    for t in top4:
        form_str = (t.get("form") or "")[-5:]
        race.append({
            **t, "gap_to_leader": leader["points"] - t["points"],
            "form_letters": list(form_str), "form_pts": _form_pts(form_str),
            "trend": "up" if form_str[-2:] == "WW" else "down" if form_str[-2:] == "LL" else "neutral",
        })
    result = {"top4": race, "leader": leader.get("team_name", ""),
              "gap_1_2": (top4[0]["points"] - top4[1]["points"]) if len(top4) > 1 else 0,
              "league": LEAGUE_NAMES.get(league, league),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/transfer_brief")
async def transfer_brief_home():
    cache_key = "home:transfer_brief"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    try:
        from app.routes.intelligence import build_transfer_brief, _all_rss
        rss = await _all_rss()
        transfers = [a for a in rss if a.get("type") == "transfer"]
        brief = build_transfer_brief(transfers, rss)
        result = brief if brief else {"title": "Transfer Brief", "summary": "No major transfer news today.", "key_transfers": []}
    except Exception:
        result = {"title": "Transfer Brief", "summary": "Transfer data unavailable.", "key_transfers": []}
    _cset(cache_key, result)
    return result


@router.get("/tactical_insight")
async def tactical_insight(league: str = Query("epl")):
    """
    Goals-per-game leaders from standings.
    Labeled honestly as 'Attacking output' not 'tactical insight'.
    """
    cache_key = f"home:tactical_insight:{league}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit
    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)
    ICONS  = ["⚡", "🎯", "🧠", "⚽", "🔥"]
    COLORS = ["#f2c94c", "#4f9eff", "#00e09e", "#b388ff", "#ff8c42"]
    insights = []
    for i, team in enumerate(standings[:5]):
        gf_pg = round(team["goals_for"] / max(team["played"], 1), 2)
        form_str = (team.get("form") or "")[-5:]
        insights.append({
            "stat": str(gf_pg), "label": "Goals/game",
            "player": team["team_name"],
            "context": (
                f"{team['team_name']} scoring {gf_pg} per game, "
                f"ranked {team['rank']} with {team['points']} pts. "
                f"Form: {form_str or 'N/A'}."
            ),
            "col": COLORS[i % len(COLORS)], "icon": ICONS[i % len(ICONS)],
            "team_id": team.get("team_id"),
            "source": "standings_derived",
        })
    best = max(insights, key=lambda x: float(x["stat"]), default=insights[0] if insights else {})
    result = {"primary": best, "all": insights[:4],
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 10. MODEL METRICS — COMPUTED, NO FAKE FALLBACKS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model_metrics")
async def model_metrics():
    """
    Model performance from the predictions accountability DB.
    Returns only computed values. No hardcoded fallbacks.
    If no verified predictions exist, returns null metrics.
    """
    cache_key = "home:model_metrics"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit

    overall = last30 = log_loss_v = brier = None
    assessed = 0
    trend = []
    confidence_breakdown = []
    outcome_accuracy = {}

    try:
        from app.routes.predictions import model_performance
        perf = await model_performance(league=None, window=200)
        overall    = perf.get("overall_accuracy")
        last30     = perf.get("last_30_accuracy")
        log_loss_v = perf.get("log_loss")
        brier      = perf.get("brier_score")
        assessed   = perf.get("assessed", 0)
        outcome_accuracy = perf.get("outcome_accuracy", {})

        raw_trend = perf.get("trend", [])
        trend = [{"gw": f"#{p['end_index']}", "acc": p["accuracy"]} for p in raw_trend[-10:]]

        # Confidence breakdown from the performance endpoint
        try:
            from app.routes.predictions import prediction_performance
            perf_detail = await prediction_performance(league=None, window=200)
            confidence_breakdown = perf_detail.get("confidence_breakdown", [])
        except Exception:
            pass

    except Exception:
        pass

    # Compute fixtures_count from predictions DB
    fixtures_count = 0
    try:
        from app.routes.predictions import predictions_health
        health = predictions_health()
        fixtures_count = health.get("logged", 0)
    except Exception:
        pass

    result = {
        "overall_accuracy":     overall,
        "log_loss":             log_loss_v,
        "brier_score":          brier,
        "last_30_accuracy":     last30,
        "assessed":             assessed,
        "fixtures_count":       fixtures_count if fixtures_count > 0 else None,
        "trend":                trend if trend else None,
        "confidence_breakdown": confidence_breakdown if confidence_breakdown else None,
        "outcome_accuracy":     outcome_accuracy if outcome_accuracy else None,
        "generated_at":         datetime.now(timezone.utc).isoformat(),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 11–16: EXISTING ENDPOINTS (power_rankings, xg_leaders, value_players,
#         high_scoring_matches, defense_table, differential_captains)
#         — unchanged from v1, omitted for brevity, import from original
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/power_rankings")
async def power_rankings(league: str = Query("epl"), n: int = Query(8)):
    cache_key = f"home:power_rankings:{league}:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)
    if not standings:
        return {"rankings": [], "generated_at": datetime.now(timezone.utc).isoformat()}
    max_pts = max(t["points"] for t in standings) or 1
    max_gd  = max(abs(t["goal_diff"]) for t in standings) or 1
    min_gd  = min(t["goal_diff"] for t in standings)
    enriched = []
    for t in standings:
        form_str = (t.get("form") or "")[-5:]
        form_pts = _form_pts(form_str)
        ppg = t["points"] / max(t["played"], 1)
        gd_norm = (t["goal_diff"] - min_gd) / max(max_gd - min_gd, 1)
        pts_norm = t["points"] / max_pts
        form_norm = form_pts / 15.0
        power_score = round(0.35*pts_norm + 0.25*form_norm + 0.20*gd_norm + 0.20*(ppg/3.0), 4)
        enriched.append({
            **t, "form_letters": list(form_str), "form_pts": form_pts,
            "ppg": round(ppg, 2), "power_score": power_score,
            "power_pct": round(power_score * 100, 1),
        })
    enriched.sort(key=lambda t: -t["power_score"])
    for i, t in enumerate(enriched):
        t["power_rank"] = i + 1; t["rank_delta"] = t["rank"] - (i + 1)
    result = {"rankings": enriched[:n], "league": LEAGUE_NAMES.get(league, league),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/xg_leaders")
async def xg_leaders(league: str = Query("epl"), n: int = Query(8)):
    cache_key = f"home:xg_leaders:{league}:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit
    lid = LEAGUE_IDS.get(league, 39)
    data = await _api("/players/topscorers", {"league": lid, "season": _CURRENT_SEASON}, TTL_LONG)
    leaders = []
    for entry in data[:n]:
        p = entry.get("player", {}); s = (entry.get("statistics") or [{}])[0]
        g = s.get("goals", {}); gms = s.get("games", {}); tm = s.get("team", {})
        appeared = max(gms.get("appearences") or gms.get("appearances") or 1, 1)
        goals = g.get("total") or 0; assists = g.get("assists") or 0
        leaders.append({
            "player_id": p.get("id"), "name": p.get("name", ""),
            "photo": p.get("photo", ""), "team": tm.get("name", ""),
            "team_logo": tm.get("logo", ""), "goals": goals, "assists": assists,
            "g_plus_a": goals + assists, "per90": round((goals+assists)/appeared, 2),
            "played": appeared,
        })
    leaders.sort(key=lambda p: -p["g_plus_a"])
    result = {"leaders": leaders, "league": LEAGUE_NAMES.get(league, league),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/value_players")
async def value_players(n: int = Query(6)):
    cache_key = f"home:value_players:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit
    bootstrap = await _fpl()
    players = bootstrap.get("elements", [])
    teams = {t["id"]: t for t in bootstrap.get("teams", [])}
    pos_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
    eligible = [p for p in players
                if (p.get("starts") or p.get("minutes", 0)//80 or 0) >= 5
                and p.get("now_cost", 0) <= 80 and p.get("total_points", 0) > 30]
    for p in eligible:
        cost_m = (p.get("now_cost") or 50) / 10.0
        p["value_score"] = round(p.get("total_points", 0) / max(cost_m, 0.1), 2)
    eligible.sort(key=lambda p: -p["value_score"])
    out = []
    for p in eligible[:n]:
        team = teams.get(p.get("team", 0), {})
        out.append({
            "player_id": p.get("id"), "name": p.get("web_name", ""),
            "team": team.get("name", ""), "team_short": team.get("short_name", ""),
            "position": pos_map.get(p.get("element_type", 4), "MID"),
            "cost": (p.get("now_cost") or 50) / 10.0,
            "total_points": p.get("total_points", 0),
            "form": p.get("form", "0"), "value_score": p.get("value_score", 0),
            "ownership": p.get("selected_by_percent", "0"),
        })
    result = {"players": out, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/high_scoring_matches")
async def high_scoring_matches(n: int = Query(5)):
    cache_key = f"home:high_scoring:{n}"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit
    tasks = [top_predictions(league=code) for code in TOP5]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_preds = []
    for r in results:
        if isinstance(r, dict):
            all_preds.extend(r.get("predictions", []))
    for p in all_preds:
        p["total_xg"] = round(p.get("xg_home", 0) + p.get("xg_away", 0), 2)
    all_preds.sort(key=lambda p: -p.get("total_xg", 0))
    result = {"matches": all_preds[:n], "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/defense_table")
async def defense_table(league: str = Query("epl"), n: int = Query(6)):
    cache_key = f"home:defense_table:{league}:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    lid = LEAGUE_IDS.get(league, 39)
    raw = await _api("/standings", {"league": lid, "season": _CURRENT_SEASON}, TTL_MEDIUM)
    standings = _parse_standings(raw)
    for t in standings:
        t["ga_pg"] = round(t["goals_against"] / max(t["played"], 1), 2)
    standings.sort(key=lambda t: (t["ga_pg"], t["goals_against"]))
    result = {"table": standings[:n], "league": LEAGUE_NAMES.get(league, league),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


@router.get("/differential_captains")
async def differential_captains(n: int = Query(5)):
    cache_key = f"home:differential_captains:{n}"
    hit = _cget(cache_key, TTL_LONG)
    if hit is not None:
        return hit
    bootstrap = await _fpl()
    players = bootstrap.get("elements", [])
    teams = {t["id"]: t for t in bootstrap.get("teams", [])}
    pos_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
    diffs = [p for p in players
             if float(p.get("selected_by_percent") or "0") < 15.0
             and float(p.get("form") or 0) >= 4.5
             and p.get("element_type", 4) in (3, 4)
             and (p.get("starts") or 0) >= 3]
    for p in diffs:
        ownership = float(p.get("selected_by_percent") or "0") / 100.0
        form = float(p.get("form") or 0)
        p["diff_score"] = round(form * (1 - ownership), 3)
    diffs.sort(key=lambda p: -p["diff_score"])
    out = []
    for p in diffs[:n]:
        team = teams.get(p.get("team", 0), {})
        out.append({
            "player_id": p.get("id"), "name": p.get("web_name", ""),
            "team": team.get("name", ""), "team_short": team.get("short_name", ""),
            "position": pos_map.get(p.get("element_type", 3), "MID"),
            "ownership": p.get("selected_by_percent", "0"),
            "form": p.get("form", "0"), "cost": (p.get("now_cost") or 50) / 10.0,
            "total_points": p.get("total_points", 0), "diff_score": p.get("diff_score", 0),
        })
    result = {"captains": out, "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 17. ANALYTICS TERM (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

ANALYTICS_GLOSSARY = [
    {"term": "xG (Expected Goals)", "short": "xG", "definition": "The probability that a shot will result in a goal, based on historical data about similar shots.", "col": "#4f9eff", "icon": "⚽"},
    {"term": "PPDA", "short": "PPDA", "definition": "Passes Allowed Per Defensive Action — measures pressing intensity. Lower = more aggressive press.", "col": "#f2c94c", "icon": "⚡"},
    {"term": "PSxG", "short": "PSxG", "definition": "Post-Shot Expected Goals — xG calculated after the shot is taken, accounting for placement and power.", "col": "#00e09e", "icon": "🧤"},
    {"term": "Elo Rating", "short": "Elo", "definition": "A skill-rating system adapted from chess. Win and it goes up, lose and it goes down.", "col": "#b388ff", "icon": "🧠"},
    {"term": "Dixon-Coles", "short": "D-C", "definition": "An extension of the Poisson model that corrects for under-prediction of low-scoring games.", "col": "#ff8c42", "icon": "🔬"},
    {"term": "Brier Score", "short": "Brier", "definition": "Measures how well-calibrated predicted probabilities are. 0 = perfect, 0.667 = uniform.", "col": "#2dd4bf", "icon": "📐"},
    {"term": "Monte Carlo", "short": "MC", "definition": "Runs thousands of randomised simulations to estimate final standings and title probabilities.", "col": "#ff4d6d", "icon": "🎲"},
]


@router.get("/analytics_term")
async def analytics_term(rotate: bool = Query(True)):
    cache_key = "home:analytics_term"
    hit = _cget(cache_key, TTL_DAY)
    if hit is not None and rotate:
        return hit
    idx = date.today().timetuple().tm_yday % len(ANALYTICS_GLOSSARY) if rotate else 0
    term = ANALYTICS_GLOSSARY[idx]
    result = {**term, "glossary_count": len(ANALYTICS_GLOSSARY),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 18. RECENT RESULTS (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/recent_results")
async def recent_results(n: int = Query(6)):
    cache_key = f"home:recent_results:{n}"
    hit = _cget(cache_key, TTL_MEDIUM)
    if hit is not None:
        return hit
    rows = []
    try:
        from app.routes.predictions import _fetch_all, _verify_recent_results
        await _verify_recent_results()
        raw = _fetch_all(limit=n, verified_only=False)
        for r in raw:
            rows.append({
                "home": r.get("home_team", ""), "away": r.get("away_team", ""),
                "pred": (r.get("predicted_outcome") or "").capitalize(),
                "actual": (r.get("actual_outcome") or "Pending").capitalize(),
                "score": f"{r['home_goals']}-{r['away_goals']}" if r.get("home_goals") is not None else "Pending",
                "conf": "High" if (r.get("confidence") or 0) >= 70 else "Medium" if (r.get("confidence") or 0) >= 55 else "Low",
                "correct": r.get("correct"), "fixture_id": r.get("fixture_id"),
                "timestamp": r.get("recorded_at", ""),
            })
    except Exception:
        pass
    result = {"results": rows,
              "correct": sum(1 for r in rows if r.get("correct") is True),
              "total": len([r for r in rows if r.get("correct") is not None]),
              "generated_at": datetime.now(timezone.utc).isoformat()}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# NEW: HERO STATS — computed from real data
# ══════════════════════════════════════════════════════════════════════════════

async def _compute_hero_stats() -> dict:
    """Hero stats computed from real backend sources."""
    competitions_count = len(LEAGUE_IDS)

    # Fixtures predicted count
    fixtures_predicted = 0
    try:
        from app.routes.predictions import predictions_health
        health = predictions_health()
        fixtures_predicted = health.get("logged", 0)
    except Exception:
        pass

    # Players tracked (FPL has ~700+ elements)
    players_tracked = 0
    try:
        bootstrap = await _fpl()
        players_tracked = len(bootstrap.get("elements", []))
    except Exception:
        pass

    # Match accuracy from model_metrics
    match_accuracy = None
    try:
        mm = await model_metrics()
        match_accuracy = mm.get("overall_accuracy")
    except Exception:
        pass

    return {
        "competitions_count": competitions_count,
        "fixtures_predicted": fixtures_predicted if fixtures_predicted > 0 else None,
        "players_tracked":    players_tracked if players_tracked > 0 else None,
        "match_accuracy":     match_accuracy,
    }


# ══════════════════════════════════════════════════════════════════════════════
# NEW: COMPETITIONS SUPPORTED
# ══════════════════════════════════════════════════════════════════════════════

def _competitions_supported() -> list:
    """Backend metadata for all supported competitions."""
    return [
        {
            "code":    code,
            "name":    LEAGUE_NAMES.get(code, code),
            "slug":    LEAGUE_SLUGS.get(code, code),
            "country": LEAGUE_COUNTRIES.get(code, ""),
            "color":   LEAGUE_COLORS.get(code, "#4f9eff"),
            "api_id":  LEAGUE_IDS[code],
        }
        for code in ALL_COMPS
    ]


# ══════════════════════════════════════════════════════════════════════════════
# NEW: ACCOUNTABILITY SUMMARY — computed from predictions DB
# ══════════════════════════════════════════════════════════════════════════════

async def _compute_accountability_summary() -> dict:
    """Computed accountability stats — no fakes."""
    try:
        from app.routes.predictions import predictions_health, prediction_performance
        health = predictions_health()
        logged   = health.get("logged", 0)
        verified = health.get("verified", 0)
        pending  = health.get("pending", 0)

        perf = await prediction_performance(league=None, window=100)
        accuracy = perf.get("accuracy")
        assessed = perf.get("assessed", 0)
        confidence_breakdown = perf.get("confidence_breakdown", [])

        # Extract high/medium/low accuracy
        high_acc = med_acc = low_acc = None
        for b in confidence_breakdown:
            if "High" in b.get("bracket", ""):
                high_acc = b.get("accuracy")
            elif "Medium" in b.get("bracket", ""):
                med_acc = b.get("accuracy")
            elif "Low" in b.get("bracket", ""):
                low_acc = b.get("accuracy")

        return {
            "logged":                    logged,
            "verified":                  verified,
            "pending":                   pending,
            "hit_rate":                  accuracy,
            "assessed":                  assessed,
            "high_confidence_accuracy":  high_acc,
            "medium_confidence_accuracy": med_acc,
            "low_confidence_accuracy":   low_acc,
        }
    except Exception:
        return {
            "logged": 0, "verified": 0, "pending": 0,
            "hit_rate": None, "assessed": 0,
        }


# ══════════════════════════════════════════════════════════════════════════════
# NEW: FEATURE STATUS — backend readiness metadata
# ══════════════════════════════════════════════════════════════════════════════

def _feature_status() -> list:
    """Metadata for each homepage feature card."""
    return [
        {"key": "predictions",    "title": "Match Predictions",    "route": "/predictions/premier-league", "status": "live",      "backend_ready": True},
        {"key": "live",           "title": "Live Matches",         "route": "/live",                       "status": "live",      "backend_ready": True},
        {"key": "best-xi",        "title": "Best XI Builder",      "route": "/best-team",                  "status": "live",      "backend_ready": True},
        {"key": "squad-builder",  "title": "Squad Builder",        "route": "/squad-builder",              "status": "live",      "backend_ready": True},
        {"key": "player-insight", "title": "Player Insight",       "route": "/player",                     "status": "live",      "backend_ready": True},
        {"key": "news",           "title": "News Intelligence",    "route": "/news",                       "status": "live",      "backend_ready": True},
        {"key": "gw-insights",    "title": "GW Insights",          "route": "/gameweek-insights",          "status": "coming_soon","backend_ready": False},
        {"key": "fpl-table",      "title": "FPL Table",            "route": "/fpl-table",                  "status": "coming_soon","backend_ready": False},
        {"key": "sports-arcade",  "title": "Sports Arcade",        "route": "/games",                      "status": "beta",      "backend_ready": False},
        {"key": "ground-zero",    "title": "Ground Zero",          "route": "/learn",                      "status": "live",      "backend_ready": True},
    ]


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD  — single aggregated endpoint
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def dashboard():
    cache_key = "home:dashboard"
    hit = _cget(cache_key, TTL_SHORT)
    if hit is not None:
        return hit

    results = await asyncio.gather(
        top_predictions(league="epl"),        # 0
        model_edges(),                         # 1
        model_confidence(),                    # 2
        power_rankings(league="epl", n=8),     # 3
        title_race(league="epl"),              # 4
        xg_leaders(league="epl", n=8),         # 5
        value_players(n=6),                    # 6
        trending_players(),                    # 7
        differential_captains(n=6),            # 8
        transfer_brief_home(),                 # 9
        tactical_insight(league="epl"),        # 10
        model_metrics(),                       # 11
        high_scoring_matches(n=5),             # 12
        defense_table(league="epl", n=6),      # 13
        recent_results(n=8),                   # 14
        analytics_term(rotate=True),           # 15
        _compute_hero_stats(),                 # 16
        _compute_accountability_summary(),     # 17
        return_exceptions=True,
    )

    def _s(r, fallback=None):
        return r if not isinstance(r, Exception) else (fallback or {})

    payload = {
        # ── Existing blocks ──
        "top_predictions":       _s(results[0],  {"predictions": []}),
        "model_edges":           _s(results[1],  {"edges": []}),
        "model_confidence":      _s(results[2],  {}),
        "power_rankings":        _s(results[3],  {"rankings": []}),
        "title_race":            _s(results[4],  {"top4": []}),
        "xg_leaders":            _s(results[5],  {"leaders": []}),
        "value_players":         _s(results[6],  {"players": []}),
        "trending_players":      _s(results[7],  {"items": []}),
        "differential_captains": _s(results[8],  {"captains": []}),
        "transfer_brief":        _s(results[9],  {}),
        "tactical_insight":      _s(results[10], {"primary": None}),
        "model_metrics":         _s(results[11], {}),
        "high_scoring_matches":  _s(results[12], {"matches": []}),
        "defense_table":         _s(results[13], {"table": []}),
        "recent_results":        _s(results[14], {"results": []}),
        "analytics_term":        _s(results[15], {}),
        # ── New backend-driven blocks ──
        "hero_stats":            _s(results[16], {}),
        "accountability_summary": _s(results[17], {}),
        "competitions_supported": _competitions_supported(),
        "feature_status":         _feature_status(),
        "generated_at":           datetime.now(timezone.utc).isoformat(),
    }

    _cset(cache_key, payload)
    return payload