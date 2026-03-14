# backend/app/routes/fpl.py
# FPL proxy + predictor-table.
# predictor-table returns fields shaped for PlayerCard.jsx.

import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/fpl", tags=["fpl"])

FPL_BASE = "https://fantasy.premierleague.com/api"
HEADERS  = {"User-Agent": "StatinSite/4.0"}

# ── Cache ──────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_ctimes: Dict[str, float] = {}
TTL_BOOTSTRAP = 3600
TTL_FIXTURES  = 1800
TTL_LIVE      = 120


def _cget(key: str, ttl: float) -> Optional[Any]:
    if key in _cache and time.monotonic() - _ctimes.get(key, 0) < ttl:
        return _cache[key]
    return None


def _cset(key: str, val: Any) -> None:
    _cache[key] = val
    _ctimes[key] = time.monotonic()


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


async def _bootstrap() -> dict:
    hit = _cget("bootstrap", TTL_BOOTSTRAP)
    if hit: return hit
    data = await _fpl("/bootstrap-static/")
    _cset("bootstrap", data)
    return data


async def _fixtures_raw() -> list:
    hit = _cget("fixtures", TTL_FIXTURES)
    if hit: return hit
    data = await _fpl("/fixtures/")
    _cset("fixtures", data)
    return data


# ── FPL team short name → PlayerCard 3-letter code ────────────
# Maps FPL team short names to the codes used in PlayerCard's SHIRT_IDS / TEAM_COLORS
SHORT_TO_CODE: Dict[str, str] = {
    "ARS": "ARS", "AVL": "AVL", "BOU": "BOU", "BRE": "BRE", "BHA": "BHA",
    "CHE": "CHE", "CRY": "CRY", "EVE": "EVE", "FUL": "FUL", "IPS": "IPS",
    "LEI": "LEI", "LIV": "LIV", "MCI": "MCI", "MUN": "MUN", "NEW": "NEW",
    "NFO": "NFO", "SOU": "SOU", "TOT": "TOT", "WHU": "WHU", "WOL": "WOL",
    # Common alternate abbreviations
    "MAN UTD": "MUN", "MAN CITY": "MCI", "SPURS": "TOT",
    "FOREST": "NFO", "BRIGHTON": "BHA", "WOLVES": "WOL",
    "BRENTFORD": "BRE", "IPSWICH": "IPS", "LEICESTER": "LEI",
    "SOUTHAMPTON": "SOU",
}

POSITION_MAP = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

# FDR multiplier for projected points
FDR_MULT = {1: 1.25, 2: 1.10, 3: 0.95, 4: 0.78, 5: 0.60}


def _fdr_mult(fdr: int) -> float:
    return FDR_MULT.get(int(fdr), 0.95)


def _proj_pts(base_ppg: float, fx_list: list) -> float:
    return round(sum(base_ppg * _fdr_mult(f.get("difficulty", 3)) for f in fx_list), 1)


def _team_code(short_name: str) -> str:
    s = (short_name or "").upper().strip()
    return SHORT_TO_CODE.get(s, s[:3] if len(s) >= 3 else s)


