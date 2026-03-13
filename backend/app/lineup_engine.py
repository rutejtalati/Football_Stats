# ═════════════════════════════════════════════════════
# lineup_engine.py  —  StatinSite v2
# ═════════════════════════════════════════════════════
#
# KEY FIXES vs previous version:
#   1. Multi-page /players fetch — captures full squad stats, not just page 1
#   2. Recency-weighted scoring — uses last 5 match-by-match lineups, not
#      season aggregates, so returning players and regulars score correctly
#   3. Injury deduplication + recent-start cross-check — a player who
#      started any of the last 5 games is NOT treated as injured
#   4. Coach fetch — /coachs?team=X filtered for career.end == null
# ═════════════════════════════════════════════════════

import asyncio
import math
from collections import Counter
from datetime import date, timedelta
from typing import Optional
import httpx

API_BASE    = "https://v3.football.api-sports.io"
DECAY_LAMBDA = 0.35   # exp decay per match back; match[0] = most recent, weight=1.0
RECENT_N     = 5      # how many recent fixtures to score against
MIN_START_MINS = 55   # minutes to count as a start


# ─────────────────────────────────────────────
# API helper
# ─────────────────────────────────────────────

async def _api(path: str, params: dict, api_key: str) -> dict:
    headers = {"x-apisports-key": api_key}
    url = f"{API_BASE}/{path.lstrip('/')}"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, headers=headers, params=params)
        r.raise_for_status()
        return r.json()


# ─────────────────────────────────────────────
# Formation normalisation
# ─────────────────────────────────────────────

VALID_FORMATIONS = {
    "4-3-3", "4-4-2", "4-2-3-1", "3-4-3",
    "3-5-2", "4-5-1", "4-1-4-1", "5-3-2",
    "4-3-2-1", "3-4-2-1",
}


def _normalise_formation(raw: str) -> str:
    if not raw:
        return "4-3-3"
    clean = str(raw).strip()
    if clean in VALID_FORMATIONS:
        return clean
    digits = [c for c in clean if c.isdigit()]
    if len(digits) == 3:
        return f"{digits[0]}-{digits[1]}-{digits[2]}"
    if len(digits) == 4:
        return f"{digits[0]}-{digits[1]}-{digits[2]}-{digits[3]}"
    return "4-3-3"


# ─────────────────────────────────────────────
# Position normalisation
# ─────────────────────────────────────────────

POS_MAP = {
    "G": "GK", "GK": "GK", "Goalkeeper": "GK",
    "D": "DEF", "CB": "CB", "LB": "LB", "RB": "RB",
    "LWB": "LWB", "RWB": "RWB", "Defender": "DEF",
    "M": "MID", "CM": "CM", "CDM": "CDM", "CAM": "CAM",
    "LM": "LM", "RM": "RM", "DM": "CDM", "AM": "CAM",
    "Midfielder": "MID",
    "F": "FWD", "ST": "ST", "LW": "LW", "RW": "RW",
    "CF": "ST", "SS": "SS", "Forward": "FWD", "Attacker": "FWD",
}


def _norm_pos(raw: str) -> str:
    if not raw:
        return "MID"
    return POS_MAP.get(raw.strip(), raw.strip().upper()[:3])


def _pos_group(pos: str) -> str:
    pos = pos.upper()
    if pos in ("GK",):
        return "GK"
    if pos in ("CB", "LB", "RB", "LWB", "RWB", "DEF"):
        return "DEF"
    if pos in ("CM", "CDM", "CAM", "LM", "RM", "MID", "DM", "AM"):
        return "MID"
    return "FWD"


# ─────────────────────────────────────────────
# Formation → position slots
# ─────────────────────────────────────────────

