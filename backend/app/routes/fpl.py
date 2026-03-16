# backend/app/routes/fpl.py
# ═══════════════════════════════════════════════════════════════════════════════
# FPL proxy + predictor-table   —   v2
#
# Critical fixes applied in this version
# ───────────────────────────────────────
#   1. predictor-table response key changed:  "players" → "rows"
#      Both keys are returned so existing frontends don't break.
#   2. min_prob filter range corrected:  0–100 → 0.0–1.0
#      min_prob is now a fractional ownership threshold (0.0 = no filter).
#   3. appearance_prob always returns a float 0–1, never None.
#
# New endpoints (all under /api/fpl/)
# ─────────────────────────────────────
#   GET /captaincy            — ranked captain picks with EP projections
#   GET /fixture-difficulty   — heatmap data: team × GW difficulty grid
#   GET /transfer-planner     — transfers-in/out momentum + EP deltas
#   GET /differentials        — sub-15%-owned players by EP/ownership ratio
#   GET /best-xi              — optimised starting XI under budget constraint
#   GET /player-ep/{id}       — per-GW EP history + projection for charts
#
# Expected Points model
# ──────────────────────
# EP = minutes_prob × (xG × goal_pts + xA × assist_pts
#                      + cs_prob × cs_pts + bonus_expectation + app_pts)
#
# Position scoring:
#   GK / DEF   goal=6  assist=3  cs=4
#   MID        goal=5  assist=3  cs=1
#   FWD        goal=4  assist=3  cs=0
# ═══════════════════════════════════════════════════════════════════════════════

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/fpl", tags=["fpl"])

FPL_BASE = "https://fantasy.premierleague.com/api"
HEADERS  = {"User-Agent": "StatinSite/4.0"}

# ══════════════════════════════════════════════════════════════════════════════
# CACHE
# ══════════════════════════════════════════════════════════════════════════════

_cache:  Dict[str, Any]   = {}
_ctimes: Dict[str, float] = {}

TTL_BOOTSTRAP = 3600
TTL_FIXTURES  = 1800
TTL_LIVE      = 120
TTL_ELEMENT   = 3600
TTL_TABLE     = 300


def _cget(key: str, ttl: float) -> Optional[Any]:
    if key in _cache and time.monotonic() - _ctimes.get(key, 0) < ttl:
        return _cache[key]
    return None


def _cset(key: str, val: Any) -> None:
    _cache[key] = val
    _ctimes[key] = time.monotonic()


# ══════════════════════════════════════════════════════════════════════════════
# HTTP HELPER
# ══════════════════════════════════════════════════════════════════════════════