# ── Predictor table ────────────────────────────────────────────
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
    Returns FPL players shaped for PlayerCard.jsx.

    Key fields returned per player:
      - projected_points   (float)  — used by ArcMeter
      - form               (float)  — form wave colour
      - cost               (str)    — e.g. "9.5"
      - selected_by_pct    (float)  — ownership %
      - appearance_prob    (float)  — 0-1 fitness probability
      - ict_index          (float)
      - fixture_difficulty (int)    — 1-5 for next fixture
      - next_opp           (str)    — e.g. "MCI (H)"
      - team               (str)    — 3-letter code e.g. "ARS"
      - position           (str)    — "GK"/"DEF"/"MID"/"FWD"
      - pts_gw_1..5        (float)  — per-GW projections for FormWave
    """
    bootstrap, fixtures = await asyncio.gather(_bootstrap(), _fixtures_raw())

    elements  = bootstrap.get("elements",  [])
    teams_raw = bootstrap.get("teams",     [])
    events    = bootstrap.get("events",    [])

    # id → team dict
    team_map: Dict[int, dict] = {t["id"]: t for t in teams_raw}

    # Resolve current GW
    current_gw = start_gw
    for ev in events:
        if ev.get("is_current"):
            current_gw = ev["id"]
            break

    gw_range = list(range(start_gw, min(start_gw + num_gws, 39)))

    # team_id → list of {gw, difficulty, home, opp_name}
    team_fixtures: Dict[int, List[dict]] = {}
    for fx in fixtures:
        gw = fx.get("event")
        if gw not in gw_range:
            continue
        htid  = fx.get("team_h")
        atid  = fx.get("team_a")
        h_fdr = fx.get("team_h_difficulty", 3)
        a_fdr = fx.get("team_a_difficulty", 3)
        h_short = team_map.get(htid, {}).get("short_name", "")
        a_short = team_map.get(atid, {}).get("short_name", "")
        if htid:
            team_fixtures.setdefault(htid, []).append({
                "gw": gw, "difficulty": h_fdr, "home": True,
                "opp_name": _team_code(a_short),
            })
        if atid:
            team_fixtures.setdefault(atid, []).append({
                "gw": gw, "difficulty": a_fdr, "home": False,
                "opp_name": _team_code(h_short),
            })

    pos_filter  = position.upper().strip()
    team_filter = team.strip().upper()

    results: List[dict] = []

    for el in elements:
        pos_id  = el.get("element_type", 0)
        pos_str = POSITION_MAP.get(pos_id, "UNK")

        if pos_filter not in ("ALL", "") and pos_str != pos_filter:
            continue

        cost_raw = el.get("now_cost", 0)
        cost_m   = round(cost_raw / 10, 1)
        if cost_m > max_cost:
            continue

        ownership = float(el.get("selected_by_percent", 0) or 0)
        if ownership < min_prob:
            continue

        el_team_id   = el.get("team", 0)
        el_team_info = team_map.get(el_team_id, {})
        el_team_name  = el_team_info.get("name", "")
        el_team_short = el_team_info.get("short_name", "")
        el_team_code  = _team_code(el_team_short)

        if team_filter not in ("ALL", "") and team_filter not in (
            el_team_name.upper(), el_team_short.upper(), el_team_code
        ):
            continue

        form    = float(el.get("form", 0) or 0)
        pts_pg  = float(el.get("points_per_game", 0) or 0)
        base    = round(form * 0.6 + pts_pg * 0.4, 2)

        fx_list  = sorted(team_fixtures.get(el_team_id, []), key=lambda x: x["gw"])
        proj_tot = _proj_pts(base, fx_list)

        # Per-GW projections for FormWave (pts_gw_1 = most recent GW in window)
        gw_pts: Dict[str, float] = {}
        for i, fx in enumerate(fx_list[:5], 1):
            gw_pts[f"pts_gw_{i}"] = round(base * _fdr_mult(fx.get("difficulty", 3)), 1)
        # Fill remaining slots with 0
        for i in range(len(fx_list) + 1, 6):
            gw_pts[f"pts_gw_{i}"] = 0.0

        # Next fixture info for the fixture chip on the card
        next_fx = fx_list[0] if fx_list else None
        next_opp = None
        fixture_difficulty = 3
        if next_fx:
            side = "(H)" if next_fx["home"] else "(A)"
            next_opp = f"{next_fx['opp_name']} {side}"
            fixture_difficulty = next_fx["difficulty"]

        # Appearance probability: use chance_of_playing or default 1.0
        chance = el.get("chance_of_playing_next_round")
        appearance_prob = (chance / 100.0) if chance is not None else 1.0

        photo_raw = el.get("photo", "") or ""
        photo_id  = photo_raw.replace(".jpg", "")

        results.append({
            # ── Fields consumed by PlayerCard.jsx ──
            "player_id":          el.get("id"),
            "id":                 el.get("id"),
            "name":               el.get("web_name", ""),
            "web_name":           el.get("web_name", ""),
            "full_name":          f"{el.get('first_name','')} {el.get('second_name','')}".strip(),
            "team":               el_team_code,         # 3-letter code for shirt
            "team_name":          el_team_name,
            "position":           pos_str,
            "cost":               cost_m,
            "form":               form,
            "selected_by_pct":    ownership,            # % owned
            "projected_points":   proj_tot,             # ArcMeter value
            "fixture_difficulty": fixture_difficulty,   # 1-5
            "next_opp":           next_opp,             # "ARS (H)"
            "appearance_prob":    appearance_prob,       # 0-1
            "ict_index":          float(el.get("ict_index", 0) or 0),
            "photo": f"https://resources.premierleague.com/premierleague/photos/players/110x140/p{photo_id}.png",
            # ── Per-GW for FormWave ──
            **gw_pts,
            # ── Extra context ──
            "total_points":       el.get("total_points", 0),
            "minutes":            el.get("minutes", 0),
            "goals":              el.get("goals_scored", 0),
            "assists":            el.get("assists", 0),
            "clean_sheets":       el.get("clean_sheets", 0),
            "bonus":              el.get("bonus", 0),
            "transfers_in_gw":    el.get("transfers_in_event", 0),
            "transfers_out_gw":   el.get("transfers_out_event", 0),
            "news":               el.get("news", ""),
            "fixtures":           [
                {"gw": f["gw"], "difficulty": f["difficulty"],
                 "home": f["home"], "opp": f["opp_name"]}
                for f in fx_list
            ],
        })

    results.sort(key=lambda x: (-x["projected_points"], -x["total_points"]))

    return {
        "gw_range":   gw_range,
        "current_gw": current_gw,
        "filters": {
            "start_gw": start_gw, "num_gws": num_gws,
            "max_cost": max_cost, "min_prob": min_prob,
            "team": team, "position": position,
        },
        "count":   len(results),
        "players": results,
    }


# ── Standard FPL proxy endpoints ──────────────────────────────

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
    if hit: return hit
    data = await _fpl(f"/element-summary/{element_id}/")
    _cset(key, data)
    return data


@router.get("/gameweek/{gw}/live")
async def fpl_gw_live(gw: int):
    key = f"live:{gw}"
    hit = _cget(key, TTL_LIVE)
    if hit: return hit
    data = await _fpl(f"/event/{gw}/live/")
    _cset(key, data)
    return data


@router.get("/fixtures/team/{team_id}")
async def fpl_team_fixtures(team_id: int):
    fixtures = await _fixtures_raw()
    return [f for f in fixtures if f.get("team_h") == team_id or f.get("team_a") == team_id]