# backend/app/routes/players.py
# Uses API-Football's pre-ranked endpoints for instant responses.
# No full league crawl — each endpoint is a targeted single API call.

import asyncio, os, time
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

# ── Cache ─────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_ctimes: Dict[str, float] = {}
TTL_SHORT = 1800   # 30 min for rankings
TTL_LONG  = 3600   # 1 hr for player/team details
TTL_SEARCH = 86400 # 24 hr for search index

def _cget(k: str, ttl: float) -> Optional[Any]:
    return _cache[k] if k in _cache and time.monotonic() - _ctimes.get(k,0) < ttl else None

def _cset(k: str, v: Any) -> None:
    _cache[k] = v; _ctimes[k] = time.monotonic()

def _headers():
    if not API_KEY: raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}

async def _get(path: str, params: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(f"{API_BASE}/{path.lstrip('/')}", headers=_headers(), params=params)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"API error: {e}")
    except Exception as e:
        raise HTTPException(502, f"Upstream error: {e}")

async def _get_list(path: str, params: dict) -> list:
    d = await _get(path, params)
    return d.get("response", []) if isinstance(d, dict) else []

# ── Parse helpers ─────────────────────────────────────────────
def _parse_scorer(entry: dict, league_id: int) -> dict:
    p = entry.get("player", {}) or {}
    sts = (entry.get("statistics") or [{}])
    s   = sts[0] if sts else {}
    g   = s.get("goals",    {}) or {}
    ga  = s.get("games",    {}) or {}
    sh  = s.get("shots",    {}) or {}
    ps  = s.get("passes",   {}) or {}
    dr  = s.get("dribbles", {}) or {}
    df  = s.get("duels",    {}) or {}
    tk  = s.get("tackles",  {}) or {}
    cd  = s.get("cards",    {}) or {}
    tm  = s.get("team",     {}) or {}
    lg  = s.get("league",   {}) or {}
    apps = ga.get("appearences") or 0
    mins = ga.get("minutes") or 1
    goals   = g.get("total")   or 0
    assists = g.get("assists")  or 0
    return {
        "id":            p.get("id"),
        "name":          p.get("name",""),
        "age":           p.get("age"),
        "nationality":   p.get("nationality",""),
        "photo":         p.get("photo",""),
        "height":        p.get("height",""),
        "weight":        p.get("weight",""),
        "team_id":       tm.get("id"),
        "team":          tm.get("name",""),
        "team_logo":     tm.get("logo",""),
        "league_id":     league_id,
        "league":        LEAGUE_NAMES.get(league_id,""),
        "league_slug":   LEAGUE_SLUGS.get(league_id,""),
        "position":      ga.get("position",""),
        "appearances":   apps,
        "minutes":       mins,
        "rating":        _sf(ga.get("rating")),
        "goals":         goals,
        "assists":       assists,
        "goal_contributions": goals + assists,
        "shots_total":   sh.get("total") or 0,
        "shots_on":      sh.get("on") or 0,
        "passes_key":    ps.get("key") or 0,
        "pass_accuracy": _sf(ps.get("accuracy")),
        "dribbles_success": dr.get("success") or 0,
        "duels_won":     df.get("won") or 0,
        "tackles_total": tk.get("total") or 0,
        "tackles_interceptions": tk.get("interceptions") or 0,
        "yellow_cards":  cd.get("yellow") or 0,
        "red_cards":     cd.get("red") or 0,
        "goals_per90":   round(goals / max(mins,1) * 90, 2),
        "assists_per90": round(assists / max(mins,1) * 90, 2),
        "shots_per90":   round((sh.get("total") or 0) / max(mins,1) * 90, 2),
        "goals_conceded":g.get("conceded") or 0,
        "saves":         g.get("saves") or 0,
    }

def _sf(v) -> Optional[float]:
    try: return float(v) if v not in (None,"") else None
    except: return None

def _parse_standing_row(row: dict, league_id: int) -> dict:
    tm  = row.get("team", {}) or {}
    all_ = row.get("all", {}) or {}
    gl  = all_.get("goals", {}) or {}
    cs  = row.get("clean_sheet") or {}
    fm  = row.get("form","") or ""
    return {
        "team_id":    tm.get("id"),
        "team":       tm.get("name",""),
        "team_logo":  tm.get("logo",""),
        "league_id":  league_id,
        "league":     LEAGUE_NAMES.get(league_id,""),
        "league_slug":LEAGUE_SLUGS.get(league_id,""),
        "rank":       row.get("rank",0),
        "points":     row.get("points",0),
        "played":     all_.get("played",0),
        "wins":       all_.get("win",0),
        "draws":      all_.get("draw",0),
        "losses":     all_.get("lose",0),
        "goals_for":  gl.get("for",0) or 0,
        "goals_against": gl.get("against",0) or 0,
        "goal_diff":  row.get("goalsDiff",0),
        "clean_sheets": cs.get("total",0) if isinstance(cs,dict) else 0,
        "form":       fm[-5:],
        "win_rate":   round((all_.get("win",0) / max(all_.get("played",1),1))*100,1),
        "goals_per_game": round((gl.get("for",0) or 0) / max(all_.get("played",1),1),2),
        "conceded_per_game": round((gl.get("against",0) or 0) / max(all_.get("played",1),1),2),
    }

