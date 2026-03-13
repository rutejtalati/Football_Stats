"""
GET /api/win-probability/{fixture_id}
Poisson-based win probability using season stats + optional live adjustment.
"""

import asyncio, os, time, math
from typing import Dict, Any
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"

_cache: Dict[str, Any]   = {}
_times: Dict[str, float] = {}
_TTL = 300


def _get(k): return _cache[k] if k in _cache and time.time()-_times[k]<_TTL else None
def _set(k, v): _cache[k]=v; _times[k]=time.time()


async def _api(ep: str, params: dict) -> list:
    try:
        async with httpx.AsyncClient(timeout=14) as c:
            r = await c.get(f"{API_BASE}/{ep}", headers={"x-apisports-key": API_KEY}, params=params)
            if r.status_code == 200:
                return r.json().get("response", [])
    except Exception:
        pass
    return []


def _safe(d, *keys, default=0.0):
    for k in keys:
        if not isinstance(d, dict): return default
        d = d.get(k, default)
    return d or default


def _poisson_prob(lam: float, k: int) -> float:
    """P(X = k) for Poisson(lambda)"""
    if lam <= 0: return 1.0 if k == 0 else 0.0
    return (lam ** k) * math.exp(-lam) / math.factorial(k)


def _match_probs(xg_home: float, xg_away: float, max_goals: int = 8) -> dict:
    """
    Compute P(home win), P(draw), P(away win) using Poisson.
    Also returns full scoreline probability matrix.
    """
    p_home_win = p_draw = p_away_win = 0.0
    scoreline_probs = {}

    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = _poisson_prob(xg_home, h) * _poisson_prob(xg_away, a)
            scoreline_probs[f"{h}-{a}"] = round(p * 100, 2)
            if h > a:   p_home_win += p
            elif h == a: p_draw     += p
            else:        p_away_win += p

    total = p_home_win + p_draw + p_away_win or 1
    top_scorelines = sorted(scoreline_probs.items(), key=lambda x: -x[1])[:8]

    return {
        "p_home_win": round(p_home_win / total * 100, 1),
        "p_draw":     round(p_draw     / total * 100, 1),
        "p_away_win": round(p_away_win / total * 100, 1),
        "top_scorelines": [{"score": k, "probability": v} for k, v in top_scorelines],
    }


def _dixon_coles_tau(home_goals: int, away_goals: int, mu: float, lam: float, rho: float) -> float:
    """Dixon-Coles low-score correction factor."""
    if home_goals == 0 and away_goals == 0:
        return 1 - lam * mu * rho
    elif home_goals == 1 and away_goals == 0:
        return 1 + away_goals * rho   # simplified
    elif home_goals == 0 and away_goals == 1:
        return 1 + home_goals * rho
    elif home_goals == 1 and away_goals == 1:
        return 1 - rho
    return 1.0


def _xg_from_season_stats(home_stats: dict, away_stats: dict) -> tuple:
    """Derive expected goals from season statistics."""
    ph = (home_stats.get("played_home") or 0) + (home_stats.get("played_away") or 0)
    pa = (away_stats.get("played_home") or 0) + (away_stats.get("played_away") or 0)

    h_scored   = (home_stats.get("scored_home") or 0) + (home_stats.get("scored_away") or 0)
    h_conceded = (home_stats.get("conceded_home") or 0) + (home_stats.get("conceded_away") or 0)
    a_scored   = (away_stats.get("scored_home") or 0) + (away_stats.get("scored_away") or 0)
    a_conceded = (away_stats.get("conceded_home") or 0) + (away_stats.get("conceded_away") or 0)

    h_att = h_scored   / max(ph, 1)
    h_def = h_conceded / max(ph, 1)
    a_att = a_scored   / max(pa, 1)
    a_def = a_conceded / max(pa, 1)

    # League average (fallback 1.35)
    league_avg = 1.35

    # Home advantage multiplier
    xg_home = (h_att / league_avg) * (a_def / league_avg) * league_avg * 1.1
    xg_away = (a_att / league_avg) * (h_def / league_avg) * league_avg

    xg_home = max(0.3, min(xg_home, 4.5))
    xg_away = max(0.2, min(xg_away, 4.0))

    return round(xg_home, 2), round(xg_away, 2)


def _live_adjusted_xg(xg_home: float, xg_away: float,
                       home_goals: int, away_goals: int,
                       elapsed: int, total_minutes: int = 90) -> tuple:
    """
    Adjust remaining xG based on current score and time elapsed.
    Uses a simple remaining-time scaling.
    """
    if not elapsed or elapsed <= 0:
        return xg_home, xg_away

    remaining = max(0, total_minutes - elapsed) / total_minutes
    adj_home = xg_home * remaining
    adj_away = xg_away * remaining

    # Score pressure: losing team attacks more
    goal_diff = home_goals - away_goals
    if goal_diff < 0:
        adj_home *= (1 + 0.15 * abs(goal_diff))
        adj_away *= max(0.7, 1 - 0.1 * abs(goal_diff))
    elif goal_diff > 0:
        adj_away *= (1 + 0.15 * abs(goal_diff))
        adj_home *= max(0.7, 1 - 0.1 * abs(goal_diff))

    return round(max(0.05, adj_home), 2), round(max(0.05, adj_away), 2)


def _normalise_season(raw) -> dict:
    s = raw[0] if isinstance(raw, list) and raw else raw if isinstance(raw, dict) else {}
    if not s: return {}
    def _s(*keys): return _safe(s, *keys)
    fx = s.get("fixtures", {}) or {}; goals = s.get("goals", {}) or {}
    ph = _safe(fx, "played", "home"); pa = _safe(fx, "played", "away")
    return {"played_home": ph, "played_away": pa,
            "scored_home":   _safe(goals, "for",     "total", "home"),
            "scored_away":   _safe(goals, "for",     "total", "away"),
            "conceded_home": _safe(goals, "against", "total", "home"),
            "conceded_away": _safe(goals, "against", "total", "away"),
            "form": s.get("form", "")}


