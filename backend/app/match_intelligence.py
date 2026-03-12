"""
backend/app/match_intelligence.py  —  StatinSite Match Intelligence
═══════════════════════════════════════════════════════════════════
Fetches, caches, and normalises all API-Football data for a single
fixture into one unified response object.

main.py adds ONE route:
    GET /api/match-intelligence/{fixture_id}

Cache TTLs (seconds):
    fixture_core   600     10 min  — score / status
    events         600     10 min
    statistics     600     10 min
    lineups       1800     30 min
    h2h          86400     24 h
    injuries      21600    6 h
    venue        604800    7 days  (permanent-ish)
    team_stats    86400    24 h
"""

import os
import time
import asyncio
import httpx
from typing import Any, Dict, List, Optional, Tuple

# ── API-Football config ───────────────────────────────────────────────
API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
BASE_URL = "https://v3.football.api-sports.io"
HEADERS  = {"x-apisports-key": API_KEY}
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

# ── Per-key TTLs ──────────────────────────────────────────────────────
TTL: Dict[str, int] = {
    "fixture_core": 600,
    "events":       600,
    "statistics":   600,
    "lineups":      1800,
    "h2h":          86400,
    "injuries":     21600,
    "venue":        604800,
    "team_stats":   86400,
}

# ── Simple in-process TTL store ───────────────────────────────────────
_store: Dict[str, Any]   = {}
_ts:    Dict[str, float] = {}

def _get(key: str) -> Optional[Any]:
    if key in _store and time.time() - _ts[key] < TTL.get(key.split(":")[0], 3600):
        return _store[key]
    return None

def _set(key: str, value: Any):
    _store[key] = value
    _ts[key]    = time.time()


# ── Low-level async fetcher ───────────────────────────────────────────
async def _fetch(client: httpx.AsyncClient, endpoint: str, params: Dict) -> Dict:
    """Single API-Football request. Returns {} on any error."""
    try:
        r = await client.get(
            f"{BASE_URL}/{endpoint}",
            headers=HEADERS,
            params=params,
            timeout=12.0,
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("response", data) if isinstance(data, dict) else data
    except Exception:
        pass
    return {}


# ═══════════════════════════════════════════════════════════════════════
# INDIVIDUAL DATA FETCHERS (each checks cache first)
# ═══════════════════════════════════════════════════════════════════════

async def _fixture_core(client, fixture_id: int) -> Dict:
    key = f"fixture_core:{fixture_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "fixtures", {"id": fixture_id})
    result = raw[0] if isinstance(raw, list) and raw else {}
    _set(key, result)
    return result


async def _fixture_events(client, fixture_id: int) -> List:
    key = f"events:{fixture_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "fixtures/events", {"fixture": fixture_id})
    result = raw if isinstance(raw, list) else []
    _set(key, result)
    return result


async def _fixture_lineups(client, fixture_id: int) -> List:
    key = f"lineups:{fixture_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "fixtures/lineups", {"fixture": fixture_id})
    result = raw if isinstance(raw, list) else []
    _set(key, result)
    return result


async def _fixture_statistics(client, fixture_id: int) -> List:
    key = f"statistics:{fixture_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "fixtures/statistics", {"fixture": fixture_id})
    result = raw if isinstance(raw, list) else []
    _set(key, result)
    return result


async def _h2h(client, team1: int, team2: int) -> List:
    key = f"h2h:{min(team1,team2)}-{max(team1,team2)}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "fixtures/headtohead", {
        "h2h": f"{team1}-{team2}", "last": 10,
    })
    result = raw if isinstance(raw, list) else []
    _set(key, result)
    return result


async def _injuries(client, fixture_id: int) -> List:
    key = f"injuries:{fixture_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "injuries", {"fixture": fixture_id})
    result = raw if isinstance(raw, list) else []
    _set(key, result)
    return result


async def _team_stats(client, team_id: int, league_id: int) -> Dict:
    key = f"team_stats:{team_id}:{league_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "teams/statistics", {
        "team": team_id, "league": league_id, "season": SEASON,
    })
    result = raw if isinstance(raw, dict) else {}
    _set(key, result)
    return result