async def _fpl(path: str) -> Any:
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
            r = await c.get(f"{FPL_BASE}/{path.lstrip('/')}", headers=HEADERS)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"FPL upstream {e.response.status_code}")
    except Exception as e:
        raise HTTPException(502, f"FPL unreachable: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# CACHED DATA FETCHERS
# ══════════════════════════════════════════════════════════════════════════════

async def _bootstrap() -> dict:
    hit = _cget("bootstrap", TTL_BOOTSTRAP)
    if hit:
        return hit
    data = await _fpl("/bootstrap-static/")
    _cset("bootstrap", data)
    return data


async def _fixtures_raw() -> list:
    hit = _cget("fixtures", TTL_FIXTURES)
    if hit:
        return hit
    data = await _fpl("/fixtures/")
    _cset("fixtures", data)
    return data


async def _element_summary_cached(element_id: int) -> dict:
    key = f"element:{element_id}"
    hit = _cget(key, TTL_ELEMENT)
    if hit:
        return hit
    data = await _fpl(f"/element-summary/{element_id}/")
    _cset(key, data)
    return data


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS & LOOKUPS
# ══════════════════════════════════════════════════════════════════════════════

SHORT_TO_CODE: Dict[str, str] = {
    "ARS": "ARS", "AVL": "AVL", "BOU": "BOU", "BRE": "BRE", "BHA": "BHA",
    "CHE": "CHE", "CRY": "CRY", "EVE": "EVE", "FUL": "FUL", "IPS": "IPS",
    "LEI": "LEI", "LIV": "LIV", "MCI": "MCI", "MUN": "MUN", "NEW": "NEW",
    "NFO": "NFO", "SOU": "SOU", "TOT": "TOT", "WHU": "WHU", "WOL": "WOL",
    "MAN UTD": "MUN", "MAN CITY": "MCI", "SPURS": "TOT",
    "FOREST": "NFO", "BRIGHTON": "BHA", "WOLVES": "WOL",
    "BRENTFORD": "BRE", "IPSWICH": "IPS", "LEICESTER": "LEI",
    "SOUTHAMPTON": "SOU",
}

POSITION_MAP: Dict[int, str] = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

FDR_MULT: Dict[int, float] = {1: 1.25, 2: 1.10, 3: 0.95, 4: 0.78, 5: 0.60}

POS_SCORING: Dict[str, Dict[str, float]] = {
    "GK":  {"goal": 6, "assist": 3, "cs": 4, "app": 2},
    "DEF": {"goal": 6, "assist": 3, "cs": 4, "app": 2},
    "MID": {"goal": 5, "assist": 3, "cs": 1, "app": 2},
    "FWD": {"goal": 4, "assist": 3, "cs": 0, "app": 2},
}

DEFAULT_BUDGET = 100.0

FORMATIONS: Dict[str, Dict[str, int]] = {
    "433": {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "442": {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "352": {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "343": {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "451": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "541": {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
}


# ══════════════════════════════════════════════════════════════════════════════
# PURE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _fdr_mult(fdr: int) -> float:
    return FDR_MULT.get(int(fdr), 0.95)


def _team_code(short_name: str) -> str:
    s = (short_name or "").upper().strip()
    return SHORT_TO_CODE.get(s, s[:3] if len(s) >= 3 else s)


def _proj_pts(base_ppg: float, fx_list: list) -> float:
    """Legacy projected_points: PPG × FDR multiplier summed over window."""
    return round(sum(base_ppg * _fdr_mult(f.get("difficulty", 3)) for f in fx_list), 1)


def _appearance_prob(el: dict) -> float:
    """
    FIX: Always returns a float 0–1.
    FPL chance_of_playing_next_round is 0–100 or None (None → assume fully fit).
    """
    chance = el.get("chance_of_playing_next_round")
    if chance is None:
        return 1.0
    return max(0.0, min(1.0, float(chance) / 100.0))


def _minutes_prob(minutes: int, played: int) -> float:
    """Probability of completing ≥ 60 mins based on season minutes rate."""
    if played == 0:
        return 1.0
    pct = minutes / max(played * 90, 1)
    if pct > 0.85:   return 0.92
    elif pct > 0.70: return 0.82
    elif pct > 0.50: return 0.68
    elif pct > 0.30: return 0.50
    else:            return 0.35


def _expected_points(pos: str, el: dict, played: int,
                     cs_prob: float, fdr: int = 3) -> float:
    """
    Expected Points for one fixture.

    EP = minutes_prob × (
            xG × goal_pts
          + xA × assist_pts
          + cs_prob × cs_pts
          + bonus_expectation
          + appearance_pts
    )
    """
    pts       = POS_SCORING.get(pos, POS_SCORING["MID"])
    mins      = el.get("minutes", 0) or 0
    goals     = el.get("goals_scored", 0) or 0
    assts     = el.get("assists", 0) or 0
    bonus     = el.get("bonus", 0) or 0
    chance    = _appearance_prob(el)
    min_prob  = _minutes_prob(mins, played)
    play_prob = chance * min_prob
    played_90s = max(mins / 90.0, 1.0)
    xG        = goals / played_90s
    xA        = assts / played_90s
    bonus_exp = bonus / max(played, 1)
    fdr_scale = _fdr_mult(fdr)
    ep = play_prob * (
        xG * pts["goal"]   * fdr_scale
        + xA * pts["assist"] * fdr_scale
        + cs_prob * pts["cs"]
        + bonus_exp
        + pts["app"]
    )
    return round(ep, 3)


def _fixture_run_score(fx_list: list) -> float:
    """0–10 (10 = easiest run) based on next 5 fixtures with home discount."""
    if not fx_list:
        return 5.0
    next5    = fx_list[:5]
    adjusted = [f["difficulty"] - (0.3 if f.get("home") else 0) for f in next5]
    avg_fdr  = sum(adjusted) / len(adjusted)
    return round(max(0.0, min(10.0, (6.0 - avg_fdr) * 2.5)), 1)


def _transfer_momentum(el: dict) -> int:
    return (el.get("transfers_in_event") or 0) - (el.get("transfers_out_event") or 0)


def _minutes_security(el: dict, played: int) -> float:
    return round(_appearance_prob(el) * _minutes_prob(el.get("minutes", 0) or 0, played), 3)


def _captain_score(el: dict, ep: float, ownership: float) -> float:
    """EP × 2 with differential bonus (decaying above 15% ownership)."""
    cap_ep    = ep * 2.0
    own_frac  = ownership / 100.0
    diff_mult = 1.0 if own_frac <= 0.15 else 1.0 - 0.4 * (own_frac - 0.15) / 0.85
    return round(cap_ep * diff_mult, 3)


def _value_score(el: dict, ep: float) -> float:
    cost_m = (el.get("now_cost") or 50) / 10.0
    return round(ep / max(cost_m, 0.1), 4)


def _photo_url(el: dict) -> str:
    photo_id = (el.get("photo") or "").replace(".jpg", "")
    if not photo_id:
        return ""
    return (
        f"https://resources.premierleague.com/premierleague/photos/"
        f"players/110x140/p{photo_id}.png"
    )


# ══════════════════════════════════════════════════════════════════════════════
# SHARED FIXTURE-BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_team_fixtures(fixtures: list, team_map: Dict[int, dict],
                         gw_range: list) -> Dict[int, List[dict]]:
    tf: Dict[int, List[dict]] = {}
    for fx in fixtures:
        gw = fx.get("event")
        if gw not in gw_range:
            continue
        htid    = fx.get("team_h")
        atid    = fx.get("team_a")
        h_fdr   = fx.get("team_h_difficulty", 3)
        a_fdr   = fx.get("team_a_difficulty", 3)
        h_short = team_map.get(htid, {}).get("short_name", "")
        a_short = team_map.get(atid, {}).get("short_name", "")
        if htid:
            tf.setdefault(htid, []).append(
                {"gw": gw, "difficulty": h_fdr, "home": True,
                 "opp_name": _team_code(a_short)}
            )
        if atid:
            tf.setdefault(atid, []).append(
                {"gw": gw, "difficulty": a_fdr, "home": False,
                 "opp_name": _team_code(h_short)}
            )
    for tid in tf:
        tf[tid].sort(key=lambda x: x["gw"])
    return tf


def _team_cs_rates(elements: list, team_map: Dict[int, dict]) -> Dict[int, float]:
    """Per-team clean-sheet rate derived from GK data."""
    team_cs: Dict[int, List[float]] = {}
    for el in elements:
        if el.get("element_type") != 1:
            continue
        tid    = el.get("team", 0)
        cs     = el.get("clean_sheets", 0) or 0
        played = max((el.get("minutes", 0) or 0) // 90, 1)
        team_cs.setdefault(tid, []).append(cs / played)
    return {tid: sum(rates) / len(rates) for tid, rates in team_cs.items() if rates}


# ══════════════════════════════════════════════════════════════════════════════
# SHARED PLAYER ROW BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_player_row(el: dict, team_map: Dict[int, dict],
                      team_fixtures: Dict[int, List[dict]],
                      cs_rates: Dict[int, float],
                      gw_range: list) -> dict:
    """Build the complete player dict for all endpoints."""
    pos_id  = el.get("element_type", 0)
    pos_str = POSITION_MAP.get(pos_id, "UNK")

    cost_m    = round((el.get("now_cost") or 0) / 10.0, 1)
    ownership = float(el.get("selected_by_percent") or 0)
    form      = float(el.get("form") or 0)
    pts_pg    = float(el.get("points_per_game") or 0)

    el_team_id    = el.get("team", 0)
    el_team_info  = team_map.get(el_team_id, {})
    el_team_name  = el_team_info.get("name", "")
    el_team_short = el_team_info.get("short_name", "")
    el_team_code  = _team_code(el_team_short)

    mins  = el.get("minutes", 0) or 0
    goals = el.get("goals_scored", 0) or 0
    assts = el.get("assists", 0) or 0
    cs    = el.get("clean_sheets", 0) or 0
    bonus = el.get("bonus", 0) or 0

    played = max(mins // 60, 1)

    fx_list  = team_fixtures.get(el_team_id, [])
    base     = round(form * 0.6 + pts_pg * 0.4, 2)
    proj_tot = _proj_pts(base, fx_list)

    gw_pts: Dict[str, float] = {}
    for i, fx in enumerate(fx_list[:5], 1):
        gw_pts[f"pts_gw_{i}"] = round(base * _fdr_mult(fx.get("difficulty", 3)), 1)
    for i in range(len(fx_list) + 1, 6):
        gw_pts[f"pts_gw_{i}"] = 0.0

    next_fx = fx_list[0] if fx_list else None
    next_opp = None
    fixture_difficulty = 3
    if next_fx:
        side               = "(H)" if next_fx["home"] else "(A)"
        next_opp           = f"{next_fx['opp_name']} {side}"
        fixture_difficulty = next_fx["difficulty"]

    if pos_str in ("GK", "DEF"):
        cs_prob = cs_rates.get(el_team_id, cs / max(played, 1))
    elif pos_str == "MID":
        cs_prob = cs / max(played, 1)
    else:
        cs_prob = 0.0

    ep_next = _expected_points(pos_str, el, played, cs_prob, fixture_difficulty)

    return {
        # ── v1 fields (all preserved) ──────────────────────────────────────
        "player_id":          el.get("id"),
        "id":                 el.get("id"),
        "name":               el.get("web_name", ""),
        "web_name":           el.get("web_name", ""),
        "full_name":          f"{el.get('first_name','')} {el.get('second_name','')}".strip(),
        "team":               el_team_code,
        "team_name":          el_team_name,
        "position":           pos_str,
        "cost":               cost_m,
        "form":               form,
        "selected_by_pct":    ownership,
        "projected_points":   proj_tot,
        "fixture_difficulty": fixture_difficulty,
        "next_opp":           next_opp,
        "appearance_prob":    _appearance_prob(el),   # ← always float, never None
        "ict_index":          float(el.get("ict_index") or 0),
        "photo":              _photo_url(el),
        **gw_pts,
        "total_points":       el.get("total_points", 0),
        "minutes":            mins,
        "goals":              goals,
        "assists":            assts,
        "clean_sheets":       cs,
        "bonus":              bonus,
        "transfers_in_gw":    el.get("transfers_in_event", 0),
        "transfers_out_gw":   el.get("transfers_out_event", 0),
        "news":               el.get("news", ""),
        "fixtures": [
            {"gw": f["gw"], "difficulty": f["difficulty"],
             "home": f["home"], "opp": f["opp_name"]}
            for f in fx_list
        ],
        # ── v2 new metrics ──────────────────────────────────────────────────
        "ep_next":             ep_next,
        "captain_score":       _captain_score(el, ep_next, ownership),
        "fixture_run_score":   _fixture_run_score(fx_list),
        "minutes_security":    _minutes_security(el, played),
        "transfer_momentum":   _transfer_momentum(el),
        "value_score":         _value_score(el, ep_next),
        "ep_this_season":      float(el.get("ep_this") or 0),
        "ep_next_fpl":         float(el.get("ep_next") or 0),
        "influence":           float(el.get("influence") or 0),
        "creativity":          float(el.get("creativity") or 0),
        "threat":              float(el.get("threat") or 0),
        "saves":               el.get("saves", 0),
        "yellow_cards":        el.get("yellow_cards", 0),
        "goals_conceded":      el.get("goals_conceded", 0),
        "in_dreamteam":        bool(el.get("in_dreamteam", False)),
        "event_points":        el.get("event_points", 0),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 1.  PREDICTOR TABLE  (upgraded v2 — fully backward-compatible)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/predictor-table")
async def predictor_table(
    start_gw: int   = Query(1,    ge=1,   le=38),
    num_gws:  int   = Query(5,    ge=1,   le=10),
    max_cost: float = Query(15.5, ge=3.5, le=15.5),
    min_prob: float = Query(0.0,  ge=0.0, le=1.0),   # FIX: was le=100
    team:     str   = Query("ALL"),
    position: str   = Query("ALL"),
    sort_by:  str   = Query("ep_next"),
):
    """
    FPL players shaped for PlayerCard.jsx + new FPL tools.

    Backward-compat: response includes BOTH "rows" (primary) and "players"
    (legacy alias) so existing code does not break.

    min_prob is now 0.0–1.0 fractional. Pass 0.15 to see players owned ≥15%.
    """
    cache_key = f"table:{start_gw}:{num_gws}:{max_cost}:{min_prob}:{team}:{position}:{sort_by}"
    hit = _cget(cache_key, TTL_TABLE)
    if hit:
        return hit

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw = next((ev["id"] for ev in events if ev.get("is_current")), start_gw)
    gw_range   = list(range(start_gw, min(start_gw + num_gws, 39)))

    team_fixtures = _build_team_fixtures(fixtures, team_map, gw_range)
    cs_rates      = _team_cs_rates(elements, team_map)

    pos_filter  = position.upper().strip()
    team_filter = team.strip().upper()
    results: List[dict] = []

    for el in elements:
        pos_str = POSITION_MAP.get(el.get("element_type", 0), "UNK")
        if pos_filter not in ("ALL", "") and pos_str != pos_filter:
            continue

        cost_m    = round((el.get("now_cost") or 0) / 10.0, 1)
        if cost_m > max_cost:
            continue

        ownership = float(el.get("selected_by_percent") or 0)
        # FIX: min_prob is fractional; ownership is 0–100
        if ownership / 100.0 < min_prob:
            continue

        el_team_id    = el.get("team", 0)
        el_team_info  = team_map.get(el_team_id, {})
        el_team_name  = el_team_info.get("name", "")
        el_team_short = el_team_info.get("short_name", "")
        el_team_code  = _team_code(el_team_short)

        if team_filter not in ("ALL", "") and team_filter not in (
            el_team_name.upper(), el_team_short.upper(), el_team_code
        ):
            continue

        results.append(_build_player_row(el, team_map, team_fixtures, cs_rates, gw_range))

    # Sorting
    _sort_fns = {
        "ep_next":           lambda x: -x["ep_next"],
        "projected_points":  lambda x: -x["projected_points"],
        "captain_score":     lambda x: -x["captain_score"],
        "value_score":       lambda x: -x["value_score"],
        "form":              lambda x: -x["form"],
        "total_points":      lambda x: -x["total_points"],
        "fixture_run_score": lambda x: -x["fixture_run_score"],
        "transfer_momentum": lambda x: -x["transfer_momentum"],
        "minutes_security":  lambda x: -x["minutes_security"],
    }
    results.sort(key=_sort_fns.get(sort_by, _sort_fns["ep_next"]))

    payload = {
        "gw_range":   gw_range,
        "current_gw": current_gw,
        "filters": {
            "start_gw": start_gw, "num_gws": num_gws,
            "max_cost": max_cost, "min_prob": min_prob,
            "team": team, "position": position, "sort_by": sort_by,
        },
        "count":   len(results),
        "rows":    results,      # ← primary key (new)
        "players": results,      # ← legacy alias (preserved, do NOT remove)
    }
    _cset(cache_key, payload)
    return payload


# ══════════════════════════════════════════════════════════════════════════════
# 2.  CAPTAINCY TOOL
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/captaincy")
async def captaincy(
    budget:    float = Query(15.5, ge=3.5, le=15.5),
    min_owned: float = Query(0.0,  ge=0.0, le=1.0),
    top_n:     int   = Query(15,   ge=5,   le=30),
):
    """
    Captain picks ranked by captain_score (EP×2 with differential bonus).
    Includes MID and FWD only (GK/DEF rarely captained).
    """
    cache_key = f"captaincy:{budget}:{min_owned}:{top_n}"
    hit = _cget(cache_key, 300)
    if hit:
        return hit

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw    = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    gw_range      = list(range(current_gw, min(current_gw + 5, 39)))
    team_fixtures = _build_team_fixtures(fixtures, team_map, gw_range)
    cs_rates      = _team_cs_rates(elements, team_map)

    picks = []
    for el in elements:
        pos_str   = POSITION_MAP.get(el.get("element_type", 0), "UNK")
        if pos_str not in ("MID", "FWD"):
            continue
        cost_m    = round((el.get("now_cost") or 0) / 10.0, 1)
        ownership = float(el.get("selected_by_percent") or 0)
        if cost_m > budget:
            continue
        if ownership / 100.0 < min_owned:
            continue

        el_team_id = el.get("team", 0)
        fx_list    = team_fixtures.get(el_team_id, [])
        next_fx    = fx_list[0] if fx_list else None
        fdr        = next_fx["difficulty"] if next_fx else 3
        played     = max((el.get("minutes", 0) or 0) // 60, 1)
        cs_prob    = (el.get("clean_sheets", 0) or 0) / max(played, 1)
        ep         = _expected_points(pos_str, el, played, cs_prob, fdr)
        cscore     = _captain_score(el, ep, ownership)

        picks.append({
            "player_id":          el.get("id"),
            "name":               el.get("web_name", ""),
            "team":               _team_code(team_map.get(el_team_id, {}).get("short_name", "")),
            "position":           pos_str,
            "cost":               cost_m,
            "form":               float(el.get("form") or 0),
            "ownership":          ownership,
            "ep_next":            ep,
            "captain_score":      cscore,
            "fixture_run_score":  _fixture_run_score(fx_list),
            "fixture_difficulty": fdr,
            "next_opp": (
                f"{next_fx['opp_name']} {'(H)' if next_fx['home'] else '(A)'}"
                if next_fx else "TBD"
            ),
            "home_fixture":    next_fx.get("home", False) if next_fx else False,
            "differential":    ownership < 15.0,
            "news":            el.get("news", ""),
            "appearance_prob": _appearance_prob(el),
            "minutes_security":_minutes_security(el, played),
            "photo":           _photo_url(el),
        })

    picks.sort(key=lambda p: -p["captain_score"])
    result = {"current_gw": current_gw, "picks": picks[:top_n], "count": min(len(picks), top_n)}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3.  FIXTURE DIFFICULTY HEATMAP
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/fixture-difficulty")
async def fixture_difficulty(num_gws: int = Query(8, ge=3, le=15)):
    """
    Grid of fixture difficulty for the heatmap page.
    Returns teams × GWs where each cell is {difficulty, home, opp}.
    Teams sorted by easiest average FDR (easiest run first).
    """
    cache_key = f"fdr-heatmap:{num_gws}"
    hit = _cget(cache_key, TTL_FIXTURES)
    if hit:
        return hit

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    teams_raw = bootstrap.get("teams", [])
    events    = bootstrap.get("events", [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    gw_range   = list(range(current_gw, min(current_gw + num_gws, 39)))

    grid: Dict[int, Dict[int, dict]] = {tid: {} for tid in team_map}
    for fx in fixtures:
        gw = fx.get("event")
        if gw not in gw_range:
            continue
        htid    = fx.get("team_h")
        atid    = fx.get("team_a")
        h_fdr   = fx.get("team_h_difficulty", 3)
        a_fdr   = fx.get("team_a_difficulty", 3)
        h_short = team_map.get(htid, {}).get("short_name", "")
        a_short = team_map.get(atid, {}).get("short_name", "")
        if htid and htid in grid:
            grid[htid][gw] = {"difficulty": h_fdr, "home": True,
                               "opp": _team_code(a_short), "opp_short": a_short}
        if atid and atid in grid:
            grid[atid][gw] = {"difficulty": a_fdr, "home": False,
                               "opp": _team_code(h_short), "opp_short": h_short}

    teams_out = []
    for tid, t in sorted(team_map.items(), key=lambda kv: kv[1].get("name", "")):
        team_gw_map = grid.get(tid, {})
        fdrs    = [cell["difficulty"] for cell in team_gw_map.values()]
        avg_fdr = round(sum(fdrs) / len(fdrs), 2) if fdrs else 3.0
        teams_out.append({
            "team_id":  tid,
            "name":     t.get("name", ""),
            "short":    t.get("short_name", ""),
            "code":     t.get("code"),
            "avg_fdr":  avg_fdr,
            "fixtures": team_gw_map,
        })

    teams_out.sort(key=lambda t: t["avg_fdr"])
    result = {"gws": gw_range, "current_gw": current_gw, "teams": teams_out}
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 4.  TRANSFER PLANNER
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/transfer-planner")
async def transfer_planner(
    position: str   = Query("ALL"),
    max_cost: float = Query(15.5, ge=3.0, le=15.5),
    num_gws:  int   = Query(5,    ge=1,   le=10),
    top_in:   int   = Query(10,   ge=3,   le=20),
    top_out:  int   = Query(10,   ge=3,   le=20),
):
    """
    Transfer planning:
      targets_in  — best EP/value players to bring in
      targets_out — worst value players to transfer out
      momentum    — biggest movers by transfers_in/out this GW
    """
    cache_key = f"transfer-planner:{position}:{max_cost}:{num_gws}"
    hit = _cget(cache_key, 300)
    if hit:
        return hit

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw    = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    gw_range      = list(range(current_gw, min(current_gw + num_gws, 39)))
    team_fixtures = _build_team_fixtures(fixtures, team_map, gw_range)
    cs_rates      = _team_cs_rates(elements, team_map)

    pos_filter = position.upper().strip()
    rows: List[dict] = []
    for el in elements:
        pos_str = POSITION_MAP.get(el.get("element_type", 0), "UNK")
        if pos_filter not in ("ALL", "") and pos_str != pos_filter:
            continue
        if round((el.get("now_cost") or 0) / 10.0, 1) > max_cost:
            continue
        rows.append(_build_player_row(el, team_map, team_fixtures, cs_rates, gw_range))

    targets_in  = sorted(rows, key=lambda r: -r["ep_next"])[:top_in]
    targets_out = sorted(rows, key=lambda r:  r["value_score"])[:top_out]
    momentum    = sorted(rows, key=lambda r: -abs(r["transfer_momentum"]))[:10]

    result = {
        "current_gw": current_gw, "gw_range": gw_range,
        "targets_in": targets_in, "targets_out": targets_out,
        "momentum":   momentum,
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 5.  DIFFERENTIAL FINDER
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/differentials")
async def differentials(
    max_owned: float = Query(0.15, ge=0.0, le=0.50),
    min_ep:    float = Query(3.0,  ge=0.0, le=20.0),
    position:  str   = Query("ALL"),
    max_cost:  float = Query(15.5, ge=3.0, le=15.5),
    top_n:     int   = Query(15,   ge=5,   le=30),
):
    """
    Under-owned players with high EP, sorted by captain_score.
    max_owned is fractional: 0.15 = players owned by < 15%.
    """
    cache_key = f"differentials:{max_owned}:{min_ep}:{position}:{max_cost}"
    hit = _cget(cache_key, 300)
    if hit:
        return hit

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw    = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    gw_range      = list(range(current_gw, min(current_gw + 5, 39)))
    team_fixtures = _build_team_fixtures(fixtures, team_map, gw_range)
    cs_rates      = _team_cs_rates(elements, team_map)

    pos_filter = position.upper().strip()
    diffs: List[dict] = []
    for el in elements:
        pos_str   = POSITION_MAP.get(el.get("element_type", 0), "UNK")
        if pos_filter not in ("ALL", "") and pos_str != pos_filter:
            continue
        cost_m    = round((el.get("now_cost") or 0) / 10.0, 1)
        ownership = float(el.get("selected_by_percent") or 0)
        if cost_m > max_cost:
            continue
        if ownership / 100.0 > max_owned:
            continue
        row = _build_player_row(el, team_map, team_fixtures, cs_rates, gw_range)
        if row["ep_next"] < min_ep:
            continue
        diffs.append(row)

    diffs.sort(key=lambda r: -r["captain_score"])
    result = {
        "current_gw": current_gw, "count": min(len(diffs), top_n),
        "differentials": diffs[:top_n],
        "filters": {"max_owned": max_owned, "min_ep": min_ep,
                    "position": position,   "max_cost": max_cost},
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 6.  BEST XI OPTIMISER
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/best-xi")
async def best_xi(
    budget:    float = Query(DEFAULT_BUDGET, ge=50.0, le=120.0),
    formation: str   = Query("442"),
):
    """
    Highest-EP starting XI under budget using greedy position-first selection.
    FPL rule: max 3 players from same team.
    """
    cache_key = f"best-xi:{budget}:{formation}"
    hit = _cget(cache_key, 300)
    if hit:
        return hit

    slots = FORMATIONS.get(formation, FORMATIONS["442"])

    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    current_gw    = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    gw_range      = list(range(current_gw, min(current_gw + 5, 39)))
    team_fixtures = _build_team_fixtures(fixtures, team_map, gw_range)
    cs_rates      = _team_cs_rates(elements, team_map)

    by_pos: Dict[str, List[dict]] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for el in elements:
        pos_str = POSITION_MAP.get(el.get("element_type", 0), "UNK")
        if pos_str not in by_pos:
            continue
        if (el.get("chance_of_playing_next_round") or 100) < 25:
            continue
        by_pos[pos_str].append(
            _build_player_row(el, team_map, team_fixtures, cs_rates, gw_range)
        )

    for pos in by_pos:
        by_pos[pos].sort(key=lambda r: -r["ep_next"])

    selected: List[dict] = []
    spent = 0.0
    team_counts: Dict[str, int] = {}
    pos_order = ["GK", "DEF", "MID", "FWD"]

    for pos in pos_order:
        need  = slots[pos]
        pool  = by_pos[pos]
        chosen = 0
        for player in pool:
            if chosen >= need:
                break
            tc = team_counts.get(player["team"], 0)
            if tc >= 3:
                continue
            unfilled_after = sum(slots[p] for p in pos_order) - len(selected) - 1
            reserve = unfilled_after * 3.5
            if spent + player["cost"] + reserve > budget:
                continue
            selected.append(player)
            spent += player["cost"]
            team_counts[player["team"]] = tc + 1
            chosen += 1

    result = {
        "formation": formation, "slots": slots, "budget": budget,
        "total_cost":       round(spent, 1),
        "budget_remaining": round(budget - spent, 1),
        "total_ep":         round(sum(p["ep_next"] for p in selected), 2),
        "xi":               selected,
        "current_gw":       current_gw,
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 7.  PLAYER EP CHART DATA
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/player-ep/{element_id}")
async def player_ep_chart(element_id: int):
    """
    Per-GW EP history + 5-GW projection for Expected Points charts.
    """
    cache_key = f"player-ep:{element_id}"
    hit = _cget(cache_key, TTL_ELEMENT)
    if hit:
        return hit

    bootstrap, summary = await asyncio.gather(
        _bootstrap(), _element_summary_cached(element_id)
    )
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])
    team_map  = {t["id"]: t for t in teams_raw}

    el = next((e for e in elements if e.get("id") == element_id), None)
    if el is None:
        raise HTTPException(404, f"Player {element_id} not found")

    pos_str    = POSITION_MAP.get(el.get("element_type", 0), "MID")
    team_id    = el.get("team", 0)
    team_info  = team_map.get(team_id, {})
    current_gw = next((ev["id"] for ev in events if ev.get("is_current")), 1)
    pts        = POS_SCORING.get(pos_str, POS_SCORING["MID"])

    history_raw = summary.get("history", [])
    history_out = []
    for gw_row in history_raw:
        gw     = gw_row.get("round") or gw_row.get("event", 0)
        mins   = gw_row.get("minutes", 0) or 0
        g      = gw_row.get("goals_scored", 0) or 0
        a      = gw_row.get("assists", 0) or 0
        cs     = gw_row.get("clean_sheets", 0) or 0
        bon    = gw_row.get("bonus", 0) or 0
        actual = gw_row.get("total_points", 0) or 0
        ep_impl = round(
            g * pts["goal"] + a * pts["assist"] + cs * pts["cs"] + bon
            + (2 if mins >= 60 else 1 if mins > 0 else 0),
            2,
        )
        history_out.append({
            "gw": gw, "points": actual, "ep_implied": ep_impl,
            "minutes": mins, "goals": g, "assists": a,
            "clean_sheets": cs, "bonus": bon,
        })

    future_raw = summary.get("fixtures", [])
    played     = max((el.get("minutes", 0) or 0) // 60, 1)
    cs_rates   = _team_cs_rates(elements, team_map)
    cs_prob    = cs_rates.get(
        team_id, (el.get("clean_sheets", 0) or 0) / max(played, 1)
    )

    projection_out = []
    for fx in future_raw[:5]:
        gw    = fx.get("event", 0)
        fdr   = fx.get("difficulty", 3)
        is_h  = fx.get("is_home", True)
        opp_id= fx.get("team_a") if is_h else fx.get("team_h")
        opp_s = team_map.get(opp_id, {}).get("short_name", "TBD") if opp_id else "TBD"
        ep    = _expected_points(pos_str, el, played, cs_prob, fdr)
        projection_out.append({
            "gw": gw, "ep_projected": ep, "fdr": fdr,
            "home": is_h, "opp": _team_code(opp_s),
        })

    season_ep     = round(sum(h["ep_implied"] for h in history_out), 2)
    n_gws         = max(len(history_out), 1)
    season_avg_ep = round(season_ep / n_gws, 3)
    form_ep       = round(
        sum(h["ep_implied"] for h in history_out[-5:]) / min(len(history_out), 5), 3
    ) if history_out else 0.0

    result = {
        "player_id":    element_id,
        "name":         el.get("web_name", ""),
        "full_name":    f"{el.get('first_name','')} {el.get('second_name','')}".strip(),
        "position":     pos_str,
        "team":         _team_code(team_info.get("short_name", "")),
        "team_name":    team_info.get("name", ""),
        "cost":         round((el.get("now_cost") or 0) / 10.0, 1),
        "current_gw":   current_gw,
        "history":      history_out,
        "projection":   projection_out,
        "season_ep":    season_ep,
        "season_avg_ep":season_avg_ep,
        "form_ep":      form_ep,
        "ep_next":      projection_out[0]["ep_projected"] if projection_out else 0.0,
        "total_points": el.get("total_points", 0),
        "form":         float(el.get("form") or 0),
    }
    _cset(cache_key, result)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# STANDARD PROXY ENDPOINTS  (all unchanged from v1)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/bootstrap")
async def fpl_bootstrap():
    return await _bootstrap()


@router.get("/fixtures")
async def fpl_fixtures_endpoint():
    return await _fixtures_raw()


@router.get("/element-summary/{element_id}")
async def fpl_element_summary(element_id: int):
    return await _element_summary_cached(element_id)


@router.get("/gameweek/{gw}/live")
async def fpl_gw_live(gw: int):
    key = f"live:{gw}"
    hit = _cget(key, TTL_LIVE)
    if hit:
        return hit
    data = await _fpl(f"/event/{gw}/live/")
    _cset(key, data)
    return data


@router.get("/fixtures/team/{team_id}")
async def fpl_team_fixtures(team_id: int):
    fixtures = await _fixtures_raw()
    return [f for f in fixtures if f.get("team_h") == team_id or f.get("team_a") == team_id]


# ══════════════════════════════════════════════════════════════════════════════
# ALIAS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

# /captain-picks → alias for /captaincy
@router.get("/captain-picks")
async def captain_picks_alias(
    position:  str   = Query("ALL"),
    max_cost:  float = Query(15.5, ge=3.5, le=15.5),
    min_prob:  float = Query(0.5,  ge=0.0, le=1.0),
    top_n:     int   = Query(10,   ge=1,   le=30),
):
    from fastapi import Request
    return await captaincy(position=position, max_cost=max_cost,
                           min_prob=min_prob, top_n=top_n)


# /transfer-trends → alias for /transfer-planner
@router.get("/transfer-trends")
async def transfer_trends_alias(
    position:  str   = Query("ALL"),
    max_cost:  float = Query(15.5, ge=3.5, le=15.5),
    num_gws:   int   = Query(5,    ge=1,   le=10),
    top_in:    int   = Query(10,   ge=1,   le=25),
    top_out:   int   = Query(10,   ge=1,   le=25),
):
    return await transfer_planner(position=position, max_cost=max_cost,
                                  num_gws=num_gws, top_in=top_in, top_out=top_out)


# ══════════════════════════════════════════════════════════════════════════════
# BEST TEAM  — GET /api/fpl/best-team
#
# Selects the top 15 players from the predictor table by projected_points,
# enforcing FPL squad rules (max 3 per team, position counts).
# Returns squad + suggested starting XI + bench + metadata.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/best-team")
async def best_team(
    budget:    float = Query(100.0, ge=50.0, le=120.0),
    formation: str   = Query("auto"),
):
    VALID_FORMATIONS = {
        "433": {"DEF":4,"MID":3,"FWD":3},
        "442": {"DEF":4,"MID":4,"FWD":2},
        "451": {"DEF":4,"MID":5,"FWD":1},
        "343": {"DEF":3,"MID":4,"FWD":3},
        "352": {"DEF":3,"MID":5,"FWD":2},
        "532": {"DEF":5,"MID":3,"FWD":2},
        "541": {"DEF":5,"MID":4,"FWD":1},
    }

    cache_key = f"fpl:best_team:{budget}:{formation}"
    hit = _fpl_cache.get(cache_key)
    if hit:
        return hit

    # Pull full predictor table
    bootstrap = await _fpl_bootstrap()
    elements  = bootstrap.get("elements", [])
    teams_raw = bootstrap.get("teams",    [])
    events    = bootstrap.get("events",   [])

    # Current gameweek
    current_gw = next(
        (e["id"] for e in events if e.get("is_next") or e.get("is_current")),
        next((e["id"] for e in events if not e.get("finished")), 30)
    )

    # Build team map id→short_name
    team_map = {t["id"]: t.get("short_name", t.get("name", "?")) for t in teams_raw}

    POSITION_MAP = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
    POS_LIMITS   = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}

    # Build player rows (same logic as predictor-table but simplified)
    players = []
    for el in elements:
        if el.get("status") == "u":  # unavailable / retired
            continue
        pos  = POSITION_MAP.get(el.get("element_type"), "MID")
        cost = round(el.get("now_cost", 0) / 10, 1)
        if cost > budget:
            continue

        ep_raw   = float(el.get("ep_next") or el.get("ep_this") or 0)
        form_raw = float(el.get("form") or 0)
        pts_sf   = int(el.get("total_points") or 0)
        played   = max(int(el.get("minutes") or 0) // 70, 1)
        ppg      = pts_sf / played if played else 0

        projected = ep_raw if ep_raw > 0 else max(form_raw, ppg)

        players.append({
            "player_id":        el.get("id"),
            "name":             el.get("web_name", ""),
            "team":             team_map.get(el.get("team"), "?"),
            "team_id":          el.get("team"),
            "position":         pos,
            "cost":             cost,
            "projected_points": round(projected, 2),
            "form":             form_raw,
            "points_so_far":    pts_sf,
            "selected_by_pct":  float(el.get("selected_by_percent") or 0),
            "photo":            f"https://resources.premierleague.com/premierleague/photos/players/110x140/p{el.get('code','0')}.png",
            "news":             el.get("news", ""),
            "chance_of_playing_next_round": el.get("chance_of_playing_next_round"),
        })

    if not players:
        raise HTTPException(503, "FPL bootstrap data unavailable")

    # ── Squad selection: greedy, enforce FPL rules ────────────────────────────
    players_sorted = sorted(players, key=lambda p: -p["projected_points"])

    squad   = []
    pos_counts  = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
    team_counts: dict = {}
    total_cost  = 0.0

    for p in players_sorted:
        if len(squad) >= 15:
            break
        pos = p["position"]
        tid = p["team_id"]
        cost = p["cost"]

        if pos_counts[pos] >= POS_LIMITS[pos]:
            continue
        if team_counts.get(tid, 0) >= 3:
            continue
        if total_cost + cost > budget:
            continue

        squad.append(p)
        pos_counts[pos]      += 1
        team_counts[tid]      = team_counts.get(tid, 0) + 1
        total_cost           += cost

    # Pad with cheapest players if squad < 15
    if len(squad) < 15:
        used = {p["player_id"] for p in squad}
        for p in reversed(players_sorted):
            if len(squad) >= 15:
                break
            if p["player_id"] in used:
                continue
            pos = p["position"]
            if pos_counts[pos] >= POS_LIMITS[pos]:
                continue
            if team_counts.get(p["team_id"], 0) >= 3:
                continue
            squad.append(p)
            pos_counts[pos]     += 1
            team_counts[p["team_id"]] = team_counts.get(p["team_id"], 0) + 1
            total_cost          += p["cost"]
            used.add(p["player_id"])

    # ── Starting XI selection ─────────────────────────────────────────────────
    by_pos = {"GK":[], "DEF":[], "MID":[], "FWD":[]}
    for p in sorted(squad, key=lambda x: -x["projected_points"]):
        by_pos[p["position"]].append(p)

    # Auto formation or specified
    AUTO_FORMATIONS = [
        {"name":"4-3-3","DEF":4,"MID":3,"FWD":3},
        {"name":"4-4-2","DEF":4,"MID":4,"FWD":2},
        {"name":"4-5-1","DEF":4,"MID":5,"FWD":1},
        {"name":"3-5-2","DEF":3,"MID":5,"FWD":2},
        {"name":"5-3-2","DEF":5,"MID":3,"FWD":2},
    ]

    if formation in VALID_FORMATIONS:
        fmt_cfg = VALID_FORMATIONS[formation]
        chosen_name = f"{fmt_cfg['DEF']}-{fmt_cfg['MID']}-{fmt_cfg['FWD']}"
        chosen_fmt  = fmt_cfg
    else:
        # Try each formation and pick the one with highest XI projected total
        best_fmt   = AUTO_FORMATIONS[0]
        best_total = -1
        for f in AUTO_FORMATIONS:
            if len(by_pos["DEF"]) < f["DEF"] or len(by_pos["MID"]) < f["MID"] or len(by_pos["FWD"]) < f["FWD"]:
                continue
            total = (
                sum(p["projected_points"] for p in by_pos["GK"][:1])
                + sum(p["projected_points"] for p in by_pos["DEF"][:f["DEF"]])
                + sum(p["projected_points"] for p in by_pos["MID"][:f["MID"]])
                + sum(p["projected_points"] for p in by_pos["FWD"][:f["FWD"]])
            )
            if total > best_total:
                best_total = total
                best_fmt   = f
        chosen_name = best_fmt["name"]
        chosen_fmt  = {"DEF": best_fmt["DEF"], "MID": best_fmt["MID"], "FWD": best_fmt["FWD"]}

    xi_ids = set()
    xi     = []
    gk = by_pos["GK"][:1]
    xi.extend(gk); [xi_ids.add(p["player_id"]) for p in gk]

    for pos, count in [("DEF", chosen_fmt["DEF"]), ("MID", chosen_fmt["MID"]), ("FWD", chosen_fmt["FWD"])]:
        chosen = by_pos[pos][:count]
        xi.extend(chosen); [xi_ids.add(p["player_id"]) for p in chosen]

    bench = [p for p in squad if p["player_id"] not in xi_ids]

    # Captain = highest projected in XI
    xi_sorted = sorted(xi, key=lambda p: -p["projected_points"])
    captain    = xi_sorted[0]["player_id"] if xi_sorted else None
    vice_cap   = xi_sorted[1]["player_id"] if len(xi_sorted) > 1 else None

    total_xi_pts = round(sum(p["projected_points"] for p in xi), 1)

    result = {
        "squad":          squad,
        "xi":             xi,
        "bench":          bench,
        "formation":      chosen_name,
        "captain_id":     captain,
        "vice_captain_id":vice_cap,
        "total_cost":     round(total_cost, 1),
        "budget_remaining": round(budget - total_cost, 1),
        "xi_projected_points": total_xi_pts,
        "current_gw":     current_gw,
        "budget":         budget,
        "players_count":  len(squad),
    }
    _fpl_cache.set(cache_key, result)
    return result