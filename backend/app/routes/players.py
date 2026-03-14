# backend/app/routes/players.py
# Full player + team stats database across Europe's top 5 leagues.
# Cached in-memory, refreshed every 24h on first request.

import asyncio
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/players", tags=["players"])

API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS: Dict[str, int] = {
    "epl": 39, "laliga": 140, "seriea": 135, "bundesliga": 78, "ligue1": 61,
}
LEAGUE_NAMES: Dict[int, str] = {
    39: "Premier League", 140: "La Liga", 135: "Serie A", 78: "Bundesliga", 61: "Ligue 1",
}
LEAGUE_SLUGS: Dict[int, str] = {
    39: "epl", 140: "laliga", 135: "seriea", 78: "bundesliga", 61: "ligue1",
}

# ── In-memory cache ───────────────────────────────────────────
_players:     List[dict] = []
_players_map: Dict[int, dict] = {}
_teams:       List[dict] = []
_teams_map:   Dict[int, dict] = {}
_built_at:    float = 0.0
TTL = 86400  # 24 hours


def _headers():
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}


async def _api(path: str, params: dict) -> Any:
    try:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.get(f"{API_BASE}/{path.lstrip('/')}",
                            headers=_headers(), params=params)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, str(e))
    except Exception:
        return {}


async def _api_list(path: str, params: dict) -> list:
    data = await _api(path, params)
    return data.get("response", []) if isinstance(data, dict) else []


# ── Player parser — full stat set ─────────────────────────────
def _parse_player(entry: dict) -> dict:
    p   = entry.get("player", {}) or {}
    sts = entry.get("statistics", [{}])
    s   = sts[0] if sts else {}

    g   = s.get("goals",       {}) or {}
    ga  = s.get("games",       {}) or {}
    sh  = s.get("shots",       {}) or {}
    ps  = s.get("passes",      {}) or {}
    df  = s.get("duels",       {}) or {}
    dr  = s.get("dribbles",    {}) or {}
    tk  = s.get("tackles",     {}) or {}
    fo  = s.get("fouls",       {}) or {}
    cd  = s.get("cards",       {}) or {}
    pn  = s.get("penalty",     {}) or {}
    sub = s.get("substitutes", {}) or {}
    tm  = s.get("team",        {}) or {}
    lg  = s.get("league",      {}) or {}

    appearances = ga.get("appearences") or 0
    minutes     = ga.get("minutes") or 0
    goals       = g.get("total")    or 0
    assists     = g.get("assists")  or 0

    return {
        # Identity
        "id":           p.get("id"),
        "name":         p.get("name", ""),
        "firstname":    p.get("firstname", ""),
        "lastname":     p.get("second_name") or p.get("lastname", ""),
        "age":          p.get("age"),
        "nationality":  p.get("nationality", ""),
        "photo":        p.get("photo", ""),
        "height":       p.get("height"),
        "weight":       p.get("weight"),
        # Team / league
        "team_id":      tm.get("id"),
        "team":         tm.get("name", ""),
        "team_logo":    tm.get("logo", ""),
        "league":       lg.get("name", "") or LEAGUE_NAMES.get(lg.get("id"), ""),
        "league_id":    lg.get("id"),
        "league_slug":  LEAGUE_SLUGS.get(lg.get("id"), ""),
        # Playing time
        "appearances":  appearances,
        "minutes":      minutes,
        "position":     ga.get("position", ""),
        "rating":       _safe_float(ga.get("rating")),
        "captain":      bool(ga.get("captain")),
        # Goals & assists
        "goals":        goals,
        "assists":      assists,
        "goals_conceded": g.get("conceded") or 0,
        "saves":        g.get("saves") or 0,
        # Shots
        "shots_total":  sh.get("total") or 0,
        "shots_on":     sh.get("on")    or 0,
        # Passing
        "passes_total": ps.get("total") or 0,
        "passes_key":   ps.get("key")   or 0,
        "pass_accuracy":_safe_float(ps.get("accuracy")),
        # Dribbles
        "dribbles_attempted": dr.get("attempts") or 0,
        "dribbles_success":   dr.get("success")  or 0,
        # Duels
        "duels_total": df.get("total") or 0,
        "duels_won":   df.get("won")   or 0,
        # Tackles
        "tackles_total":    tk.get("total")    or 0,
        "tackles_blocks":   tk.get("blocks")   or 0,
        "tackles_interceptions": tk.get("interceptions") or 0,
        # Fouls
        "fouls_drawn":     fo.get("drawn")     or 0,
        "fouls_committed": fo.get("committed") or 0,
        # Cards
        "yellow_cards": cd.get("yellow") or 0,
        "yellow_red":   cd.get("yellowred") or 0,
        "red_cards":    cd.get("red") or 0,
        # Penalties
        "penalties_scored": pn.get("scored") or 0,
        "penalties_missed": pn.get("missed") or 0,
        "penalties_saved":  pn.get("saved")  or 0,
        # Substitutions
        "subs_in":  sub.get("in")    or 0,
        "subs_out": sub.get("out")   or 0,
        "subs_bench": sub.get("bench") or 0,
        # Computed
        "goal_contributions": goals + (assists or 0),
        "shots_ratio": round(sh.get("on", 0) / sh.get("total", 1) * 100, 1) if sh.get("total") else 0,
        "dribble_success_rate": round(dr.get("success", 0) / max(dr.get("attempts", 1), 1) * 100, 1),
        "duels_win_rate": round((df.get("won") or 0) / max((df.get("total") or 1), 1) * 100, 1),
        "goals_per90": round(goals / max(minutes, 1) * 90, 2),
        "assists_per90": round((assists or 0) / max(minutes, 1) * 90, 2),
        "shots_per90": round((sh.get("total") or 0) / max(minutes, 1) * 90, 2),
    }


