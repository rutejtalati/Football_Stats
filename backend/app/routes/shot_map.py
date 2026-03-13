"""
GET /api/shot-map/{fixture_id}
Returns shot coordinates, xG values, and outcome for both teams.
"""

import asyncio, os, time, math, random
from typing import Dict, Any, List
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


# ── xG model ──────────────────────────────────────────────────────────────────
# Real shot coordinates aren't available on free API tier.
# We synthesise realistic positions from event data + xG heuristics.

SHOT_ZONES = {
    # (x_center, y_center, x_spread, y_spread, base_xg, label)
    "six_yard":    (92, 50, 2,  8,  0.65, "Six Yard Box"),
    "penalty_spot":(88, 50, 1,  1,  0.76, "Penalty Spot"),
    "inside_box_c":(83, 50, 5, 12,  0.25, "Central Box"),
    "inside_box_l":(83, 35, 5,  8,  0.15, "Left Box"),
    "inside_box_r":(83, 65, 5,  8,  0.15, "Right Box"),
    "edge_box":    (77, 50, 4, 10,  0.08, "Edge of Box"),
    "outside_l":   (73, 35, 5,  8,  0.04, "Outside Left"),
    "outside_r":   (73, 65, 5,  8,  0.04, "Outside Right"),
    "long_range":  (65, 50, 8, 15,  0.03, "Long Range"),
}

ZONE_WEIGHTS = {
    "six_yard":     0.05,
    "penalty_spot": 0.10,
    "inside_box_c": 0.30,
    "inside_box_l": 0.12,
    "inside_box_r": 0.12,
    "edge_box":     0.15,
    "outside_l":    0.06,
    "outside_r":    0.06,
    "long_range":   0.04,
}


def _pick_zone(is_goal: bool = False, is_header: bool = False) -> str:
    if is_goal:
        # Goals cluster in high-xG zones
        weighted = {"six_yard": 0.20, "penalty_spot": 0.15, "inside_box_c": 0.40,
                    "inside_box_l": 0.10, "inside_box_r": 0.10, "edge_box": 0.05}
    elif is_header:
        weighted = {"six_yard": 0.30, "inside_box_c": 0.30, "inside_box_l": 0.15, "inside_box_r": 0.15, "edge_box": 0.10}
    else:
        weighted = ZONE_WEIGHTS

    zones  = list(weighted.keys())
    probs  = list(weighted.values())
    total  = sum(probs)
    r      = random.random() * total
    cumul  = 0
    for z, p in zip(zones, probs):
        cumul += p
        if r <= cumul:
            return z
    return "inside_box_c"


def _shot_from_event(ev: dict, team_id: int, home_id: int, seed: int) -> dict:
    random.seed(seed)
    detail = ev.get("detail", "")
    etype  = ev.get("type", "")
    minute = (ev.get("time") or {}).get("elapsed", 45)

    is_goal   = etype == "Goal" and "Own Goal" not in detail
    is_miss   = etype == "Goal" and "Missed Penalty" in detail
    is_saved  = False
    is_header = False  # can't determine from events API without player stats

    zone = _pick_zone(is_goal=is_goal)
    zdata = SHOT_ZONES[zone]
    cx, cy, sx, sy, base_xg, zlabel = zdata

    # Add noise
    x = round(max(55, min(100, cx + random.gauss(0, sx))), 1)
    y = round(max(0,  min(100, cy + random.gauss(0, sy))), 1)

    # xG: distance-based decay from goal center (100, 50)
    dist = math.sqrt((100 - x) ** 2 + (50 - y) ** 2)
    angle_adj = 1.0 - abs(y - 50) / 100
    xg = round(max(0.01, min(0.99, base_xg * angle_adj * (1 - dist / 80))), 3)

    outcome = "goal" if is_goal else ("saved" if not is_miss else "blocked")

    # Away team shots come from the other end (mirror x axis)
    # Pitch is 0-100 x (left=0 = away goal, right=100 = home goal)
    # Home attacks right (high x), away attacks left (low x)
    if team_id != home_id:
        x = round(100 - x, 1)

    return {
        "x": x, "y": y,
        "xg": xg,
        "outcome":  outcome,
        "zone":     zlabel,
        "minute":   minute,
        "player":   (ev.get("player") or {}).get("name", "Unknown"),
        "detail":   detail,
        "is_goal":  is_goal,
    }


def _extract_shots_from_events(events: list, home_id: int, away_id: int) -> tuple:
    """Extract goal events + infer shot volume from stats."""
    home_shots: List[dict] = []
    away_shots: List[dict] = []

    goal_events = [e for e in events if e.get("type") == "Goal"]
    for i, ev in enumerate(goal_events):
        team_id = (ev.get("team") or {}).get("id")
        shot = _shot_from_event(ev, team_id, home_id, seed=i * 17 + 3)
        if team_id == home_id:
            home_shots.append(shot)
        elif team_id == away_id:
            away_shots.append(shot)

    return home_shots, away_shots


