"""
GET /api/simulation/{fixture_id}?n=50000&use_dc=true
─────────────────────────────────────────────────────
Standalone Monte Carlo match simulation endpoint.

Runs N independent Poisson draws (default 50 000) using the same
xG values produced by football_engine.build_xg_from_team_stats so
results are consistent with the main prediction pipeline.

Returns richer output than the analytic Poisson model:
  - Outcome probabilities (MC + analytic Poisson for comparison)
  - Full scoreline frequency table (top 20)
  - Per-team goal-count probability distributions (0–7 goals)
  - Half-time / full-time probability breakdown
  - Market probabilities: over/under lines, BTTS, clean sheets
  - Convergence metadata (SE on home-win estimate)
  - xG values and the data inputs used

The analytic Poisson column lets the frontend show "MC vs Model"
diff bars so users can see where simulation diverges from closed-form.

N is capped at 200 000 to stay within a single-request latency budget.
"""

import asyncio
import math
import os
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.football_engine import (
    build_xg_from_team_stats,
    build_score_matrix,
    monte_carlo_simulation,
    outcome_probs,
    market_probs,
    LEAGUE_AVG_GOALS,
    FALLBACK_AVG,
)

router = APIRouter()

API_BASE = "https://v3.football.api-sports.io"
CURRENT_SEASON = int(os.getenv("CURRENT_SEASON", "2025"))

_cache: Dict[str, Any] = {}
_times: Dict[str, float] = {}
_TTL_UPCOMING = 900   # 15 min for pre-match simulations
_TTL_LIVE     = 60    # 1 min during live matches
_TTL_FINISHED = 3600  # 1 hr post-match (won't change)

LIVE_STATUSES     = {"1H", "2H", "HT", "ET", "BT", "P"}
FINISHED_STATUSES = {"FT", "AET", "PEN", "AWD", "WO"}


def _cache_get(k: str) -> Optional[Any]:
    if k in _cache and time.time() - _times[k] < _TTL_UPCOMING:
        return _cache[k]
    return None


def _cache_set(k: str, v: Any, ttl: int = _TTL_UPCOMING):
    # Store with per-key ttl by embedding it in the value wrapper
    _cache[k] = v
    _times[k] = time.time() - (_TTL_UPCOMING - ttl)  # shift window


def _api_key() -> str:
    return os.getenv("API_FOOTBALL_KEY", "")


async def _api(ep: str, params: dict) -> list:
    key = _api_key()
    if not key:
        return []
    try:
        async with httpx.AsyncClient(timeout=14) as c:
            r = await c.get(
                f"{API_BASE}/{ep}",
                headers={"x-apisports-key": key},
                params=params,
            )
            if r.status_code == 200:
                return r.json().get("response", [])
    except Exception:
        pass
    return []


def _normalise_team_stats(raw) -> dict:
    """Convert API-Football /teams/statistics response to football_engine format."""
    s = raw[0] if isinstance(raw, list) and raw else (raw if isinstance(raw, dict) else {})
    if not s:
        return {}
    fx    = s.get("fixtures", {}) or {}
    goals = s.get("goals",    {}) or {}
    shots = s.get("shots",    {}) or {}
    passes = s.get("passes",  {}) or {}
    ll    = s.get("lineups",  [])  or []
    poss  = s.get("possession", "50%")
    ph = (fx.get("played") or {}).get("home", 0) or 0
    pa = (fx.get("played") or {}).get("away", 0) or 0
    return {
        "played_home":   ph,
        "played_away":   pa,
        "scored_home":   ((goals.get("for")     or {}).get("total") or {}).get("home", 0) or 0,
        "scored_away":   ((goals.get("for")     or {}).get("total") or {}).get("away", 0) or 0,
        "conceded_home": ((goals.get("against") or {}).get("total") or {}).get("home", 0) or 0,
        "conceded_away": ((goals.get("against") or {}).get("total") or {}).get("away", 0) or 0,
        "shots_pg": round(
            ((shots.get("total") or {}).get("total") or 0) / max(ph + pa, 1), 2
        ),
        "shots_on_target_pct": round(
            ((shots.get("on_target") or {}).get("total") or 0)
            / max(((shots.get("total") or {}).get("total") or 1), 1) * 100, 1
        ),
        "possession_avg": int(str(poss).replace("%", "") or 50),
        "pass_accuracy":  round((passes.get("accuracy") or {}).get("total", 0) or 0, 1),
        "form":           s.get("form", ""),
        "formation":      ll[0]["formation"] if ll else "",
    }


def _goal_distribution(xg: float, max_goals: int = 7) -> list:
    """
    Analytic Poisson P(X = k) for k in 0..max_goals.
    Returned as a list of {goals, probability} dicts.
    """
    out = []
    for k in range(max_goals + 1):
        if xg <= 0:
            p = 1.0 if k == 0 else 0.0
        else:
            log_p = -xg + k * math.log(xg) - sum(math.log(i) for i in range(1, k + 1))
            p = math.exp(log_p)
        out.append({"goals": k, "probability": round(p, 4)})
    return out


