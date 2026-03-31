"""
GET /api/match-momentum/{fixture_id}
Returns per-minute attacking pressure data for both teams.
Derived from: events (shots, corners, cards, goals) weighted by danger level.
"""

import asyncio, os, time
from typing import Dict, Any, Optional
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

API_BASE = "https://v3.football.api-sports.io"

_cache: Dict[str, Any]   = {}
_times: Dict[str, float] = {}
_TTL = 120  # 2 min (live matches need fresh data)


def _get(k): return _cache[k] if k in _cache and time.time()-_times[k]<_TTL else None
def _set(k, v): _cache[k]=v; _times[k]=time.time()


def _api_key() -> str:
    """Lazy read so the key is always fetched from the environment at call time,
    not at module import — important when env vars are injected after startup."""
    return os.getenv("API_FOOTBALL_KEY", "")


async def _api(ep: str, params: dict) -> list:
    key = _api_key()
    if not key:
        return []
    try:
        async with httpx.AsyncClient(timeout=14) as c:
            r = await c.get(f"{API_BASE}/{ep}", headers={"x-apisports-key": key}, params=params)
            if r.status_code == 200:
                return r.json().get("response", [])
    except Exception:
        pass
    return []


# Event danger weights
DANGER = {
    "Goal":         10,
    "subst":         0,
    "Card":          1,
    "Var":           2,
    # from stats blocks mapped below
    "Shot on Goal":  4,
    "Total Shots":   2,
    "Corner Kicks":  2,
}


def _build_momentum(events: list, stats: list, home_id: int, away_id: int) -> dict:
    """
    Build a 90-minute momentum timeline.
    Returns: { home: [val, val, ...x90], away: [...x90], peaks: {home, away}, rolling: {home, away} }
    """
    home_pressure = [0.0] * 95
    away_pressure = [0.0] * 95

    for ev in events:
        minute = ev.get("time", {}).get("elapsed") or 0
        extra  = ev.get("time", {}).get("extra") or 0
        m = min(int(minute) + int(extra), 94)
        etype  = ev.get("type", "")
        detail = ev.get("detail", "")
        team_id = ev.get("team", {}).get("id")

        # Weight
        w = DANGER.get(etype, 1)
        if etype == "Goal":
            w = 10
        elif etype == "Card" and "Red" in detail:
            w = -3  # negative pressure for red card (disruption)
        elif etype == "Card":
            w = 1

        if team_id == home_id:
            home_pressure[m] += w
        elif team_id == away_id:
            away_pressure[m] += w

    # Add stat-based contributions (shots, corners by 15-min buckets)
    # NOTE: API /fixtures/statistics returns totals only, not bucketed by minute,
    # so we cannot distribute them across time slots. The stat_map is retained
    # for potential future use if a bucketed stats endpoint becomes available.
    BUCKET_KEYS = ["0-15","16-30","31-45","46-60","61-75","76-90","91-105","106-120"]
    BUCKET_START = [0, 16, 31, 46, 61, 76, 91, 106]

    # Rolling box-window smoothing (uniform weights, window ±5 minutes)
    def _smooth(arr, window=5):
        out = []
        for i in range(len(arr)):
            lo = max(0, i - window)
            hi = min(len(arr), i + window + 1)
            out.append(round(sum(arr[lo:hi]) / (hi - lo), 3))
        return out

    # Clamp negative values (red cards) before smoothing so they don't
    # produce > 100% or negative percentage outputs downstream.
    home_pressure_clamped = [max(v, 0.0) for v in home_pressure]
    away_pressure_clamped = [max(v, 0.0) for v in away_pressure]

    home_smooth = _smooth(home_pressure_clamped)
    away_smooth = _smooth(away_pressure_clamped)

    def _peak(arr):
        if not any(arr): return 0
        return round(max(arr), 2)

    # Build 90 datapoints (1 per minute)
    home_90 = [round(home_smooth[i], 3) for i in range(90)]
    away_90 = [round(away_smooth[i], 3) for i in range(90)]

    # Dominant periods — use the same smoothed arrays as the chart data
    # so period dominance is consistent with what the chart displays.
    periods = []
    for i, (start, label) in enumerate(zip(BUCKET_START[:6], BUCKET_KEYS[:6])):
        end = BUCKET_START[i+1] if i+1 < len(BUCKET_START) else 90
        h_sum = sum(home_smooth[start:end])
        a_sum = sum(away_smooth[start:end])
        total = h_sum + a_sum + 0.001
        periods.append({
            "label":      label,
            "home_pct":   round(h_sum / total * 100),
            "away_pct":   round(a_sum / total * 100),
            "dominant":   "home" if h_sum > a_sum else "away" if a_sum > h_sum else "even",
        })

    # Overall dominance — use clamped arrays so red cards don't skew totals negative
    h_total = sum(home_pressure_clamped)
    a_total = sum(away_pressure_clamped)
    t_total = h_total + a_total + 0.001

    return {
        "home_momentum": home_90,
        "away_momentum": away_90,
        "peaks": {
            "home": _peak(home_90),
            "away": _peak(away_90),
        },
        "overall": {
            "home_pct": round(h_total / t_total * 100),
            "away_pct": round(a_total / t_total * 100),
        },
        "periods": periods,
    }


@router.get("/api/match-momentum/{fixture_id}")
async def match_momentum(fixture_id: int):
    if not _api_key():
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = f"momentum:{fixture_id}"
    if (hit := _get(cache_key)) is not None:
        return hit

    # Fetch fixture core, events, stats in parallel
    fixture_raw, events_raw, stats_raw = await asyncio.gather(
        _api("fixtures",            {"id": fixture_id}),
        _api("fixtures/events",     {"fixture": fixture_id}),
        _api("fixtures/statistics", {"fixture": fixture_id}),
    )

    if not fixture_raw:
        raise HTTPException(404, f"Fixture {fixture_id} not found")

    core     = fixture_raw[0]
    home_id  = (core.get("teams") or {}).get("home", {}).get("id", 0)
    away_id  = (core.get("teams") or {}).get("away", {}).get("id", 0)
    home_name = (core.get("teams") or {}).get("home", {}).get("name", "Home")
    away_name = (core.get("teams") or {}).get("away", {}).get("name", "Away")
    status   = ((core.get("fixture") or {}).get("status") or {}).get("short", "NS")
    elapsed  = ((core.get("fixture") or {}).get("status") or {}).get("elapsed")

    momentum = _build_momentum(events_raw, stats_raw, home_id, away_id)

    result = {
        "fixture_id": fixture_id,
        "home_team":  home_name,
        "away_team":  away_name,
        "status":     status,
        "elapsed":    elapsed,
        **momentum,
    }

    # Use a shorter TTL for in-progress matches so live data stays fresh.
    # Completed/pre-match fixtures can use the full 2-minute window.
    live_statuses = {"1H", "2H", "HT", "ET", "BT", "P"}
    effective_ttl = 30 if status in live_statuses else _TTL
    _cache[cache_key] = result
    _times[cache_key] = time.time() - (_TTL - effective_ttl)  # backdate so TTL fires at right time
    return result