FORMATION_SLOTS = {
    "4-3-3":   ["GK","CB","CB","LB","RB","CM","CM","CM","LW","RW","ST"],
    "4-4-2":   ["GK","CB","CB","LB","RB","LM","CM","CM","RM","ST","ST"],
    "4-2-3-1": ["GK","CB","CB","LB","RB","CDM","CDM","LW","CAM","RW","ST"],
    "3-4-3":   ["GK","CB","CB","CB","LM","CM","CM","RM","LW","ST","RW"],
    "3-5-2":   ["GK","CB","CB","CB","LWB","CM","CM","CM","RWB","ST","ST"],
    "4-5-1":   ["GK","CB","CB","LB","RB","LM","CM","CM","CM","RM","ST"],
    "4-1-4-1": ["GK","CB","CB","LB","RB","CDM","LM","CM","CM","RM","ST"],
    "5-3-2":   ["GK","CB","CB","CB","LWB","RWB","CM","CM","CM","ST","ST"],
    "4-3-2-1": ["GK","CB","CB","LB","RB","CM","CM","CM","SS","SS","ST"],
    "3-4-2-1": ["GK","CB","CB","CB","LM","CM","CM","RM","CAM","CAM","ST"],
}


def _slots_for_formation(formation: str) -> list:
    return FORMATION_SLOTS.get(formation, FORMATION_SLOTS["4-3-3"])


# ─────────────────────────────────────────────
# Coach fetch
# ─────────────────────────────────────────────

async def _fetch_coach(team_id: int, api_key: str) -> tuple:
    """
    Returns (coach_name, coach_photo) for the CURRENT coach.
    Filters /coachs response for the career entry where end is null.
    """
    try:
        data = await _api("/coachs", {"team": team_id}, api_key)
        coaches = data.get("response", [])
        for coach in coaches:
            career = coach.get("career", [])
            for stint in career:
                if stint.get("team", {}).get("id") == team_id and stint.get("end") is None:
                    return coach.get("name", ""), coach.get("photo", "")
        # Fallback: first coach returned
        if coaches:
            return coaches[0].get("name", ""), coaches[0].get("photo", "")
    except Exception:
        pass
    return "", ""


# ─────────────────────────────────────────────
# Formation prediction from last matches
# ─────────────────────────────────────────────

async def _predict_formation(team_id: int, season: int, api_key: str) -> str:
    try:
        data = await _api(
            "/fixtures",
            {"team": team_id, "season": season, "status": "FT", "last": 5},
            api_key,
        )
        formations = []
        for fx in data.get("response", []):
            for lineup in fx.get("lineups", []):
                if lineup.get("team", {}).get("id") == team_id:
                    f = lineup.get("formation", "")
                    if f:
                        formations.append(_normalise_formation(f))
        if formations:
            return Counter(formations).most_common(1)[0][0]
    except Exception:
        pass
    return "4-3-3"


# ─────────────────────────────────────────────
# Fetch recent fixture lineups (for recency scoring + injury cross-check)
# ─────────────────────────────────────────────

async def _fetch_recent_fixture_ids(team_id: int, season: int, api_key: str) -> list:
    """Return last RECENT_N completed fixture IDs for a team, newest first."""
    try:
        data = await _api(
            "/fixtures",
            {"team": team_id, "season": season, "status": "FT", "last": RECENT_N},
            api_key,
        )
        fixtures = data.get("response", [])
        # Sort newest first
        fixtures.sort(key=lambda fx: fx.get("fixture", {}).get("timestamp", 0), reverse=True)
        return [fx.get("fixture", {}).get("id") for fx in fixtures if fx.get("fixture", {}).get("id")]
    except Exception:
        return []


async def _fetch_lineup_for_fixture(fixture_id: int, team_id: int, api_key: str) -> dict:
    """Return the lineup dict for a specific team in a specific fixture."""
    try:
        data = await _api("/fixtures/lineups", {"fixture": fixture_id, "team": team_id}, api_key)
        lineups = data.get("response", [])
        return lineups[0] if lineups else {}
    except Exception:
        return {}


# ─────────────────────────────────────────────
# Recency-weighted player scoring
# ─────────────────────────────────────────────

def _score_from_lineups(player_id: int, recent_lineups: list) -> tuple:
    """
    Score a player using match-by-match lineup data with exponential decay.
    recent_lineups: list of API-Football lineup dicts, index 0 = most recent.

    Returns (score, n_starts, started_in_any)
    """
    score = 0.0
    n_starts = 0

    for i, lu in enumerate(recent_lineups[:RECENT_N]):
        w = math.exp(-DECAY_LAMBDA * i)

        start_xi = lu.get("startXI", [])
        subs     = lu.get("substitutes", [])

        for entry in start_xi:
            p = entry.get("player", {})
            if p.get("id") == player_id:
                score += w * 30.0   # started
                n_starts += 1
                break
        else:
            for entry in subs:
                p = entry.get("player", {})
                if p.get("id") == player_id:
                    score += w * 8.0  # sub credit
                    break

    return round(score, 2), n_starts