def _safe_float(v) -> Optional[float]:
    try:
        return float(v) if v is not None and v != "" else None
    except Exception:
        return None


# ── Team stats parser ─────────────────────────────────────────
def _parse_team_stats(raw: dict, league_id: int, league_name: str) -> Optional[dict]:
    if not raw:
        return None
    team   = raw.get("team",     {}) or {}
    fix    = raw.get("fixtures", {}) or {}
    gl     = raw.get("goals",    {}) or {}
    cs     = raw.get("clean_sheet", {}) or {}
    fail   = raw.get("failed_to_score", {}) or {}
    fm     = raw.get("form", "") or ""
    lg_raw = raw.get("league", {}) or {}

    played  = (fix.get("played", {}) or {}).get("total", 0) or 0
    wins    = (fix.get("wins",   {}) or {}).get("total", 0) or 0
    draws   = (fix.get("draws", {}) or {}).get("total", 0) or 0
    losses  = (fix.get("loses", {}) or {}).get("total", 0) or 0
    gf      = (gl.get("for",     {}) or {}).get("total", {})
    ga_tot  = (gl.get("against", {}) or {}).get("total", {})
    goals_for     = gf.get("total", 0) or 0 if isinstance(gf, dict) else gf or 0
    goals_against = ga_tot.get("total", 0) or 0 if isinstance(ga_tot, dict) else ga_tot or 0
    clean_sheets  = cs.get("total", 0) or 0
    failed_to_score = fail.get("total", 0) or 0

    return {
        "team_id":   team.get("id"),
        "team":      team.get("name", ""),
        "team_logo": team.get("logo", ""),
        "league_id": league_id,
        "league":    league_name,
        "league_slug": LEAGUE_SLUGS.get(league_id, ""),
        "played":    played,
        "wins":      wins,
        "draws":     draws,
        "losses":    losses,
        "points":    wins * 3 + draws,
        "goals_for":     goals_for,
        "goals_against": goals_against,
        "goal_diff":     goals_for - goals_against,
        "clean_sheets":  clean_sheets,
        "failed_to_score": failed_to_score,
        "form":      fm[-5:] if fm else "",
        "win_rate":  round(wins / max(played, 1) * 100, 1),
        "goals_per_game": round(goals_for / max(played, 1), 2),
        "conceded_per_game": round(goals_against / max(played, 1), 2),
    }


# ── Data loaders ──────────────────────────────────────────────
async def _load_league_players(slug: str, lid: int) -> List[dict]:
    """Fetch first 3 pages of players for a league (≈60 players per league)."""
    players = []
    for page in range(1, 8):  # up to 7 pages = 140 players per league
        raw = await _api_list("/players", {"league": lid, "season": SEASON, "page": page})
        if not raw:
            break
        for entry in raw:
            players.append(_parse_player(entry))
        if len(raw) < 20:
            break
        await asyncio.sleep(0.12)
    return players


