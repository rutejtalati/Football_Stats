# backend/app/routes/players.py
# Player database endpoints — cached from API-Football, no live calls per request.
import os, asyncio, math, time
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/api/players", tags=["players"])

API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS = {
    "epl": 39, "laliga": 140, "seriea": 135, "bundesliga": 78, "ligue1": 61,
}

# ── In-memory player cache (refreshed every 24h) ──────────────────────────────
_players:     List[dict] = []
_players_map: Dict[int, dict] = {}
_built_at:    float = 0.0
TTL = 86400  # 24 hours


def _headers():
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}


async def _api(path: str, params: dict) -> list:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(f"{API_BASE}/{path.lstrip('/')}", headers=_headers(), params=params)
            r.raise_for_status()
            return r.json().get("response", [])
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, str(e))
    except Exception:
        return []


def _parse_player(entry: dict) -> dict:
    p   = entry.get("player", {})
    sts = entry.get("statistics", [{}])
    s   = sts[0] if sts else {}
    g   = s.get("goals",    {}) or {}
    ga  = s.get("games",    {}) or {}
    sh  = s.get("shots",    {}) or {}
    ps  = s.get("passes",   {}) or {}
    df  = s.get("duels",    {}) or {}
    dr  = s.get("dribbles", {}) or {}
    tm  = s.get("team",     {}) or {}
    lg  = s.get("league",   {}) or {}
    return {
        "id":           p.get("id"),
        "name":         p.get("name", ""),
        "firstname":    p.get("firstname", ""),
        "lastname":     p.get("lastname", ""),
        "age":          p.get("age"),
        "nationality":  p.get("nationality", ""),
        "photo":        p.get("photo", ""),
        "team_id":      tm.get("id"),
        "team":         tm.get("name", ""),
        "team_logo":    tm.get("logo", ""),
        "league":       lg.get("name", ""),
        "league_id":    lg.get("id"),
        "position":     ga.get("position", ""),
        "appearances":  ga.get("appearences") or 0,
        "minutes":      ga.get("minutes") or 0,
        "goals":        g.get("total")   or 0,
        "assists":      g.get("assists") or 0,
        "shots_total":  sh.get("total")  or 0,
        "shots_on":     sh.get("on")     or 0,
        "pass_acc":     ps.get("accuracy"),
        "key_passes":   ps.get("key")    or 0,
        "dribbles":     dr.get("success") or 0,
        "duels_won":    df.get("won")    or 0,
        "rating":       ga.get("rating"),
        "captain":      ga.get("captain", False),
    }


async def _load_league(league_id: int, season: int) -> List[dict]:
    """Fetch all pages for a league/season."""
    players = []
    page = 1
    while True:
        raw = await _api("/players", {"league": league_id, "season": season, "page": page})
        if not raw:
            break
        for entry in raw:
            players.append(_parse_player(entry))
        # API-Football paginates at 20/page — stop if fewer returned
        if len(raw) < 20:
            break
        page += 1
        if page > 50:   # safety cap
            break
        await asyncio.sleep(0.15)  # rate-limit respect
    return players


async def _ensure_loaded(force: bool = False):
    global _players, _players_map, _built_at
    if not force and _players and (time.time() - _built_at) < TTL:
        return
    all_players: List[dict] = []
    tasks = [_load_league(lid, SEASON) for lid in LEAGUE_IDS.values()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, list):
            all_players.extend(r)
    # Deduplicate by player id
    seen: set = set()
    deduped: List[dict] = []
    for p in all_players:
        if p["id"] not in seen:
            seen.add(p["id"])
            deduped.append(p)
    _players     = deduped
    _players_map = {p["id"]: p for p in deduped}
    _built_at    = time.time()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/")
async def list_players(
    search:   Optional[str] = Query(None, description="Name search"),
    team:     Optional[str] = Query(None),
    league:   Optional[str] = Query(None, description="league slug e.g. epl"),
    position: Optional[str] = Query(None, description="Goalkeeper|Defender|Midfielder|Attacker"),
    limit:    int           = Query(50, ge=1, le=200),
    offset:   int           = Query(0, ge=0),
):
    await _ensure_loaded()
    results = _players

    if search:
        q = search.lower()
        results = [p for p in results if q in p["name"].lower()]
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
    return {
        "total":   total,
        "offset":  offset,
        "limit":   limit,
        "players": results[offset: offset + limit],
    }


@router.get("/search")
async def search_players(q: str = Query(..., min_length=2)):
    await _ensure_loaded()
    needle = q.lower()
    return [p for p in _players if needle in p["name"].lower()][:20]


@router.get("/top-scorers")
async def top_scorers(
    league: Optional[str] = Query(None),
    limit:  int           = Query(20, ge=1, le=50),
):
    await _ensure_loaded()
    pool = _players
    if league:
        lid = LEAGUE_IDS.get(league.lower())
        if lid:
            pool = [p for p in pool if p.get("league_id") == lid]
    ranked = sorted(pool, key=lambda p: p["goals"], reverse=True)
    return ranked[:limit]


@router.get("/top-assisters")
async def top_assisters(
    league: Optional[str] = Query(None),
    limit:  int           = Query(20, ge=1, le=50),
):
    await _ensure_loaded()
    pool = _players
    if league:
        lid = LEAGUE_IDS.get(league.lower())
        if lid:
            pool = [p for p in pool if p.get("league_id") == lid]
    ranked = sorted(pool, key=lambda p: p["assists"], reverse=True)
    return ranked[:limit]


@router.get("/compare")
async def compare_players(
    a: int = Query(..., description="First player id"),
    b: int = Query(..., description="Second player id"),
):
    await _ensure_loaded()
    pa = _players_map.get(a)
    pb = _players_map.get(b)
    if not pa: raise HTTPException(404, f"Player {a} not found")
    if not pb: raise HTTPException(404, f"Player {b} not found")

    keys = ["goals", "assists", "appearances", "minutes", "shots_total", "shots_on",
            "key_passes", "dribbles", "duels_won"]

    def _radar(p: dict) -> dict:
        return {k: p.get(k, 0) for k in keys}

    return {
        "player_a":    pa,
        "player_b":    pb,
        "radar_a":     _radar(pa),
        "radar_b":     _radar(pb),
        "comparison":  {
            k: {"a": pa.get(k, 0), "b": pb.get(k, 0),
                "winner": "a" if (pa.get(k) or 0) >= (pb.get(k) or 0) else "b"}
            for k in keys
        },
    }


@router.get("/refresh")
async def refresh_players():
    """Force a cache refresh (call from a cron job or admin panel)."""
    await _ensure_loaded(force=True)
    return {"status": "ok", "total": len(_players), "leagues": list(LEAGUE_IDS.keys())}


@router.get("/{player_id}")
async def get_player(player_id: int):
    await _ensure_loaded()
    p = _players_map.get(player_id)
    if not p:
        raise HTTPException(404, f"Player {player_id} not found")
    return p