# ── Fetch all leagues concurrently ────────────────────────────
async def _all_leagues_scorers() -> List[dict]:
    key = f"allscorers:{SEASON}"
    hit = _cget(key, TTL_SHORT); 
    if hit is not None: return hit
    tasks = [_get_list("/players/topscorers", {"league":lid,"season":SEASON}) for lid in LEAGUE_IDS.values()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for lid, r in zip(LEAGUE_IDS.values(), results):
        if isinstance(r, list):
            for entry in r[:20]: out.append(_parse_scorer(entry, lid))
    _cset(key, out); return out

async def _all_leagues_assisters() -> List[dict]:
    key = f"allassists:{SEASON}"
    hit = _cget(key, TTL_SHORT)
    if hit is not None: return hit
    tasks = [_get_list("/players/topassists", {"league":lid,"season":SEASON}) for lid in LEAGUE_IDS.values()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for lid, r in zip(LEAGUE_IDS.values(), results):
        if isinstance(r, list):
            for entry in r[:20]: out.append(_parse_scorer(entry, lid))
    _cset(key, out); return out

async def _all_leagues_standings() -> List[dict]:
    key = f"allstandings:{SEASON}"
    hit = _cget(key, TTL_LONG)
    if hit is not None: return hit
    tasks = [_get_list("/standings", {"league":lid,"season":SEASON}) for lid in LEAGUE_IDS.values()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for lid, r in zip(LEAGUE_IDS.values(), results):
        if not isinstance(r, list): continue
        try:
            rows = r[0]["league"]["standings"][0]
            for row in rows: out.append(_parse_standing_row(row, lid))
        except (IndexError,KeyError,TypeError): pass
    _cset(key, out); return out

async def _league_scorers(lid: int) -> List[dict]:
    key = f"scorers:{lid}:{SEASON}"
    hit = _cget(key, TTL_SHORT)
    if hit is not None: return hit
    r = await _get_list("/players/topscorers", {"league":lid,"season":SEASON})
    out = [_parse_scorer(e, lid) for e in r[:20]]
    _cset(key, out); return out

async def _league_assisters(lid: int) -> List[dict]:
    key = f"assists:{lid}:{SEASON}"
    hit = _cget(key, TTL_SHORT)
    if hit is not None: return hit
    r = await _get_list("/players/topassists", {"league":lid,"season":SEASON})
    out = [_parse_scorer(e, lid) for e in r[:20]]
    _cset(key, out); return out

async def _league_standings(lid: int) -> List[dict]:
    key = f"standings:{lid}:{SEASON}"
    hit = _cget(key, TTL_LONG)
    if hit is not None: return hit
    r = await _get_list("/standings", {"league":lid,"season":SEASON})
    out = []
    try:
        rows = r[0]["league"]["standings"][0]
        out = [_parse_standing_row(row, lid) for row in rows]
    except: pass
    _cset(key, out); return out

# ── PLAYER ENDPOINTS ─────────────────────────────────────────

@router.get("/top-scorers")
async def top_scorers(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        if not lid: raise HTTPException(404, "Unknown league")
        data = await _league_scorers(lid)
    else:
        data = await _all_leagues_scorers()
    return sorted(data, key=lambda p: p["goals"], reverse=True)[:limit]

@router.get("/top-assisters")
async def top_assisters(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        if not lid: raise HTTPException(404, "Unknown league")
        data = await _league_assisters(lid)
    else:
        data = await _all_leagues_assisters()
    return sorted(data, key=lambda p: p["assists"], reverse=True)[:limit]

@router.get("/top-rated")
async def top_rated(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    # Use scorers as proxy for rated (API-Football doesn't have a top-rated endpoint on free tier)
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_scorers(lid) if lid else []
    else:
        data = await _all_leagues_scorers()
    rated = [p for p in data if p.get("rating")]
    return sorted(rated, key=lambda p: p["rating"] or 0, reverse=True)[:limit]

@router.get("/top-contributors")
async def top_contributors(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        s = await _league_scorers(lid) if lid else []
        a = await _league_assisters(lid) if lid else []
    else:
        s, a = await asyncio.gather(_all_leagues_scorers(), _all_leagues_assisters())
    # Merge by player id, sum goal_contributions
    merged: Dict[int, dict] = {}
    for p in s + a:
        pid = p.get("id")
        if not pid: continue
        if pid in merged:
            merged[pid]["goal_contributions"] = p["goals"] + p["assists"]
        else:
            merged[pid] = {**p, "goal_contributions": p["goals"] + p["assists"]}
    return sorted(merged.values(), key=lambda p: p["goal_contributions"], reverse=True)[:limit]

@router.get("/most-shots")
async def most_shots(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_scorers(lid) if lid else []
    else:
        data = await _all_leagues_scorers()
    return sorted(data, key=lambda p: p["shots_total"], reverse=True)[:limit]

@router.get("/top-tacklers")
async def top_tacklers(league: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_scorers(lid) if lid else []
    else:
        data = await _all_leagues_scorers()
    return sorted(data, key=lambda p: p["tackles_total"], reverse=True)[:limit]

@router.get("/search")
async def search_players(q: str = Query(..., min_length=2), limit: int = Query(20, le=50)):
    # Search across scorers + assisters
    s, a = await asyncio.gather(_all_leagues_scorers(), _all_leagues_assisters())
    seen = set(); pool = []
    for p in s + a:
        pid = p.get("id")
        if pid and pid not in seen:
            seen.add(pid); pool.append(p)
    needle = q.lower()
    return [p for p in pool if needle in p["name"].lower() or needle in p["team"].lower()][:limit]

@router.get("/compare")
async def compare_players(a: int = Query(...), b: int = Query(...)):
    s, ast_ = await asyncio.gather(_all_leagues_scorers(), _all_leagues_assisters())
    all_p = {p["id"]: p for p in s + ast_ if p.get("id")}
    pa = all_p.get(a)
    pb = all_p.get(b)
    if not pa: raise HTTPException(404, f"Player {a} not found")
    if not pb: raise HTTPException(404, f"Player {b} not found")
    KEYS = ["goals","assists","goal_contributions","shots_total","shots_on",
            "passes_key","dribbles_success","tackles_total","yellow_cards","goals_per90","assists_per90"]
    return {
        "player_a": pa, "player_b": pb,
        "comparison": {
            k: {"a": pa.get(k,0), "b": pb.get(k,0),
                "winner": "a" if (pa.get(k) or 0) >= (pb.get(k) or 0) else "b"}
            for k in KEYS
        }
    }

@router.get("/{player_id}")
async def get_player(player_id: int):
    s, a = await asyncio.gather(_all_leagues_scorers(), _all_leagues_assisters())
    for p in s + a:
        if p.get("id") == player_id: return p
    raise HTTPException(404, f"Player {player_id} not found in top scorers/assisters")

# ── TEAM ENDPOINTS ────────────────────────────────────────────

@router.get("/teams/all")
async def teams_all(league: Optional[str] = Query(None)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_standings(lid) if lid else []
    else:
        data = await _all_leagues_standings()
    return {"total": len(data), "teams": sorted(data, key=lambda t: (-t["points"], -t["goal_diff"]))}

@router.get("/teams/most-goals")
async def teams_most_goals(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_standings(lid) if lid else []
    else:
        data = await _all_leagues_standings()
    return sorted(data, key=lambda t: t["goals_for"], reverse=True)[:limit]

@router.get("/teams/best-defence")
async def teams_best_defence(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_standings(lid) if lid else []
    else:
        data = await _all_leagues_standings()
    return sorted(data, key=lambda t: t["goals_against"])[:limit]

@router.get("/teams/most-clean-sheets")
async def teams_clean_sheets(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_standings(lid) if lid else []
    else:
        data = await _all_leagues_standings()
    return sorted(data, key=lambda t: t["clean_sheets"], reverse=True)[:limit]

@router.get("/teams/form")
async def teams_form(league: Optional[str] = Query(None), limit: int = Query(20, le=30)):
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_standings(lid) if lid else []
    else:
        data = await _all_leagues_standings()
    def fp(t): return sum(3 if c=="W" else 1 if c=="D" else 0 for c in t.get("form",""))
    return sorted(data, key=fp, reverse=True)[:limit]

@router.get("/teams/{team_id}")
async def get_team(team_id: int):
    data = await _all_leagues_standings()
    for t in data:
        if t.get("team_id") == team_id: return t
    raise HTTPException(404, f"Team {team_id} not found")

@router.get("/")
async def list_players(
    search:   Optional[str] = Query(None),
    league:   Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    limit:    int            = Query(40, le=100),
    offset:   int            = Query(0),
):
    if search:
        return await search_players(q=search, limit=limit)
    if league and league != "all":
        lid = LEAGUE_IDS.get(league)
        data = await _league_scorers(lid) if lid else []
    else:
        data = await _all_leagues_scorers()
    if position:
        pos = position.lower()
        data = [p for p in data if pos in (p.get("position") or "").lower()]
    return {"total": len(data), "offset": offset, "limit": limit,
            "players": data[offset:offset+limit]}

@router.get("/refresh")
async def refresh():
    for k in list(_cache.keys()): del _cache[k]; _ctimes.pop(k, None)
    return {"status": "cache cleared"}