async def _venue(client, venue_id: int) -> Dict:
    if not venue_id:
        return {}
    key = f"venue:{venue_id}"
    hit = _get(key)
    if hit is not None:
        return hit
    raw = await _fetch(client, "venues", {"id": venue_id})
    result = raw[0] if isinstance(raw, list) and raw else {}
    _set(key, result)
    return result


# ═══════════════════════════════════════════════════════════════════════
# NORMALIZERS
# ═══════════════════════════════════════════════════════════════════════

def _norm_header(core: Dict) -> Dict:
    """Match header — status, score, teams, date, referee."""
    fx   = core.get("fixture", {})
    lg   = core.get("league",  {})
    home = core.get("teams",   {}).get("home", {})
    away = core.get("teams",   {}).get("away", {})
    goals= core.get("goals",   {})
    score= core.get("score",   {})

    return {
        "fixture_id":   fx.get("id"),
        "date":         fx.get("date"),
        "status":       fx.get("status", {}).get("long", "Not Started"),
        "status_short": fx.get("status", {}).get("short", "NS"),
        "elapsed":      fx.get("status", {}).get("elapsed"),
        "referee":      fx.get("referee"),
        "timezone":     fx.get("timezone"),
        "league": {
            "id":     lg.get("id"),
            "name":   lg.get("name"),
            "season": lg.get("season"),
            "round":  lg.get("round"),
            "logo":   lg.get("logo"),
            "flag":   lg.get("flag"),
        },
        "home": {
            "id":     home.get("id"),
            "name":   home.get("name"),
            "logo":   home.get("logo"),
            "winner": home.get("winner"),
        },
        "away": {
            "id":     away.get("id"),
            "name":   away.get("name"),
            "logo":   away.get("logo"),
            "winner": away.get("winner"),
        },
        "score": {
            "home":       goals.get("home"),
            "away":       goals.get("away"),
            "ht_home":    (score.get("halftime") or {}).get("home"),
            "ht_away":    (score.get("halftime") or {}).get("away"),
            "ft_home":    (score.get("fulltime") or {}).get("home"),
            "ft_away":    (score.get("fulltime") or {}).get("away"),
            "et_home":    (score.get("extratime") or {}).get("home"),
            "et_away":    (score.get("extratime") or {}).get("away"),
            "pen_home":   (score.get("penalty") or {}).get("home"),
            "pen_away":   (score.get("penalty") or {}).get("away"),
        },
    }


def _norm_events(events: List) -> List[Dict]:
    out = []
    for e in events:
        t    = e.get("team",   {}) or {}
        p    = e.get("player", {}) or {}
        a    = e.get("assist", {}) or {}
        time_= e.get("time",   {}) or {}
        out.append({
            "minute":      time_.get("elapsed"),
            "extra":       time_.get("extra"),
            "team_id":     t.get("id"),
            "team_name":   t.get("name"),
            "team_logo":   t.get("logo"),
            "player_id":   p.get("id"),
            "player_name": p.get("name"),
            "assist_id":   a.get("id"),
            "assist_name": a.get("name"),
            "type":        e.get("type"),
            "detail":      e.get("detail"),
            "comments":    e.get("comments"),
        })
    return sorted(out, key=lambda x: (x.get("minute") or 0, x.get("extra") or 0))


def _norm_lineup(raw_lineups: List) -> List[Dict]:
    out = []
    for lineup in raw_lineups:
        team      = lineup.get("team",     {}) or {}
        coach     = lineup.get("coach",    {}) or {}
        start_xi  = lineup.get("startXI",  []) or []
        subs      = lineup.get("substitutes", []) or []

        def _player(p_obj):
            p = (p_obj.get("player") or {})
            return {
                "id":     p.get("id"),
                "name":   p.get("name"),
                "number": p.get("number"),
                "pos":    p.get("pos"),
                "grid":   p.get("grid"),
            }

        out.append({
            "team_id":    team.get("id"),
            "team_name":  team.get("name"),
            "team_logo":  team.get("logo"),
            "team_color": team.get("colors"),
            "formation":  lineup.get("formation"),
            "coach":      {"id": coach.get("id"), "name": coach.get("name"), "photo": coach.get("photo")},
            "start_xi":   [_player(p) for p in start_xi],
            "subs":       [_player(p) for p in subs],
        })
    return out