async def _load_league_teams(slug: str, lid: int) -> List[dict]:
    """Fetch standings and team stats for a league."""
    teams = []
    # Get standings for team list
    standings_raw = await _api_list("/standings", {"league": lid, "season": SEASON})
    if not standings_raw:
        return teams
    try:
        rows = standings_raw[0]["league"]["standings"][0]
    except (IndexError, KeyError, TypeError):
        return teams

    # For each team, fetch full stats
    for row in rows:
        team_id = (row.get("team") or {}).get("id")
        if not team_id:
            continue
        stats_raw = await _api_list("/teams/statistics",
                                    {"team": team_id, "league": lid, "season": SEASON})
        if stats_raw:
            parsed = _parse_team_stats(
                stats_raw[0] if isinstance(stats_raw, list) else stats_raw,
                lid, LEAGUE_NAMES.get(lid, "")
            )
            if parsed:
                # Inject standings data
                parsed["rank"]   = row.get("rank", 0)
                parsed["points"] = row.get("points", parsed["points"])
                teams.append(parsed)
        await asyncio.sleep(0.1)
    return teams


async def _ensure_loaded(force: bool = False):
    global _players, _players_map, _teams, _teams_map, _built_at
    if not force and _players and (time.time() - _built_at) < TTL:
        return

    # Load players and teams concurrently per league
    player_tasks = [_load_league_players(slug, lid) for slug, lid in LEAGUE_IDS.items()]
    team_tasks   = [_load_league_teams(slug, lid)   for slug, lid in LEAGUE_IDS.items()]

    player_results, team_results = await asyncio.gather(
        asyncio.gather(*player_tasks, return_exceptions=True),
        asyncio.gather(*team_tasks,   return_exceptions=True),
    )

    all_players: List[dict] = []
    for r in player_results:
        if isinstance(r, list):
            all_players.extend(r)

    all_teams: List[dict] = []
    for r in team_results:
        if isinstance(r, list):
            all_teams.extend(r)

    # Deduplicate players by id
    seen: set = set()
    deduped: List[dict] = []
    for p in all_players:
        if p.get("id") and p["id"] not in seen:
            seen.add(p["id"])
            deduped.append(p)

    # Deduplicate teams by team_id + league_id
    tseen: set = set()
    tdeduped: List[dict] = []
    for t in all_teams:
        key = (t.get("team_id"), t.get("league_id"))
        if key not in tseen:
            tseen.add(key)
            tdeduped.append(t)

    _players     = deduped
    _players_map = {p["id"]: p for p in deduped}
    _teams       = tdeduped
    _teams_map   = {t["team_id"]: t for t in tdeduped}
    _built_at    = time.time()


# ── Player endpoints ──────────────────────────────────────────

@router.get("/")
async def list_players(
    search:   Optional[str] = Query(None),
    team:     Optional[str] = Query(None),
    league:   Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    limit:    int            = Query(60, ge=1, le=500),
    offset:   int            = Query(0,  ge=0),
):
    await _ensure_loaded()
    results = _players

    if search:
        q = search.lower()
        results = [p for p in results if q in p["name"].lower() or q in p["team"].lower()]
    if team:
        q = team.lower()
        results = [p for p in results if q in p["team"].lower()]
    if league:
        lid = LEAGUE_IDS.get(league.lower())
        if lid:
            results = [p for p in results if p.get("league_id") == lid]
    if position:
        q = position.lower()
        results = [p for p in results if q in (p.get("position") or "").lower()]

    total = len(results)
    return {"total": total, "offset": offset, "limit": limit,
            "players": results[offset: offset + limit]}


@router.get("/search")
async def search_players(q: str = Query(..., min_length=2)):
    await _ensure_loaded()
    needle = q.lower()
    return [p for p in _players if needle in p["name"].lower()][:25]