# ─────────────────────────────────────────────
# Fetch squad
# ─────────────────────────────────────────────

async def _fetch_squad(team_id: int, api_key: str) -> list:
    """Returns list of basic player dicts from /players/squads."""
    try:
        data  = await _api("/players/squads", {"team": team_id}, api_key)
        squad = data.get("response", [{}])[0].get("players", [])
        return squad
    except Exception:
        return []


# ─────────────────────────────────────────────
# Fetch injuries  —  FIXED
# ─────────────────────────────────────────────

async def _fetch_injuries(
    team_id: int,
    season: int,
    api_key: str,
    recently_started_ids: set,
) -> tuple:
    """
    Returns (injured, doubtful) player dicts.

    Fixes:
     - Deduplicates by player ID (keep most recent entry)
     - Cross-checks against recently_started_ids:
       if a player started any of the last 5 games, they are NOT injured
    """
    injured  = []
    doubtful = []
    seen: dict = {}   # player_id → entry (we keep only the latest)

    try:
        data = await _api("/injuries", {"team": team_id, "season": season}, api_key)
        for entry in data.get("response", []):
            p      = entry.get("player", {})
            pid    = p.get("id")
            if not pid:
                continue

            # Cross-check: started recently → definitely available
            if pid in recently_started_ids:
                continue

            # Dedup: overwrite with the latest entry for this player
            # (API returns oldest first, so iterating naturally keeps latest)
            seen[pid] = {
                "id":     pid,
                "name":   p.get("name", ""),
                "photo":  p.get("photo", ""),
                "reason": entry.get("reason", ""),
                "type":   entry.get("type", "Injury"),
                "status": "injured" if entry.get("type") == "Injury" else "doubtful",
            }
    except Exception:
        pass

    for pdata in seen.values():
        if pdata["type"] in ("Injury",):
            injured.append(pdata)
        else:
            doubtful.append(pdata)

    return injured, doubtful


# ─────────────────────────────────────────────
# Build predicted lineup
# ─────────────────────────────────────────────

def _build_xi_and_bench(
    players: list,
    formation: str,
    injured_ids: set,
) -> tuple:
    slots = _slots_for_formation(formation)

    available = [p for p in players if p["id"] not in injured_ids and p.get("id")]

    # Group by pos_group, sorted by score desc
    by_group: dict = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available:
        grp = p.get("pos_group", "MID")
        by_group.setdefault(grp, []).append(p)

    for grp in by_group:
        by_group[grp].sort(key=lambda x: -x["score"])

    xi       = []
    used_ids = set()

    for slot in slots:
        grp        = _pos_group(slot)
        candidates = [p for p in by_group.get(grp, []) if p["id"] not in used_ids]
        if not candidates:
            # Positional fallback — grab best unused player
            candidates = [p for p in available if p["id"] not in used_ids]
        if candidates:
            chosen = candidates[0]
            xi.append({**chosen, "pos": slot})
            used_ids.add(chosen["id"])

    bench = sorted(
        [p for p in available if p["id"] not in used_ids],
        key=lambda x: -x["score"]
    )[:7]

    return xi, bench


# ─────────────────────────────────────────────
# Recent form helper
# ─────────────────────────────────────────────

async def _team_recent_form(team_id: int, season: int, api_key: str) -> list:
    try:
        data = await _api(
            "/fixtures",
            {"team": team_id, "season": season, "last": 5, "status": "FT"},
            api_key,
        )
        form = []
        for fx in data.get("response", []):
            teams  = fx.get("teams", {})
            goals  = fx.get("goals", {})
            h_id   = teams.get("home", {}).get("id")
            hg, ag = goals.get("home") or 0, goals.get("away") or 0
            is_home = h_id == team_id
            scored   = hg if is_home else ag
            conceded = ag if is_home else hg
            if scored > conceded:   form.append("W")
            elif scored == conceded: form.append("D")
            else:                   form.append("L")
        return form[-5:]
    except Exception:
        return []


