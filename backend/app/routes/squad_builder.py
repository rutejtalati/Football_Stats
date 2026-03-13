"""
Squad Builder routes
GET /api/squad-builder/players?league=epl&position=FWD&team_id=33
GET /api/squad-builder/team/{team_id}?league=epl
GET /api/squad-builder/compare?player_ids=123,456,789
"""

import asyncio, os, time
from typing import Dict, Any, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
API_BASE       = "https://v3.football.api-sports.io"
CURRENT_SEASON = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS = {"epl": 39, "laliga": 140, "seriea": 135, "ligue1": 61, "bundesliga": 78}

_cache: Dict[str, Any]   = {}
_times: Dict[str, float] = {}
_TTL_PLAYERS  = 3600      # 1h
_TTL_SQUAD    = 86400     # 24h


def _get(k, ttl):
    if k in _cache and time.time() - _times[k] < ttl:
        return _cache[k]
    _cache.pop(k, None); _times.pop(k, None)
    return None


def _set(k, v):
    _cache[k] = v; _times[k] = time.time()


async def _api(ep: str, params: dict) -> Any:
    if not API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=14) as c:
            r = await c.get(f"{API_BASE}/{ep}", headers={"x-apisports-key": API_KEY}, params=params)
            if r.status_code == 200:
                body = r.json()
                return body.get("response", [])
    except Exception:
        pass
    return []


# ── Position normalisation ────────────────────────────────────────────────────
POS_MAP = {
    "Goalkeeper": "GK", "G": "GK", "GK": "GK",
    "Defender": "DEF", "D": "DEF", "CB": "DEF", "LB": "DEF", "RB": "DEF",
    "Midfielder": "MID", "M": "MID", "CM": "MID", "CDM": "MID", "CAM": "MID",
    "Attacker": "FWD", "F": "FWD", "ST": "FWD", "LW": "FWD", "RW": "FWD",
}

def _pos(raw: str) -> str:
    return POS_MAP.get((raw or "").strip(), "MID")