@router.get("/top-scorers")
async def top_scorers(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    return sorted(pool, key=lambda p: p["goals"], reverse=True)[:limit]


@router.get("/top-assisters")
async def top_assisters(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    return sorted(pool, key=lambda p: p["assists"], reverse=True)[:limit]


@router.get("/top-rated")
async def top_rated(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    rated = [p for p in pool if p.get("rating") and p["appearances"] >= 5]
    return sorted(rated, key=lambda p: p["rating"] or 0, reverse=True)[:limit]


@router.get("/top-contributors")
async def top_contributors(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    return sorted(pool, key=lambda p: p["goal_contributions"], reverse=True)[:limit]


@router.get("/most-shots")
async def most_shots(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    return sorted(pool, key=lambda p: p["shots_total"], reverse=True)[:limit]


@router.get("/top-tacklers")
async def top_tacklers(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    await _ensure_loaded()
    pool = _filter_by_league(_players, league)
    return sorted(pool, key=lambda p: p["tackles_total"], reverse=True)[:limit]


@router.get("/compare")
async def compare_players(a: int = Query(...), b: int = Query(...)):
    await _ensure_loaded()
    pa = _players_map.get(a)
    pb = _players_map.get(b)
    if not pa: raise HTTPException(404, f"Player {a} not found")
    if not pb: raise HTTPException(404, f"Player {b} not found")

    KEYS = ["goals", "assists", "appearances", "minutes", "shots_total",
            "shots_on", "passes_key", "dribbles_success", "duels_won",
            "tackles_total", "yellow_cards", "goals_per90", "assists_per90"]

    return {
        "player_a":   pa, "player_b": pb,
        "comparison": {
            k: {"a": pa.get(k, 0), "b": pb.get(k, 0),
                "winner": "a" if (pa.get(k) or 0) >= (pb.get(k) or 0) else "b"}
            for k in KEYS
        }
    }


@router.get("/refresh")
async def refresh_players():
    await _ensure_loaded(force=True)
    return {"status": "ok", "players": len(_players), "teams": len(_teams)}


@router.get("/{player_id}")
async def get_player(player_id: int):
    await _ensure_loaded()
    p = _players_map.get(player_id)
    if not p:
        raise HTTPException(404, f"Player {player_id} not found")
    return p


# ── Team endpoints ────────────────────────────────────────────

@router.get("/teams/all")
async def all_teams(league: Optional[str] = Query(None)):
    await _ensure_loaded()
    pool = _filter_teams_by_league(_teams, league)
    return {"total": len(pool), "teams": pool}


@router.get("/teams/most-goals")
async def teams_most_goals(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    await _ensure_loaded()
    pool = _filter_teams_by_league(_teams, league)
    return sorted(pool, key=lambda t: t["goals_for"], reverse=True)[:limit]


@router.get("/teams/best-defence")
async def teams_best_defence(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    await _ensure_loaded()
    pool = _filter_teams_by_league(_teams, league)
    return sorted(pool, key=lambda t: t["goals_against"])[:limit]


@router.get("/teams/most-clean-sheets")
async def teams_clean_sheets(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    await _ensure_loaded()
    pool = _filter_teams_by_league(_teams, league)
    return sorted(pool, key=lambda t: t["clean_sheets"], reverse=True)[:limit]


@router.get("/teams/form")
async def teams_form(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    await _ensure_loaded()
    pool = _filter_teams_by_league(_teams, league)
    def _form_pts(t):
        return sum(3 if c == "W" else 1 if c == "D" else 0 for c in t.get("form", ""))
    return sorted(pool, key=_form_pts, reverse=True)[:limit]


@router.get("/teams/{team_id}")
async def get_team(team_id: int):
    await _ensure_loaded()
    t = _teams_map.get(team_id)
    if not t:
        raise HTTPException(404, f"Team {team_id} not found")
    # Also return squad
    squad = [p for p in _players if p.get("team_id") == team_id]
    return {"team": t, "squad": sorted(squad, key=lambda p: p["goals"], reverse=True)}


# ── Helpers ───────────────────────────────────────────────────

def _filter_by_league(pool: List[dict], league: Optional[str]) -> List[dict]:
    if not league or league.lower() == "all":
        return pool
    lid = LEAGUE_IDS.get(league.lower())
    return [p for p in pool if p.get("league_id") == lid] if lid else pool


def _filter_teams_by_league(pool: List[dict], league: Optional[str]) -> List[dict]:
    if not league or league.lower() == "all":
        return pool
    lid = LEAGUE_IDS.get(league.lower())
    return [t for t in pool if t.get("league_id") == lid] if lid else pool