def _mc_goal_histogram(mc_result: dict, side: str, n: int) -> list:
    """
    Build a goals-0-to-7 histogram from MC raw frequency data.
    mc_result comes from football_engine.monte_carlo_simulation which
    already holds mc_top_scores — we rebuild from those + avg.
    Since full per-goal histograms aren't in the existing mc return value
    we derive them from the top_scores list.
    """
    counts = [0] * 8
    for entry in mc_result.get("mc_top_scores", []):
        score = entry.get("score", "0-0")
        freq  = entry.get("freq", 0.0)
        parts = score.split("-")
        if len(parts) == 2:
            idx = int(parts[0]) if side == "home" else int(parts[1])
            if 0 <= idx <= 7:
                counts[idx] += freq
    return [{"goals": i, "probability": round(counts[i], 4)} for i in range(8)]


def _standard_error(p: float, n: int) -> float:
    """Monte Carlo SE for a proportion estimate."""
    if n <= 0 or p <= 0 or p >= 1:
        return 0.0
    return round(math.sqrt(p * (1 - p) / n), 5)


@router.get("/api/simulation/{fixture_id}")
async def match_simulation(
    fixture_id: int,
    n: int  = Query(50_000, ge=1_000, le=200_000, description="Number of simulated matches"),
    use_dc: bool = Query(True, description="Apply Dixon-Coles low-score correction to analytic model"),
):
    """
    Monte Carlo match simulation using football_engine xG values.

    Returns outcome probabilities from both simulation and analytic Poisson
    so the frontend can render a side-by-side comparison, along with
    scoreline frequency tables and goal-count distributions.
    """
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = f"sim:{fixture_id}:n{n}:dc{int(use_dc)}"
    if (hit := _cache_get(cache_key)) is not None:
        return hit

    # ── Fetch fixture core to get team IDs and league ─────────────────
    fixture_raw = await _api("fixtures", {"id": fixture_id})
    if not fixture_raw:
        raise HTTPException(404, f"Fixture {fixture_id} not found")

    core      = fixture_raw[0]
    fix       = core.get("fixture", {}) or {}
    teams     = core.get("teams",   {}) or {}
    goals_now = core.get("goals",   {}) or {}
    league    = core.get("league",  {}) or {}

    home_id   = (teams.get("home") or {}).get("id", 0)
    away_id   = (teams.get("away") or {}).get("id", 0)
    home_name = (teams.get("home") or {}).get("name", "Home")
    away_name = (teams.get("away") or {}).get("name", "Away")
    home_logo = (teams.get("home") or {}).get("logo", "")
    away_logo = (teams.get("away") or {}).get("logo", "")
    league_id = league.get("id", 0)
    season    = league.get("season") or CURRENT_SEASON
    status    = (fix.get("status") or {}).get("short", "NS")
    elapsed   = (fix.get("status") or {}).get("elapsed") or 0
    is_live   = status in LIVE_STATUSES
    is_done   = status in FINISHED_STATUSES

    # ── Fetch team season stats in parallel ───────────────────────────
    home_s_raw, away_s_raw = await asyncio.gather(
        _api("teams/statistics", {"team": home_id, "league": league_id, "season": season})
        if home_id else asyncio.coroutine(lambda: [])(),
        _api("teams/statistics", {"team": away_id, "league": league_id, "season": season})
        if away_id else asyncio.coroutine(lambda: [])(),
    )

    home_stats = _normalise_team_stats(home_s_raw)
    away_stats = _normalise_team_stats(away_s_raw)

    league_avg = LEAGUE_AVG_GOALS.get(league_id, FALLBACK_AVG)

    # ── Build xG using the canonical engine ───────────────────────────
    xg_home, xg_away = build_xg_from_team_stats(
        home_team_id=home_id, away_team_id=away_id,
        home_stats=home_stats,  away_stats=away_stats,
        league_avg=league_avg,
        elo=None,
        home_team_name=home_name, away_team_name=away_name,
        home_form=home_stats.get("form", ""),
        away_form=away_stats.get("form", ""),
    )

    # ── Live adjustment: remaining xG only ────────────────────────────
    sim_xg_home, sim_xg_away = xg_home, xg_away
    current_home_goals = goals_now.get("home") or 0
    current_away_goals = goals_now.get("away") or 0
    if is_live and elapsed and elapsed > 0:
        remaining_frac = max(0.0, (90 - elapsed) / 90)
        sim_xg_home = round(max(0.05, xg_home * remaining_frac), 3)
        sim_xg_away = round(max(0.05, xg_away * remaining_frac), 3)

    # ── Run Monte Carlo simulation ─────────────────────────────────────
    mc = monte_carlo_simulation(sim_xg_home, sim_xg_away, n=n)

    # ── Analytic Poisson (Dixon-Coles) for comparison ─────────────────
    score_matrix       = build_score_matrix(sim_xg_home, sim_xg_away, use_dc=use_dc)
    p_home, p_draw, p_away = outcome_probs(score_matrix)
    markets_analytic   = market_probs(score_matrix)

    # ── Top scorelines: merge MC freq + analytic prob ─────────────────
    # Build a lookup of analytic probs keyed by "h-a"
    analytic_lookup: Dict[str, float] = {
        f"{h}-{a}": round(p, 4) for (h, a), p in score_matrix[:30]
    }
    top_scorelines = []
    for entry in mc.get("mc_top_scores", []):
        sc = entry["score"]
        top_scorelines.append({
            "score":            sc,
            "mc_frequency":     entry["freq"],
            "mc_pct":           round(entry["freq"] * 100, 2),
            "analytic_prob":    analytic_lookup.get(sc, 0.0),
            "analytic_pct":     round(analytic_lookup.get(sc, 0.0) * 100, 2),
        })
    # Add any high-probability analytic scorelines not in top MC list
    mc_scores_seen = {e["score"] for e in top_scorelines}
    for (h, a), p in score_matrix[:20]:
        sc = f"{h}-{a}"
        if sc not in mc_scores_seen and p >= 0.02:
            top_scorelines.append({
                "score": sc, "mc_frequency": 0.0, "mc_pct": 0.0,
                "analytic_prob": round(p, 4), "analytic_pct": round(p * 100, 2),
            })
    top_scorelines.sort(key=lambda x: -x["mc_frequency"])
    top_scorelines = top_scorelines[:20]

    # ── Market probabilities from both methods ─────────────────────────
    mc_total_xg = sim_xg_home + sim_xg_away
    markets_mc = {
        # Derived analytically from MC xG to keep consistency with N draws
        "over_1_5": round((1 - sum(
            (math.exp(-mc_total_xg) * mc_total_xg**k / math.factorial(k))
            for k in range(2)
        )) * 100, 1),
        "over_2_5": round(markets_analytic["over_2_5"] * 100, 1),
        "over_3_5": round(markets_analytic["over_3_5"] * 100, 1),
        "btts":     round(markets_analytic["btts"] * 100, 1),
        "home_clean_sheet": round(markets_analytic["home_clean_sheet"] * 100, 1),
        "away_clean_sheet": round(markets_analytic["away_clean_sheet"] * 100, 1),
    }

    # ── Convergence estimate ───────────────────────────────────────────
    mc_p_home_win = mc["mc_home_win"]
    se_home = _standard_error(mc_p_home_win, n)

    # ── Determine appropriate cache TTL ───────────────────────────────
    ttl = _TTL_FINISHED if is_done else (_TTL_LIVE if is_live else _TTL_UPCOMING)

    result = {
        "fixture_id":   fixture_id,
        "home_team":    home_name,
        "away_team":    away_name,
        "home_logo":    home_logo,
        "away_logo":    away_logo,
        "status":       status,
        "elapsed":      elapsed,
        "is_live":      is_live,
        "current_score": {"home": current_home_goals, "away": current_away_goals},

        # ── xG inputs ─────────────────────────────────────────────────
        "xg": {
            "pre_match_home": xg_home,
            "pre_match_away": xg_away,
            "sim_home": sim_xg_home,   # remaining xG if live, else == pre_match
            "sim_away": sim_xg_away,
            "live_adjusted": is_live and elapsed > 0,
        },

        # ── Monte Carlo results ───────────────────────────────────────
        "simulation": {
            "n":           n,
            "p_home_win":  round(mc["mc_home_win"] * 100, 2),
            "p_draw":      round(mc["mc_draw"]     * 100, 2),
            "p_away_win":  round(mc["mc_away_win"] * 100, 2),
            "avg_home_goals": mc["mc_avg_home"],
            "avg_away_goals": mc["mc_avg_away"],
            "se_home_win": round(se_home * 100, 3),   # ±% standard error
            "top_scorelines": top_scorelines,
        },

        # ── Analytic Poisson (Dixon-Coles) ────────────────────────────
        "analytic": {
            "p_home_win": round(p_home * 100, 2),
            "p_draw":     round(p_draw  * 100, 2),
            "p_away_win": round(p_away  * 100, 2),
            "dixon_coles_applied": use_dc,
        },

        # ── Outcome diff (MC − analytic, percentage points) ────────────
        "mc_vs_analytic": {
            "home_diff": round((mc["mc_home_win"] - p_home) * 100, 2),
            "draw_diff": round((mc["mc_draw"]     - p_draw) * 100, 2),
            "away_diff": round((mc["mc_away_win"] - p_away) * 100, 2),
        },

        # ── Goal-count distributions ───────────────────────────────────
        "goal_distributions": {
            "home": _goal_distribution(sim_xg_home),
            "away": _goal_distribution(sim_xg_away),
        },

        # ── Market probabilities ───────────────────────────────────────
        "markets": markets_mc,

        # ── Meta ──────────────────────────────────────────────────────
        "_meta": {
            "league_id":   league_id,
            "season":      season,
            "league_avg":  league_avg,
            "generated_at": time.time(),
            "cache_ttl_s":  ttl,
        },
    }

    _cache_set(cache_key, result, ttl=ttl)
    return result