def _norm_statistics(raw_stats: List, home_id: int, away_id: int) -> Dict:
    """
    Convert API-Football statistics array into a flat dict keyed by
    stat name, with home/away values side by side.
    """
    home_raw = {}
    away_raw = {}
    for team_stats in raw_stats:
        t_id  = (team_stats.get("team") or {}).get("id")
        stats = team_stats.get("statistics") or []
        target = home_raw if t_id == home_id else away_raw
        for s in stats:
            target[s.get("type", "")] = s.get("value")

    def _both(key):
        return {"home": home_raw.get(key), "away": away_raw.get(key)}

    return {
        "shots_total":          _both("Total Shots"),
        "shots_on_target":      _both("Shots on Goal"),
        "shots_off_target":     _both("Shots off Goal"),
        "shots_blocked":        _both("Blocked Shots"),
        "shots_inside_box":     _both("Shots insidebox"),
        "shots_outside_box":    _both("Shots outsidebox"),
        "fouls":                _both("Fouls"),
        "corner_kicks":         _both("Corner Kicks"),
        "offsides":             _both("Offsides"),
        "possession":           _both("Ball Possession"),
        "yellow_cards":         _both("Yellow Cards"),
        "red_cards":            _both("Red Cards"),
        "goalkeeper_saves":     _both("Goalkeeper Saves"),
        "total_passes":         _both("Total passes"),
        "accurate_passes":      _both("Passes accurate"),
        "pass_accuracy":        _both("Passes %"),
        "expected_goals":       _both("expected_goals"),
    }


def _norm_h2h(h2h_list: List, home_id: int, away_id: int) -> Dict:
    results = []
    home_w = draw_w = away_w = 0

    for fx in h2h_list[:10]:
        teams  = fx.get("teams",   {}) or {}
        goals  = fx.get("goals",   {}) or {}
        league = fx.get("league",  {}) or {}
        f      = fx.get("fixture", {}) or {}
        hg = goals.get("home") or 0
        ag = goals.get("away") or 0
        h_team_id = (teams.get("home") or {}).get("id")

        if   hg > ag:  winner_id = h_team_id
        elif ag > hg:  winner_id = (teams.get("away") or {}).get("id")
        else:          winner_id = None

        results.append({
            "fixture_id": f.get("id"),
            "date":       f.get("date", "")[:10],
            "league":     league.get("name"),
            "home_team":  (teams.get("home") or {}).get("name"),
            "home_logo":  (teams.get("home") or {}).get("logo"),
            "away_team":  (teams.get("away") or {}).get("name"),
            "away_logo":  (teams.get("away") or {}).get("logo"),
            "home_goals": hg,
            "away_goals": ag,
        })

        if winner_id == home_id:   home_w += 1
        elif winner_id == away_id: away_w += 1
        else:                      draw_w += 1

    return {
        "count":   len(results),
        "home_wins":  home_w,
        "draws":      draw_w,
        "away_wins":  away_w,
        "results":    results,
    }


def _norm_injuries(injuries: List, home_id: int, away_id: int) -> Dict:
    home_inj = []
    away_inj = []
    for inj in injuries:
        player = inj.get("player") or {}
        team   = inj.get("team")   or {}
        t_id   = team.get("id")
        entry  = {
            "player_id":   player.get("id"),
            "player_name": player.get("name"),
            "player_photo":player.get("photo"),
            "type":        player.get("type"),
            "reason":      player.get("reason"),
            "team_id":     t_id,
            "team_name":   team.get("name"),
            "team_logo":   team.get("logo"),
        }
        if t_id == home_id:        home_inj.append(entry)
        elif t_id == away_id:      away_inj.append(entry)
    return {"home": home_inj, "away": away_inj}