@router.get("/api/win-probability/{fixture_id}")
async def win_probability(fixture_id: int):
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = f"winprob:{fixture_id}"
    if (hit := _get(cache_key)) is not None:
        return hit

    # Fetch fixture core first (need team IDs / league)
    fixture_raw = await _api("fixtures", {"id": fixture_id})
    if not fixture_raw:
        raise HTTPException(404, f"Fixture {fixture_id} not found")

    core     = fixture_raw[0]
    fix      = core.get("fixture", {}) or {}
    teams    = core.get("teams",   {}) or {}
    goals    = core.get("goals",   {}) or {}
    league   = core.get("league",  {}) or {}
    home_id  = (teams.get("home") or {}).get("id", 0)
    away_id  = (teams.get("away") or {}).get("id", 0)
    league_id = league.get("id", 0)
    season    = league.get("season") or 2025
    status    = (fix.get("status") or {}).get("short", "NS")
    elapsed   = (fix.get("status") or {}).get("elapsed") or 0
    home_goals = goals.get("home") or 0
    away_goals = goals.get("away") or 0
    is_live    = status in {"1H", "2H", "HT", "ET", "BT", "P"}

    # Fetch season stats in parallel
    home_s_raw, away_s_raw = await asyncio.gather(
        _api("teams/statistics", {"team": home_id, "league": league_id, "season": season}) if home_id else asyncio.coroutine(lambda: [])(),
        _api("teams/statistics", {"team": away_id, "league": league_id, "season": season}) if away_id else asyncio.coroutine(lambda: [])(),
    )

    home_stats = _normalise_season(home_s_raw)
    away_stats = _normalise_season(away_s_raw)

    xg_home, xg_away = _xg_from_season_stats(home_stats, away_stats)

    # For live matches: adjust xG for remaining time + current score pressure
    remaining_xg_home = xg_home
    remaining_xg_away = xg_away
    if is_live:
        remaining_xg_home, remaining_xg_away = _live_adjusted_xg(
            xg_home, xg_away, home_goals, away_goals, elapsed
        )

    # Full-time probabilities (from kick-off perspective)
    full_time_probs = _match_probs(xg_home, xg_away)

    # Current match outcome probabilities (accounting for existing score)
    if is_live and elapsed > 0:
        # Add goals already scored to remaining xG
        adj_home = home_goals + remaining_xg_home
        adj_away = away_goals + remaining_xg_away
        live_probs = _match_probs(remaining_xg_home, remaining_xg_away)
        # Adjust for current score position
        p_hw = live_probs["p_home_win"]
        p_d  = live_probs["p_draw"]
        p_aw = live_probs["p_away_win"]

        # If home is leading, boost their win prob
        goal_diff = home_goals - away_goals
        if goal_diff > 0:
            factor = min(0.95, 0.6 + 0.1 * elapsed / 90)
            p_hw = min(98, p_hw + factor * (100 - p_hw) * 0.4)
            p_aw = max(1,  p_aw * (1 - factor * 0.5))
            p_d  = max(1,  100 - p_hw - p_aw)
        elif goal_diff < 0:
            factor = min(0.95, 0.6 + 0.1 * elapsed / 90)
            p_aw = min(98, p_aw + factor * (100 - p_aw) * 0.4)
            p_hw = max(1,  p_hw * (1 - factor * 0.5))
            p_d  = max(1,  100 - p_hw - p_aw)

        current_probs = {"p_home_win": round(p_hw, 1), "p_draw": round(p_d, 1), "p_away_win": round(p_aw, 1)}
    else:
        current_probs = full_time_probs

    # Over/Under and BTTS
    total_xg     = xg_home + xg_away
    over25       = round((1 - sum(_poisson_prob(total_xg, k) for k in range(3))) * 100, 1)
    btts_prob    = round((1 - _poisson_prob(xg_home, 0)) * (1 - _poisson_prob(xg_away, 0)) * 100, 1)
    over15       = round((1 - sum(_poisson_prob(total_xg, k) for k in range(2))) * 100, 1)
    over35       = round((1 - sum(_poisson_prob(total_xg, k) for k in range(4))) * 100, 1)

    result = {
        "fixture_id":        fixture_id,
        "home_team":         (teams.get("home") or {}).get("name", "Home"),
        "away_team":         (teams.get("away") or {}).get("name", "Away"),
        "home_logo":         (teams.get("home") or {}).get("logo"),
        "away_logo":         (teams.get("away") or {}).get("logo"),
        "status":            status,
        "elapsed":           elapsed,
        "is_live":           is_live,
        "current_score":     {"home": home_goals, "away": away_goals},
        # Pre-match model
        "pre_match": {
            "xg_home":      xg_home,
            "xg_away":      xg_away,
            **full_time_probs,
        },
        # Current (live-adjusted if in play)
        "current": {
            "xg_home":             remaining_xg_home,
            "xg_away":             remaining_xg_away,
            **current_probs,
        },
        "markets": {
            "over_1_5":  over15,
            "over_2_5":  over25,
            "over_3_5":  over35,
            "btts":      btts_prob,
            "clean_sheet_home": round(_poisson_prob(xg_away, 0) * 100, 1),
            "clean_sheet_away": round(_poisson_prob(xg_home, 0) * 100, 1),
        },
        "model": "Dixon-Coles Poisson v2",
    }

    _set(cache_key, result)
    return result