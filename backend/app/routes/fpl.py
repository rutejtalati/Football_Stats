# backend/app/routes/fpl.py
# FPL proxy + predictor-table engine.
# All data sourced from the official FPL API — no external keys needed.

import asyncio
import math
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/fpl", tags=["fpl"])

FPL_BASE = "https://fantasy.premierleague.com/api"
HEADERS  = {"User-Agent": "StatinSite/4.0"}

# ── In-memory cache ────────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_ctimes: Dict[str, float] = {}
TTL_BOOTSTRAP = 3600   # 1 hour
TTL_FIXTURES  = 1800   # 30 min
TTL_LIVE      = 120    # 2 min


def _cget(key: str, ttl: float) -> Optional[Any]:
    if key in _cache and time.monotonic() - _ctimes.get(key, 0) < ttl:
        return _cache[key]
    return None


def _cset(key: str, val: Any) -> None:
    _cache[key] = val
    _ctimes[key] = time.monotonic()


# ── FPL HTTP helper ────────────────────────────────────────────────────────
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


# ── Cached data fetchers ───────────────────────────────────────────────────
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


# ── Position map ───────────────────────────────────────────────────────────
POSITION_MAP = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

# FDR 1 = easiest (1.25x), FDR 5 = hardest (0.60x)
FDR_MULT = {1: 1.25, 2: 1.10, 3: 0.95, 4: 0.78, 5: 0.60}


def _fdr_mult(fdr: int) -> float:
    return FDR_MULT.get(int(fdr), 0.95)


def _proj_pts(base_pts_pg: float, fixtures: List[dict]) -> float:
    """Project total points over upcoming fixtures, weighted by difficulty."""
    total = 0.0
    for fx in fixtures:
        total += base_pts_pg * _fdr_mult(fx.get("difficulty", 3))
    return round(total, 1)


# ── Predictor table ────────────────────────────────────────────────────────
@router.get("/predictor-table")
async def predictor_table(
    start_gw: int   = Query(1,    ge=1,   le=38),
    num_gws:  int   = Query(5,    ge=1,   le=10),
    max_cost: float = Query(15.5, ge=3.5, le=15.5),
    min_prob: float = Query(0.0,  ge=0.0, le=100.0),
    team:     str   = Query("ALL"),
    position: str   = Query("ALL"),
):
    """
    FPL predictor table — ranked players with projected points over upcoming GWs.
    Filters: cost, ownership %, team, position.
    """
    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())

    elements  = bootstrap.get("elements",  [])
    teams_raw = bootstrap.get("teams",     [])
    events    = bootstrap.get("events",    [])

    team_lookup: Dict[int, dict] = {t["id"]: t for t in teams_raw}

    # Resolve current GW
    current_gw = start_gw
    for ev in events:
        if ev.get("is_current"):
            current_gw = ev["id"]
            break

    gw_range = list(range(start_gw, min(start_gw + num_gws, 39)))

    # Build fixture index per team for the requested GW window
    team_fixtures: Dict[int, List[dict]] = {}
    for fx in fixtures:
        gw = fx.get("event")
        if gw not in gw_range:
            continue
        htid  = fx.get("team_h")
        atid  = fx.get("team_a")
        h_fdr = fx.get("team_h_difficulty", 3)
        a_fdr = fx.get("team_a_difficulty", 3)
        if htid:
            team_fixtures.setdefault(htid, []).append({"gw": gw, "difficulty": h_fdr, "home": True})
        if atid:
            team_fixtures.setdefault(atid, []).append({"gw": gw, "difficulty": a_fdr, "home": False})

    pos_filter  = position.upper().strip()
    team_filter = team.strip().upper()

    results: List[dict] = []

    for el in elements:
        pos_id  = el.get("element_type", 0)
        pos_str = POSITION_MAP.get(pos_id, "UNK")

        # Position filter
        if pos_filter not in ("ALL", "") and pos_str != pos_filter:
            continue

        # Cost filter
        cost_m = round((el.get("now_cost", 0)) / 10, 1)
        if cost_m > max_cost:
            continue

        # Ownership filter
        ownership = float(el.get("selected_by_percent", 0) or 0)
        if ownership < min_prob:
            continue

        # Team filter
        el_team_id    = el.get("team", 0)
        el_team_info  = team_lookup.get(el_team_id, {})
        el_team_name  = el_team_info.get("name", "")
        el_team_short = el_team_info.get("short_name", "")
        if team_filter not in ("ALL", "") and team_filter not in (
            el_team_name.upper(), el_team_short.upper()
        ):
            continue

        # Projected points
        form       = float(el.get("form", 0) or 0)
        pts_pg     = float(el.get("points_per_game", 0) or 0)
        base_ppg   = round(form * 0.6 + pts_pg * 0.4, 2)
        fx_list    = team_fixtures.get(el_team_id, [])
        proj       = _proj_pts(base_ppg, fx_list)

        gw_display = [
            {"gw": f["gw"], "difficulty": f["difficulty"], "home": f["home"]}
            for f in sorted(fx_list, key=lambda x: x["gw"])
        ]

        photo_raw = el.get("photo", "") or ""
        photo_id  = photo_raw.replace(".jpg", "")

        results.append({
            "id":               el.get("id"),
            "name":             el.get("web_name", ""),
            "full_name":        f"{el.get('first_name','')} {el.get('second_name','')}".strip(),
            "team":             el_team_name,
            "team_short":       el_team_short,
            "team_id":          el_team_id,
            "position":         pos_str,
            "cost":             cost_m,
            "form":             form,
            "points_per_game":  pts_pg,
            "total_points":     el.get("total_points", 0),
            "ownership":        ownership,
            "projected_pts":    proj,
            "fixtures":         gw_display,
            "photo":            f"https://resources.premierleague.com/premierleague/photos/players/110x140/p{photo_id}.png",
            "minutes":          el.get("minutes", 0),
            "goals":            el.get("goals_scored", 0),
            "assists":          el.get("assists", 0),
            "clean_sheets":     el.get("clean_sheets", 0),
            "bonus":            el.get("bonus", 0),
            "ict_index":        float(el.get("ict_index", 0) or 0),
            "transfers_in_gw":  el.get("transfers_in_event", 0),
            "transfers_out_gw": el.get("transfers_out_event", 0),
            "chance_playing":   el.get("chance_of_playing_next_round"),
            "news":             el.get("news", ""),
        })

    results.sort(key=lambda x: (-x["projected_pts"], -x["total_points"]))

    return {
        "gw_range":   gw_range,
        "current_gw": current_gw,
        "filters": {
            "start_gw": start_gw,
            "num_gws":  num_gws,
            "max_cost": max_cost,
            "min_prob": min_prob,
            "team":     team,
            "position": position,
        },
        "count":   len(results),
        "players": results,
    }


# ── Standard FPL proxy endpoints ──────────────────────────────────────────

@router.get("/bootstrap")
async def fpl_bootstrap():
    return await _bootstrap()


@router.get("/fixtures")
async def fpl_fixtures_endpoint():
    return await _fixtures_raw()


@router.get("/element-summary/{element_id}")
async def fpl_element_summary(element_id: int):
    key = f"element:{element_id}"
    hit = _cget(key, TTL_BOOTSTRAP)
    if hit:
        return hit
    data = await _fpl(f"/element-summary/{element_id}/")
    _cset(key, data)
    return data


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