def _norm_team_stats(raw: Dict) -> Dict:
    """Flatten teams/statistics response into a compact summary."""
    if not raw:
        return {}
    goals_f = raw.get("goals", {}).get("for",     {})
    goals_a = raw.get("goals", {}).get("against",  {})
    fixtures= raw.get("fixtures", {})

    return {
        "played":          fixtures.get("played", {}).get("total"),
        "wins":            fixtures.get("wins",   {}).get("total"),
        "draws":           fixtures.get("draws",  {}).get("total"),
        "losses":          fixtures.get("loses",  {}).get("total"),
        "goals_for_total": (goals_f.get("total") or {}).get("total"),
        "goals_for_avg":   (goals_f.get("average") or {}).get("total"),
        "goals_against_total": (goals_a.get("total") or {}).get("total"),
        "goals_against_avg":   (goals_a.get("average") or {}).get("total"),
        "clean_sheets":    raw.get("clean_sheet", {}).get("total"),
        "failed_to_score": raw.get("failed_to_score", {}).get("total"),
        "form":            raw.get("form"),
        "biggest_wins":    raw.get("biggest", {}).get("wins"),
        "biggest_losses":  raw.get("biggest", {}).get("loses"),
        "avg_goals_ft_home": (goals_f.get("average") or {}).get("home"),
        "avg_goals_ft_away": (goals_f.get("average") or {}).get("away"),
        "penalty_scored_pct": (raw.get("penalty") or {}).get("scored", {}).get("percentage"),
        "lineups_used":    [
            {"formation": l.get("formation"), "played": l.get("played")}
            for l in (raw.get("lineups") or [])[:3]
        ],
    }


def _norm_venue(raw: Dict) -> Dict:
    if not raw:
        return {}
    return {
        "id":       raw.get("id"),
        "name":     raw.get("name"),
        "city":     raw.get("city"),
        "country":  raw.get("country"),
        "capacity": raw.get("capacity"),
        "surface":  raw.get("surface"),
        "image":    raw.get("image"),
    }


# ═══════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════

async def get_match_intelligence(fixture_id: int, prediction: Optional[Dict] = None) -> Dict:
    """
    Fetch all data for a fixture in parallel and return a unified object.

    Parameters
    ──────────
    fixture_id  : API-Football fixture ID
    prediction  : optional dict from predict_match() — injected by main.py

    Returns
    ───────
    {
        header, events, lineups, statistics,
        h2h, injuries, venue,
        home_season_stats, away_season_stats,
        prediction,
        _meta: { fixture_id, fetched_at, cache_hits }
    }
    """
    full_key = f"full_intelligence:{fixture_id}"
    cached   = _get(full_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        # ── Phase 1: fetch core fixture to get team/venue IDs ──────────
        core = await _fixture_core(client, fixture_id)

        if not core:
            return {"error": "Fixture not found", "fixture_id": fixture_id}

        home_id   = (core.get("teams", {}).get("home") or {}).get("id", 0)
        away_id   = (core.get("teams", {}).get("away") or {}).get("id", 0)
        league_id = (core.get("league") or {}).get("id", 0)
        venue_id  = (core.get("fixture", {}).get("venue") or {}).get("id", 0)

        # ── Phase 2: fire all remaining requests in parallel ────────────
        (
            events, lineups, statistics,
            h2h_raw, injuries_raw,
            home_stats_raw, away_stats_raw,
            venue_raw,
        ) = await asyncio.gather(
            _fixture_events(client, fixture_id),
            _fixture_lineups(client, fixture_id),
            _fixture_statistics(client, fixture_id),
            _h2h(client, home_id, away_id),
            _injuries(client, fixture_id),
            _team_stats(client, home_id, league_id),
            _team_stats(client, away_id, league_id),
            _venue(client, venue_id),
        )

    # ── Normalise ────────────────────────────────────────────────────
    result = {
        "header":            _norm_header(core),
        "events":            _norm_events(events),
        "lineups":           _norm_lineup(lineups),
        "statistics":        _norm_statistics(statistics, home_id, away_id),
        "h2h":               _norm_h2h(h2h_raw, home_id, away_id),
        "injuries":          _norm_injuries(injuries_raw, home_id, away_id),
        "venue":             _norm_venue(venue_raw),
        "home_season_stats": _norm_team_stats(home_stats_raw),
        "away_season_stats": _norm_team_stats(away_stats_raw),
        "prediction":        prediction or {},
        "_meta": {
            "fixture_id": fixture_id,
            "fetched_at": time.time(),
        },
    }

    # Cache the full object for 10 minutes (shortest individual TTL)
    _store[full_key] = result
    _ts[full_key]    = time.time()
    TTL[full_key.split(":")[0]] = 600

    return result