def _add_non_goal_shots(
    goal_shots: List[dict], total_shots: int, total_on_target: int,
    team_id: int, home_id: int, base_seed: int
) -> List[dict]:
    """Synthesise non-goal shots to reach total_shots count."""
    result = list(goal_shots)
    existing = len(result)
    to_add = max(0, total_shots - existing)
    goals_scored = sum(1 for s in result if s["is_goal"])
    on_target_remaining = max(0, total_on_target - goals_scored)

    random.seed(base_seed)
    for i in range(to_add):
        is_on = i < on_target_remaining
        zone = _pick_zone(is_goal=False)
        zdata = SHOT_ZONES[zone]
        cx, cy, sx, sy, base_xg, zlabel = zdata
        x = round(max(55, min(100, cx + random.gauss(0, sx))), 1)
        y = round(max(0, min(100, cy + random.gauss(0, sy))), 1)
        dist = math.sqrt((100 - x) ** 2 + (50 - y) ** 2)
        angle_adj = 1.0 - abs(y - 50) / 100
        xg = round(max(0.01, min(0.99, base_xg * angle_adj * (1 - dist / 80))), 3)

        if team_id != home_id:
            x = round(100 - x, 1)

        # Distribute over match duration
        minute = random.randint(1, 90)
        outcome = "saved" if is_on else random.choice(["blocked", "off_target", "off_target"])

        result.append({
            "x": x, "y": y, "xg": xg,
            "outcome": outcome,
            "zone": zlabel,
            "minute": minute,
            "player": "",
            "detail": "",
            "is_goal": False,
        })

    return sorted(result, key=lambda s: s["minute"])


def _parse_stat(stats_raw: list, team_id: int, stat_type: str) -> int:
    for sb in stats_raw:
        if (sb.get("team") or {}).get("id") == team_id:
            for s in (sb.get("statistics") or []):
                if s.get("type") == stat_type:
                    v = s.get("value")
                    try: return int(v or 0)
                    except: return 0
    return 0


@router.get("/api/shot-map/{fixture_id}")
async def shot_map(fixture_id: int):
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    cache_key = f"shotmap:{fixture_id}"
    if (hit := _get(cache_key)) is not None:
        return hit

    fixture_raw, events_raw, stats_raw = await asyncio.gather(
        _api("fixtures",            {"id": fixture_id}),
        _api("fixtures/events",     {"fixture": fixture_id}),
        _api("fixtures/statistics", {"fixture": fixture_id}),
    )

    if not fixture_raw:
        raise HTTPException(404, f"Fixture {fixture_id} not found")

    core     = fixture_raw[0]
    teams    = core.get("teams", {}) or {}
    home_id  = (teams.get("home") or {}).get("id", 0)
    away_id  = (teams.get("away") or {}).get("id", 0)
    home_name = (teams.get("home") or {}).get("name", "Home")
    away_name = (teams.get("away") or {}).get("name", "Away")

    # Pull shot totals from stats
    h_total     = _parse_stat(stats_raw, home_id, "Total Shots")
    a_total     = _parse_stat(stats_raw, away_id, "Total Shots")
    h_on_target = _parse_stat(stats_raw, home_id, "Shots on Goal")
    a_on_target = _parse_stat(stats_raw, away_id, "Shots on Goal")

    # Extract goal shots from events, then fill non-goal shots
    home_goal_shots, away_goal_shots = _extract_shots_from_events(events_raw, home_id, away_id)

    home_shots = _add_non_goal_shots(home_goal_shots, max(h_total, len(home_goal_shots)), h_on_target, home_id, home_id, base_seed=fixture_id * 3)
    away_shots = _add_non_goal_shots(away_goal_shots, max(a_total, len(away_goal_shots)), a_on_target, away_id, home_id, base_seed=fixture_id * 7)

    def _summary(shots: List[dict]) -> dict:
        total    = len(shots)
        goals    = sum(1 for s in shots if s["is_goal"])
        on_tgt   = sum(1 for s in shots if s["outcome"] in ("goal", "saved"))
        total_xg = round(sum(s["xg"] for s in shots), 2)
        avg_xg   = round(total_xg / max(total, 1), 3)
        return {"total": total, "goals": goals, "on_target": on_tgt,
                "total_xg": total_xg, "avg_xg_per_shot": avg_xg,
                "xg_conversion": round(goals / max(total_xg, 0.01), 2)}

    result = {
        "fixture_id": fixture_id,
        "home_team":  home_name,
        "away_team":  away_name,
        "home": {
            "shots": home_shots,
            "summary": _summary(home_shots),
        },
        "away": {
            "shots": away_shots,
            "summary": _summary(away_shots),
        },
        "note": "Coordinates synthesised from event data. Real coordinates require premium API tier.",
    }

    _set(cache_key, result)
    return result