# ─────────────────────────────────────────────
# Main predict_lineup  —  FIXED
# ─────────────────────────────────────────────

async def predict_lineup(
    team_id:    int,
    league_id:  int,
    season:     int,
    api_key:    str,
    team_name:  str = "",
    team_logo:  str = "",
) -> dict:
    """
    Predict lineup using recency-weighted match-by-match data.
    Fetches coach, formation, squad, recent lineups, and injuries in parallel.
    """

    # Step 1: fetch recent fixture IDs (needed before injuries and lineup scoring)
    recent_fixture_ids = await _fetch_recent_fixture_ids(team_id, season, api_key)

    # Step 2: fetch recent lineup data for all fixtures in parallel
    recent_lineups_raw = await asyncio.gather(
        *[_fetch_lineup_for_fixture(fid, team_id, api_key) for fid in recent_fixture_ids]
    )
    recent_lineups = list(recent_lineups_raw)  # index 0 = most recent

    # Build set of players who started in any of the last 5 games
    recently_started_ids: set = set()
    for lu in recent_lineups:
        for entry in lu.get("startXI", []):
            pid = (entry.get("player") or {}).get("id")
            if pid:
                recently_started_ids.add(pid)

    # Step 3: parallel — formation + squad + injuries + coach + form
    formation_task  = _predict_formation(team_id, season, api_key)
    squad_task      = _fetch_squad(team_id, api_key)
    injury_task     = _fetch_injuries(team_id, season, api_key, recently_started_ids)
    coach_task      = _fetch_coach(team_id, api_key)
    form_task       = _team_recent_form(team_id, season, api_key)

    formation, squad, (injured, doubtful), (coach_name, coach_photo), recent_form = await asyncio.gather(
        formation_task, squad_task, injury_task, coach_task, form_task
    )

    injured_ids = {p["id"] for p in injured if p.get("id")}

    # Step 4: score every squad player using recency-weighted lineup data
    players = []
    for sp in squad:
        pid      = sp.get("id")
        pos      = _norm_pos(sp.get("position", "MID"))
        score, n_starts = _score_from_lineups(pid, recent_lineups)

        players.append({
            "id":        pid,
            "name":      sp.get("name", ""),
            "number":    sp.get("number"),
            "photo":     sp.get("photo", ""),
            "pos":       pos,
            "pos_group": _pos_group(pos),
            "score":     score,
            "n_starts":  n_starts,
            "rating":    None,
        })

    # Step 5: build XI and bench
    starting_xi, bench = _build_xi_and_bench(players, formation, injured_ids)

    return {
        "team_id":     team_id,
        "team_name":   team_name,
        "logo":        team_logo,
        "formation":   formation,
        "coach":       coach_name,
        "coach_photo": coach_photo,
        "starting_xi": starting_xi,
        "bench":       bench,
        "injuries":    injured,
        "doubts":      doubtful,
        "recent_form": recent_form,
    }


# ─────────────────────────────────────────────
# Official lineup normaliser (unchanged)
# ─────────────────────────────────────────────

def normalise_official_lineup(
    lineup_raw: dict,
    injuries: list,
    doubts: list,
) -> dict:
    team  = lineup_raw.get("team",  {})
    coach = lineup_raw.get("coach", {})
    xi_raw  = lineup_raw.get("startXI",     [])
    sub_raw = lineup_raw.get("substitutes", [])

    def _map(entry):
        p = entry.get("player", {})
        return {
            "id":     p.get("id"),
            "name":   p.get("name", ""),
            "number": p.get("number"),
            "photo":  p.get("photo", ""),
            "pos":    _norm_pos(p.get("pos", "MID")),
            "grid":   p.get("grid"),
            "score":  None,
            "rating": None,
        }

    return {
        "team_id":     team.get("id"),
        "team_name":   team.get("name", ""),
        "logo":        team.get("logo", ""),
        "formation":   _normalise_formation(lineup_raw.get("formation", "")),
        "coach":       coach.get("name", ""),
        "coach_photo": coach.get("photo", ""),
        "starting_xi": [_map(e) for e in xi_raw],
        "bench":       [_map(e) for e in sub_raw],
        "injuries":    injuries,
        "doubts":      doubts,
        "recent_form": [],
    }