# ── Player normaliser ─────────────────────────────────────────────────────────
def _normalise_player(entry: dict) -> dict:
    p = entry.get("player", {}) or {}
    stats_list = entry.get("statistics", []) or []
    s = stats_list[0] if stats_list else {}
    games  = s.get("games", {}) or {}
    goals  = s.get("goals", {}) or {}
    passes = s.get("passes", {}) or {}
    dribbles = s.get("dribbles", {}) or {}
    duels  = s.get("duels", {}) or {}
    tackles = s.get("tackles", {}) or {}
    cards  = s.get("cards", {}) or {}
    shots  = s.get("shots", {}) or {}
    team   = s.get("team", {}) or {}

    mins     = games.get("minutes") or 0
    appeared = games.get("appearences") or 1
    rating   = float(games.get("rating") or 0)
    g        = goals.get("total") or 0
    a        = goals.get("assists") or 0

    # Composite form score
    form_score = round(
        0.35 * min(rating / 10, 1) +
        0.30 * min(mins / (appeared * 90), 1) +
        0.25 * min((g + a) / max(appeared, 1), 1) +
        0.10 * min(appeared / 20, 1),
        3
    )

    return {
        "player_id":   p.get("id"),
        "name":        p.get("name", ""),
        "firstname":   p.get("firstname", ""),
        "lastname":    p.get("lastname", ""),
        "age":         p.get("age"),
        "nationality": p.get("nationality", ""),
        "photo":       p.get("photo", ""),
        "position":    _pos(games.get("position", "")),
        "team_id":     team.get("id"),
        "team_name":   team.get("name", ""),
        "team_logo":   team.get("logo", ""),
        # Performance
        "appearances": appeared,
        "minutes":     mins,
        "goals":       g,
        "assists":     a,
        "rating":      rating,
        "form_score":  form_score,
        # Detailed
        "shots_total":   shots.get("total") or 0,
        "shots_on":      shots.get("on") or 0,
        "pass_accuracy": passes.get("accuracy") or 0,
        "key_passes":    passes.get("key") or 0,
        "dribbles_succ": dribbles.get("success") or 0,
        "tackles":       tackles.get("total") or 0,
        "duels_won":     duels.get("won") or 0,
        "yellow_cards":  cards.get("yellow") or 0,
        "red_cards":     cards.get("red") or 0,
        # Season totals
        "season": CURRENT_SEASON,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/squad-builder/players")
async def get_players(
    league: str = Query("epl"),
    position: Optional[str] = Query(None),
    team_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
):
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")

    lid = LEAGUE_IDS[league]
    cache_key = f"sb_players:{league}:{team_id}:{position}:{page}"
    if (hit := _get(cache_key, _TTL_PLAYERS)) is not None:
        return hit

    params: dict = {"league": lid, "season": CURRENT_SEASON, "page": page}
    if team_id:
        params["team"] = team_id

    raw = await _api("players", params)
    players = [_normalise_player(e) for e in raw]

    if position:
        pos_upper = position.upper()
        players = [p for p in players if p["position"] == pos_upper]

    # Sort by form score
    players.sort(key=lambda p: -(p["form_score"] or 0))

    result = {
        "league": league, "position": position,
        "team_id": team_id, "page": page,
        "count": len(players),
        "players": players,
    }

    _set(cache_key, result)
    return result


@router.get("/api/squad-builder/team/{team_id}")
async def get_team_squad(team_id: int, league: str = Query("epl")):
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")

    lid = LEAGUE_IDS[league]
    cache_key = f"sb_squad:{team_id}:{league}"
    if (hit := _get(cache_key, _TTL_SQUAD)) is not None:
        return hit

    # Fetch squad list + player stats in parallel
    squad_raw, stats_raw = await asyncio.gather(
        _api("players/squads", {"team": team_id}),
        _api("players", {"team": team_id, "league": lid, "season": CURRENT_SEASON}),
    )

    # Build stats lookup by player ID
    stats_by_id = {}
    for entry in stats_raw:
        pid = (entry.get("player") or {}).get("id")
        if pid:
            stats_by_id[pid] = entry

    # Merge squad + stats
    squad_info = (squad_raw[0].get("players", []) if squad_raw else [])
    players = []
    for sp in squad_info:
        pid = sp.get("id")
        if pid in stats_by_id:
            players.append(_normalise_player(stats_by_id[pid]))
        else:
            # Basic squad entry without stats
            players.append({
                "player_id": pid,
                "name":      sp.get("name", ""),
                "age":       sp.get("age"),
                "number":    sp.get("number"),
                "position":  _pos(sp.get("position", "")),
                "photo":     sp.get("photo", ""),
                "nationality": sp.get("nationality", ""),
                "team_id":   team_id,
                "team_name": "",
                "form_score": 0,
                "goals": 0, "assists": 0, "appearances": 0, "minutes": 0, "rating": 0,
            })

    # Group by position
    by_position: Dict[str, List[dict]] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in players:
        pos = p.get("position", "MID")
        by_position.setdefault(pos, []).append(p)
    for pos in by_position:
        by_position[pos].sort(key=lambda p: -(p.get("form_score") or 0))

    result = {
        "team_id":    team_id,
        "league":     league,
        "total":      len(players),
        "by_position": by_position,
        "all":        sorted(players, key=lambda p: -(p.get("form_score") or 0)),
    }

    _set(cache_key, result)
    return result


@router.get("/api/squad-builder/compare")
async def compare_players(
    player_ids: str = Query(..., description="Comma-separated player IDs"),
    league: str = Query("epl"),
):
    """Compare up to 5 players side by side."""
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")

    id_list = [int(x.strip()) for x in player_ids.split(",") if x.strip().isdigit()][:5]
    if not id_list:
        raise HTTPException(400, "Provide at least one valid player ID")

    lid = LEAGUE_IDS[league]

    async def fetch_player(pid: int) -> Optional[dict]:
        cache_key = f"sb_player:{pid}:{league}"
        if (hit := _get(cache_key, _TTL_PLAYERS)) is not None:
            return hit
        raw = await _api("players", {"id": pid, "season": CURRENT_SEASON, "league": lid})
        if not raw:
            return None
        p = _normalise_player(raw[0])
        _set(cache_key, p)
        return p

    results = await asyncio.gather(*[fetch_player(pid) for pid in id_list])
    players = [p for p in results if p is not None]

    if not players:
        raise HTTPException(404, "No players found for given IDs")

    # Radar chart metrics (normalised 0-100)
    metrics = ["goals", "assists", "rating", "pass_accuracy", "dribbles_succ", "tackles", "key_passes", "form_score"]

    def _normalise_metric(val, metric: str) -> float:
        caps = {"goals": 30, "assists": 20, "rating": 10, "pass_accuracy": 100,
                "dribbles_succ": 100, "tackles": 100, "key_passes": 100, "form_score": 1}
        cap = caps.get(metric, 100)
        return round(min(100, (val or 0) / cap * 100), 1)

    comparison = []
    for p in players:
        radar = {m: _normalise_metric(p.get(m, 0), m) for m in metrics}
        comparison.append({**p, "radar": radar})

    return {
        "players": comparison,
        "metrics": metrics,
        "league":  league,
    }


@router.get("/api/squad-builder/search")
async def search_players(
    name: str = Query(..., min_length=2),
    league: str = Query("epl"),
):
    """Search players by name within a league."""
    if league not in LEAGUE_IDS:
        raise HTTPException(404, f"Unknown league: {league}")

    lid = LEAGUE_IDS[league]
    raw = await _api("players", {"search": name, "league": lid, "season": CURRENT_SEASON})
    players = [_normalise_player(e) for e in raw[:20]]
    players.sort(key=lambda p: -(p["form_score"] or 0))

    return {"query": name, "league": league, "count": len(players), "players": players}