"""
backend/app/routes/international.py
════════════════════════════════════════════════════════════════════════
International football fixtures — fixtures, standings, and predictions
for national team competitions.

Endpoints
─────────
  GET /api/international/competitions          — list of supported competitions
  GET /api/international/fixtures              — upcoming + live + recent fixtures
                                                 ?date=YYYY-MM-DD  (default: today ±3 days)
                                                 ?competition=wcq_uefa (optional filter)
                                                 ?days_back=3 &days_ahead=7 (window)
  GET /api/international/fixtures/live         — currently live internationals only
  GET /api/international/standings/{comp}      — group standings for a competition
  GET /api/international/predictions/{comp}    — predictions for upcoming fixtures

Competition slugs supported
────────────────────────────
  wcq_uefa        — FIFA World Cup Qualification (UEFA)      id=32  (2026 cycle = season 2025)
  wcq_conmebol    — FIFA World Cup Qualification (CONMEBOL)  id=29
  wcq_concacaf    — FIFA World Cup Qualification (CONCACAF)  id=30
  wcq_caf         — FIFA World Cup Qualification (CAF)       id=31
  wcq_afc         — FIFA World Cup Qualification (AFC)       id=36
  wcq_ofc         — FIFA World Cup Qualification (OFC)       id=33
  euro            — UEFA European Championship               id=4   (season=2024 for last Euros)
  euro_q          — UEFA Euro Qualification                  id=960
  afcon           — Africa Cup of Nations                    id=6
  copa_america    — Copa América                             id=9
  nations_league  — UEFA Nations League                      id=5
  gold_cup        — CONCACAF Gold Cup                        id=16
  afc_asian_cup   — AFC Asian Cup                            id=7
  world_cup       — FIFA World Cup                           id=1   (season=2022 for last WC)

All use the standard API-Football v3 /fixtures endpoint.
Fixture shape matches the existing /api/matches/* endpoints so the
frontend can reuse the same fixture card components.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/international", tags=["international"])

# ── Config ────────────────────────────────────────────────────────────────────

API_BASE = "https://v3.football.api-sports.io"

def _api_key() -> str:
    return os.getenv("API_FOOTBALL_KEY", "")


# ── Competition registry ──────────────────────────────────────────────────────

# Each entry: slug → {id, name, confederation, type, season}
# season = None means "derive from current date" (same logic as club leagues)
COMPETITIONS: Dict[str, Dict[str, Any]] = {
    # ── World Cup Qualification ──────────────────────────────────────────────
    "wcq_uefa": {
        "id": 32, "name": "WC Qualification UEFA", "short": "WCQ UEFA",
        "confederation": "UEFA", "type": "qualification", "season": None,
        "flag": "🌍",
    },
    "wcq_conmebol": {
        "id": 29, "name": "WC Qualification CONMEBOL", "short": "WCQ CONMEBOL",
        "confederation": "CONMEBOL", "type": "qualification", "season": None,
        "flag": "🌎",
    },
    "wcq_concacaf": {
        "id": 30, "name": "WC Qualification CONCACAF", "short": "WCQ CONCACAF",
        "confederation": "CONCACAF", "type": "qualification", "season": None,
        "flag": "🌎",
    },
    "wcq_caf": {
        "id": 31, "name": "WC Qualification CAF", "short": "WCQ CAF",
        "confederation": "CAF", "type": "qualification", "season": None,
        "flag": "🌍",
    },
    "wcq_afc": {
        "id": 36, "name": "WC Qualification AFC", "short": "WCQ AFC",
        "confederation": "AFC", "type": "qualification", "season": None,
        "flag": "🌏",
    },
    "wcq_ofc": {
        "id": 33, "name": "WC Qualification OFC", "short": "WCQ OFC",
        "confederation": "OFC", "type": "qualification", "season": None,
        "flag": "🌏",
    },
    # ── Major tournaments ────────────────────────────────────────────────────
    "world_cup": {
        "id": 1, "name": "FIFA World Cup", "short": "World Cup",
        "confederation": "FIFA", "type": "tournament", "season": 2026,
        "flag": "🏆",
    },
    "euro": {
        "id": 4, "name": "UEFA European Championship", "short": "Euros",
        "confederation": "UEFA", "type": "tournament", "season": 2024,
        "flag": "🇪🇺",
    },
    "euro_q": {
        "id": 960, "name": "UEFA Euro Qualification", "short": "Euro Q",
        "confederation": "UEFA", "type": "qualification", "season": None,
        "flag": "🇪🇺",
    },
    "afcon": {
        "id": 6, "name": "Africa Cup of Nations", "short": "AFCON",
        "confederation": "CAF", "type": "tournament", "season": 2025,
        "flag": "🌍",
    },
    "copa_america": {
        "id": 9, "name": "Copa América", "short": "Copa América",
        "confederation": "CONMEBOL", "type": "tournament", "season": 2024,
        "flag": "🌎",
    },
    "nations_league": {
        "id": 5, "name": "UEFA Nations League", "short": "Nations League",
        "confederation": "UEFA", "type": "nations_league", "season": None,
        "flag": "🇪🇺",
    },
    "gold_cup": {
        "id": 16, "name": "CONCACAF Gold Cup", "short": "Gold Cup",
        "confederation": "CONCACAF", "type": "tournament", "season": 2025,
        "flag": "🌎",
    },
    "afc_asian_cup": {
        "id": 7, "name": "AFC Asian Cup", "short": "Asian Cup",
        "confederation": "AFC", "type": "tournament", "season": 2023,
        "flag": "🌏",
    },
    # ── Friendly ─────────────────────────────────────────────────────────────
    "international_friendly": {
        "id": 10, "name": "International Friendly", "short": "Friendly",
        "confederation": "FIFA", "type": "friendly", "season": None,
        "flag": "🤝",
    },
}

# All competition IDs as a flat set — used for live match filtering
ALL_INTL_IDS = {v["id"] for v in COMPETITIONS.values()}

# Slug reverse-lookup by API league id
ID_TO_SLUG = {v["id"]: k for k, v in COMPETITIONS.items()}
ID_TO_NAME = {v["id"]: v["name"] for v in COMPETITIONS.values()}


# ── Season helper ─────────────────────────────────────────────────────────────

def _season_for(comp: Dict[str, Any], ref_date: Optional[date] = None) -> int:
    """Return the correct season integer for a competition."""
    if comp.get("season") is not None:
        return comp["season"]
    d = ref_date or date.today()
    # International competitions generally follow calendar year, not club season
    return d.year


# ── TTL cache ─────────────────────────────────────────────────────────────────

_cache: Dict[str, Any] = {}
_times: Dict[str, float] = {}
_TTL_FIXTURES = 120    # 2 min — live matches need freshness
_TTL_STANDINGS = 1800  # 30 min
_TTL_LONG = 3600       # 1 h for predictions


def _get(key: str, ttl: int) -> Optional[Any]:
    if key in _cache and time.time() - _times[key] < ttl:
        return _cache[key]
    _cache.pop(key, None)
    _times.pop(key, None)
    return None


def _set(key: str, value: Any) -> None:
    _cache[key] = value
    _times[key] = time.time()


# ── HTTP helper ───────────────────────────────────────────────────────────────

async def _api(endpoint: str, params: dict) -> list:
    key = _api_key()
    if not key:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{API_BASE}/{endpoint.lstrip('/')}",
                headers={"x-apisports-key": key},
                params=params,
            )
            if r.status_code == 200:
                return r.json().get("response", [])
            logger.warning("API-Football %s %s → %s", endpoint, params, r.status_code)
    except Exception as exc:
        logger.warning("API-Football request failed: %s", exc)
    return []


# ── Fixture normaliser ────────────────────────────────────────────────────────

def _norm_fixture(f: dict) -> dict:
    """Normalise an API-Football fixture response to the standard StatinSite shape."""
    fix   = f.get("fixture", {}) or {}
    teams = f.get("teams",   {}) or {}
    goals = f.get("goals",   {}) or {}
    score = f.get("score",   {}) or {}
    lg    = f.get("league",  {}) or {}

    lid   = lg.get("id", 0)
    slug  = ID_TO_SLUG.get(lid, "international")
    comp  = COMPETITIONS.get(slug, {})

    return {
        "fixture_id":    fix.get("id"),
        "competition":   slug,
        "competition_id": lid,
        "competition_name": lg.get("name") or ID_TO_NAME.get(lid, "International"),
        "competition_flag": comp.get("flag", "🌐"),
        "confederation": comp.get("confederation", ""),
        "round":         lg.get("round", ""),
        "season":        lg.get("season"),
        # Teams
        "home_team":     (teams.get("home") or {}).get("name", ""),
        "home_team_id":  (teams.get("home") or {}).get("id"),
        "home_logo":     (teams.get("home") or {}).get("logo", ""),
        "away_team":     (teams.get("away") or {}).get("name", ""),
        "away_team_id":  (teams.get("away") or {}).get("id"),
        "away_logo":     (teams.get("away") or {}).get("logo", ""),
        # Score
        "home_score":    goals.get("home"),
        "away_score":    goals.get("away"),
        "home_ht":       (score.get("halftime") or {}).get("home"),
        "away_ht":       (score.get("halftime") or {}).get("away"),
        # Status
        "status":        (fix.get("status") or {}).get("short", "NS"),
        "status_long":   (fix.get("status") or {}).get("long", ""),
        "minute":        (fix.get("status") or {}).get("elapsed"),
        "kickoff":       fix.get("date", ""),
        "kickoff_ts":    fix.get("timestamp"),
        "venue":         (fix.get("venue") or {}).get("name", ""),
        "city":          (fix.get("venue") or {}).get("city", ""),
        # Meta
        "is_international": True,
    }


def _is_live(status: str) -> bool:
    return status in {"1H", "2H", "HT", "ET", "BT", "P"}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/competitions")
def list_competitions():
    """Return all supported international competitions with metadata."""
    return {
        "competitions": [
            {
                "slug": slug,
                "id": comp["id"],
                "name": comp["name"],
                "short": comp["short"],
                "confederation": comp["confederation"],
                "type": comp["type"],
                "flag": comp["flag"],
            }
            for slug, comp in COMPETITIONS.items()
        ],
        "count": len(COMPETITIONS),
    }


@router.get("/fixtures")
async def international_fixtures(
    competition: Optional[str] = Query(None, description="Competition slug, e.g. wcq_uefa"),
    date_str:    Optional[str] = Query(None, alias="date", description="YYYY-MM-DD (default: today)"),
    days_back:   int           = Query(3,  ge=0, le=14),
    days_ahead:  int           = Query(7,  ge=0, le=30),
):
    """
    Fetch upcoming, live, and recent international fixtures.

    - Without ?competition: fetches all tracked competitions in the window.
    - With ?competition=slug: fetches only that competition.
    - ?date sets the centre of the window (default today).
    - ?days_back / ?days_ahead control the window around that date.
    """
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    ref = date.today()
    if date_str:
        try:
            ref = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(400, f"Invalid date format: {date_str!r}. Use YYYY-MM-DD.")

    from_date = (ref - timedelta(days=days_back)).isoformat()
    to_date   = (ref + timedelta(days=days_ahead)).isoformat()

    # Resolve which competitions to fetch
    if competition:
        if competition not in COMPETITIONS:
            raise HTTPException(404, f"Unknown competition: {competition!r}. "
                                     f"Valid slugs: {', '.join(COMPETITIONS)}")
        target_comps = {competition: COMPETITIONS[competition]}
    else:
        target_comps = COMPETITIONS

    cache_key = f"intl_fixtures:{competition or 'all'}:{from_date}:{to_date}"
    if (hit := _get(cache_key, _TTL_FIXTURES)) is not None:
        return hit

    async def fetch_comp(slug: str, comp: dict) -> list:
        season = _season_for(comp, ref)
        try:
            raw = await _api("fixtures", {
                "league":   comp["id"],
                "season":   season,
                "from":     from_date,
                "to":       to_date,
                "timezone": "UTC",
            })
            return raw
        except Exception as exc:
            logger.warning("Failed to fetch %s: %s", slug, exc)
            return []

    # Fetch all competitions in parallel
    results = await asyncio.gather(*[
        fetch_comp(slug, comp)
        for slug, comp in target_comps.items()
    ])

    seen: set = set()
    fixtures: list = []
    for batch in results:
        for f in batch:
            fid = (f.get("fixture") or {}).get("id")
            if not fid or fid in seen:
                continue
            seen.add(fid)
            fixtures.append(_norm_fixture(f))

    # Sort: live first, then by kickoff
    fixtures.sort(key=lambda m: (
        0 if _is_live(m.get("status", "")) else 1,
        m.get("kickoff") or "9999"
    ))

    # Group by competition for convenient frontend consumption
    by_comp: Dict[str, list] = {}
    for fx in fixtures:
        slug = fx["competition"]
        by_comp.setdefault(slug, []).append(fx)

    result = {
        "fixtures":     fixtures,
        "by_competition": by_comp,
        "count":        len(fixtures),
        "window": {
            "from":  from_date,
            "to":    to_date,
            "ref":   ref.isoformat(),
        },
        "competitions_fetched": list(target_comps.keys()),
    }

    _set(cache_key, result)
    return result


@router.get("/fixtures/live")
async def international_live():
    """Currently live international fixtures across all tracked competitions."""
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = "intl_live"
    if (hit := _get(cache_key, 60)) is not None:  # 60s TTL for live
        return hit

    try:
        raw = await _api("fixtures", {"live": "all"})
    except Exception as exc:
        raise HTTPException(502, f"Upstream error: {exc}")

    fixtures = []
    seen: set = set()
    for f in raw:
        lg  = f.get("league", {}) or {}
        lid = lg.get("id")
        if lid not in ALL_INTL_IDS:
            continue
        fid = (f.get("fixture") or {}).get("id")
        if not fid or fid in seen:
            continue
        seen.add(fid)
        fixtures.append(_norm_fixture(f))

    fixtures.sort(key=lambda m: m.get("kickoff") or "")

    result = {
        "fixtures": fixtures,
        "count": len(fixtures),
        "live_count": len(fixtures),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    _set(cache_key, result)
    return result


@router.get("/standings/{competition}")
async def international_standings(competition: str):
    """
    Group/table standings for an international competition.
    Returns raw standings from API-Football, normalised to a flat list per group.
    """
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    if competition not in COMPETITIONS:
        raise HTTPException(404, f"Unknown competition: {competition!r}")

    comp   = COMPETITIONS[competition]
    season = _season_for(comp)

    cache_key = f"intl_standings:{competition}:{season}"
    if (hit := _get(cache_key, _TTL_STANDINGS)) is not None:
        return hit

    raw = await _api("standings", {"league": comp["id"], "season": season})

    if not raw:
        return {
            "competition": competition,
            "competition_name": comp["name"],
            "season": season,
            "groups": [],
            "standings": [],
        }

    # API returns: [{league: {standings: [[row, ...], ...]}}]
    league_block = (raw[0].get("league") or {})
    raw_standings = league_block.get("standings") or []

    # Each inner list is one group / table
    groups = []
    flat   = []
    for group_rows in raw_standings:
        group_name = (group_rows[0].get("group") if group_rows else "") or "Group"
        normalised = []
        for row in group_rows:
            team  = row.get("team") or {}
            all_s = row.get("all") or {}
            home  = row.get("home") or {}
            away  = row.get("away") or {}
            normalised.append({
                "rank":        row.get("rank"),
                "team_id":     team.get("id"),
                "team":        team.get("name", ""),
                "team_logo":   team.get("logo", ""),
                "group":       group_name,
                "played":      all_s.get("played", 0),
                "won":         all_s.get("win", 0),
                "drawn":       all_s.get("draw", 0),
                "lost":        all_s.get("lose", 0),
                "goals_for":   (all_s.get("goals") or {}).get("for", 0),
                "goals_against": (all_s.get("goals") or {}).get("against", 0),
                "goal_diff":   row.get("goalsDiff", 0),
                "points":      row.get("points", 0),
                "form":        row.get("form", ""),
                "status":      row.get("status", ""),
                "description": row.get("description", ""),
                "home_played": home.get("played", 0),
                "away_played": away.get("played", 0),
            })
            flat.append(normalised[-1])
        groups.append({"name": group_name, "rows": normalised})

    result = {
        "competition":      competition,
        "competition_name": comp["name"],
        "competition_flag": comp["flag"],
        "confederation":    comp["confederation"],
        "season":           season,
        "groups":           groups,
        "standings":        flat,   # flat list for simple table rendering
        "group_count":      len(groups),
    }
    _set(cache_key, result)
    return result


@router.get("/predictions/{competition}")
async def international_predictions(
    competition: str,
    limit: int = Query(20, ge=1, le=50),
):
    """
    Upcoming fixtures for a competition with win-probability predictions.
    Uses the same Poisson model as club predictions but with international
    team stats. Returns fixtures enriched with {p_home, p_draw, p_away, xg_home, xg_away}.
    """
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    if competition not in COMPETITIONS:
        raise HTTPException(404, f"Unknown competition: {competition!r}")

    comp   = COMPETITIONS[competition]
    season = _season_for(comp)

    cache_key = f"intl_predictions:{competition}:{season}"
    if (hit := _get(cache_key, _TTL_LONG)) is not None:
        return hit

    today    = date.today()
    from_d   = today.isoformat()
    to_d     = (today + timedelta(days=21)).isoformat()  # 3-week window

    raw = await _api("fixtures", {
        "league":   comp["id"],
        "season":   season,
        "from":     from_d,
        "to":       to_d,
        "status":   "NS-TBD-PST",
        "timezone": "UTC",
    })

    if not raw:
        return {
            "competition": competition,
            "competition_name": comp["name"],
            "season": season,
            "predictions": [],
            "count": 0,
        }

    # Fetch team stats in parallel for all fixtures
    # International team stats use the same endpoint as club teams
    team_ids = set()
    for f in raw[:limit]:
        teams = f.get("teams", {}) or {}
        home_id = (teams.get("home") or {}).get("id")
        away_id = (teams.get("away") or {}).get("id")
        if home_id: team_ids.add(home_id)
        if away_id: team_ids.add(away_id)

    async def fetch_team_stats(tid: int) -> dict:
        """Fetch season stats for a national team."""
        cache_k = f"intl_team_stats:{tid}:{comp['id']}:{season}"
        if (hit := _get(cache_k, _TTL_LONG)) is not None:
            return hit
        raw_s = await _api("teams/statistics", {
            "team":   tid,
            "league": comp["id"],
            "season": season,
        })
        result = raw_s[0] if raw_s else {}
        _set(cache_k, result)
        return result

    team_stats_list = await asyncio.gather(*[fetch_team_stats(tid) for tid in team_ids])
    stats_by_id = {}
    for i, tid in enumerate(team_ids):
        stats_by_id[tid] = team_stats_list[i]

    # Build predictions using Poisson model from football_engine
    try:
        from app.football_engine import build_xg_from_team_stats, LEAGUE_AVG_GOALS, FALLBACK_AVG
        from app.win_prob import _match_probs  # type: ignore[attr-defined]

        # International average goals (slightly lower than club football)
        intl_avg = {"home": 1.25, "away": 0.95}
    except ImportError:
        build_xg_from_team_stats = None

    def _norm_intl_stats(raw_s: dict) -> dict:
        """Normalise team/statistics response for the xG builder."""
        if not raw_s:
            return {}
        fx    = raw_s.get("fixtures", {}) or {}
        goals = raw_s.get("goals", {}) or {}
        ph    = (fx.get("played") or {}).get("home", 0)
        pa    = (fx.get("played") or {}).get("away", 0)
        return {
            "played_home":    ph,
            "played_away":    pa,
            "scored_home":    ((goals.get("for")     or {}).get("total") or {}).get("home", 0),
            "scored_away":    ((goals.get("for")     or {}).get("total") or {}).get("away", 0),
            "conceded_home":  ((goals.get("against") or {}).get("total") or {}).get("home", 0),
            "conceded_away":  ((goals.get("against") or {}).get("total") or {}).get("away", 0),
            "form":           raw_s.get("form", ""),
        }

    predictions = []
    for f in raw[:limit]:
        norm = _norm_fixture(f)
        home_id = norm.get("home_team_id")
        away_id = norm.get("away_team_id")

        xg_home, xg_away = intl_avg["home"], intl_avg["away"]
        p_home = p_draw = p_away = None

        if build_xg_from_team_stats and home_id and away_id:
            try:
                hs = _norm_intl_stats(stats_by_id.get(home_id, {}))
                as_ = _norm_intl_stats(stats_by_id.get(away_id, {}))
                xg_home, xg_away = build_xg_from_team_stats(
                    home_team_id=home_id,
                    away_team_id=away_id,
                    home_stats=hs,
                    away_stats=as_,
                    league_avg=intl_avg,
                    elo=None,
                    home_team_name=norm.get("home_team", ""),
                    away_team_name=norm.get("away_team", ""),
                    home_form=hs.get("form", ""),
                    away_form=as_.get("form", ""),
                )
                probs = _match_probs(xg_home, xg_away)
                p_home = probs["p_home_win"]
                p_draw = probs["p_draw"]
                p_away = probs["p_away_win"]
            except Exception as exc:
                logger.debug("Prediction error for fixture %s: %s", norm.get("fixture_id"), exc)

        # Fallback simple Poisson if engine unavailable or stats missing
        if p_home is None:
            import math
            def _pp(lam, k): return (lam**k * math.exp(-lam)) / math.factorial(k)
            pw = pd = pa2 = 0.0
            for h in range(9):
                for a in range(9):
                    p = _pp(xg_home, h) * _pp(xg_away, a)
                    if h > a: pw += p
                    elif h == a: pd += p
                    else: pa2 += p
            tot = pw + pd + pa2 or 1
            p_home = round(pw / tot * 100, 1)
            p_draw = round(pd / tot * 100, 1)
            p_away = round(pa2 / tot * 100, 1)

        # Most likely score
        best_score, best_prob = "1-0", 0.0
        import math
        def _pp2(lam, k): return (lam**k * math.exp(-lam)) / math.factorial(k)
        for h in range(6):
            for a in range(6):
                p = _pp2(xg_home, h) * _pp2(xg_away, a)
                if p > best_prob:
                    best_prob = p
                    best_score = f"{h}-{a}"

        # Confidence: how far the winner probability is from 33%
        winner_prob = max(p_home, p_draw, p_away)
        confidence  = min(94, max(30, int((winner_prob - 33) * 1.8 + 45)))

        predictions.append({
            **norm,
            "xg_home":    round(xg_home, 2),
            "xg_away":    round(xg_away, 2),
            "p_home_win": p_home,
            "p_draw":     p_draw,
            "p_away_win": p_away,
            "predicted_score": best_score,
            "confidence": confidence,
            "model":      "Dixon-Coles Poisson v2",
        })

    result = {
        "competition":      competition,
        "competition_name": comp["name"],
        "competition_flag": comp["flag"],
        "confederation":    comp["confederation"],
        "season":           season,
        "predictions":      predictions,
        "count":            len(predictions),
        "window":           {"from": from_d, "to": to_d},
    }
    _set(cache_key, result)
    return result


@router.get("/team/{team_id}")
async def international_team(
    team_id:     int,
    competition: Optional[str] = Query(None),
):
    """
    Results, fixtures, and form for a specific national team.
    ?competition filters to one competition; omit for all.
    """
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = f"intl_team:{team_id}:{competition or 'all'}"
    if (hit := _get(cache_key, _TTL_STANDINGS)) is not None:
        return hit

    today = date.today()

    if competition:
        if competition not in COMPETITIONS:
            raise HTTPException(404, f"Unknown competition: {competition!r}")
        comps_to_fetch = {competition: COMPETITIONS[competition]}
    else:
        comps_to_fetch = COMPETITIONS

    async def fetch_team_fixtures(slug: str, comp: dict) -> list:
        season = _season_for(comp, today)
        try:
            raw = await _api("fixtures", {
                "team":   team_id,
                "league": comp["id"],
                "season": season,
                "last":   10,
            })
            return raw
        except Exception:
            return []

    batches = await asyncio.gather(*[
        fetch_team_fixtures(slug, comp)
        for slug, comp in comps_to_fetch.items()
    ])

    seen: set = set()
    fixtures = []
    for batch in batches:
        for f in batch:
            fid = (f.get("fixture") or {}).get("id")
            if not fid or fid in seen:
                continue
            seen.add(fid)
            fixtures.append(_norm_fixture(f))

    fixtures.sort(key=lambda m: m.get("kickoff") or "")

    completed = [fx for fx in fixtures if fx["status"] in {"FT", "AET", "PEN"}]
    upcoming  = [fx for fx in fixtures if fx["status"] in {"NS", "TBD", "PST"}]

    # Compute simple form from last 5 completed
    form_str = ""
    for fx in completed[-5:]:
        hs = fx.get("home_score") or 0
        as_ = fx.get("away_score") or 0
        is_home = fx.get("home_team_id") == team_id
        if is_home:
            form_str += "W" if hs > as_ else ("D" if hs == as_ else "L")
        else:
            form_str += "W" if as_ > hs else ("D" if hs == as_ else "L")

    result = {
        "team_id":          team_id,
        "fixtures":         fixtures,
        "completed":        completed,
        "upcoming":         upcoming[-5:],
        "form":             form_str,
        "total":            len(fixtures),
        "competitions_searched": list(comps_to_fetch.keys()),
    }
    _set(cache_key, result)
    return result