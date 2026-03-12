# ═════════════════════════════════════════════════════
# lineup_engine.py
# Lineup prediction engine for StatinSite
# ═════════════════════════════════════════════════════

import asyncio
from collections import Counter
from datetime import date, timedelta
from typing import Optional
import httpx

# ─────────────────────────────────────────────
# API helper (injected at call-site)
# ─────────────────────────────────────────────

API_BASE = "https://v3.football.api-sports.io"


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
    # Try inserting dashes: "433" → "4-3-3"
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


def _slots_for_formation(formation: str) -> list[str]:
    return FORMATION_SLOTS.get(formation, FORMATION_SLOTS["4-3-3"])


# ─────────────────────────────────────────────
# Player scoring
# ─────────────────────────────────────────────

def _score_player(p: dict) -> float:
    """
    score = 0.4 * minutes_weight + 0.3 * form + 0.2 * goal_contrib + 0.1 * rating
    """
    stats = p.get("stats") or {}
    games = stats.get("games") or {}
    goals = stats.get("goals") or {}

    minutes  = games.get("minutes") or 0
    rating   = float(games.get("rating") or 0)
    appeared = games.get("appearences") or 0
    g        = goals.get("total") or 0
    a        = goals.get("assists") or 0

    # minutes weight — normalised to ~90 min avg
    min_weight = min(minutes / max(appeared * 90, 1), 1.0) if appeared > 0 else 0

    # form: recent rating normalised to 0-1
    form = min(rating / 10.0, 1.0)

    # goal contribution per appearance
    gc = (g + a) / max(appeared, 1)
    gc_score = min(gc, 1.0)

    # overall rating
    rating_score = form  # reuse

    score = (
        0.40 * min_weight +
        0.30 * form +
        0.20 * gc_score +
        0.10 * rating_score
    )
    return round(score, 4)


# ─────────────────────────────────────────────
# Formation prediction from last matches
# ─────────────────────────────────────────────

async def _predict_formation(team_id: int, season: int, api_key: str) -> str:
    try:
        today = date.today().isoformat()
        start = (date.today() - timedelta(days=60)).isoformat()
        data = await _api(
            "/fixtures",
            {"team": team_id, "season": season, "from": start, "to": today, "status": "FT", "last": 5},
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
            counter = Counter(formations)
            return counter.most_common(1)[0][0]
    except Exception:
        pass
    return "4-3-3"


# ─────────────────────────────────────────────
# Fetch squad + player stats
# ─────────────────────────────────────────────

async def _fetch_squad_with_stats(team_id: int, season: int, api_key: str) -> list[dict]:
    """Returns list of player dicts with stats merged in."""
    try:
        # Squad
        squad_data = await _api("/players/squads", {"team": team_id}, api_key)
        squad      = squad_data.get("response", [{}])[0].get("players", [])

        # Player stats (paginated — page 1 covers most squads)
        stats_data = await _api(
            "/players",
            {"team": team_id, "season": season, "page": 1},
            api_key,
        )
        stats_by_id: dict[int, dict] = {}
        for entry in stats_data.get("response", []):
            pid   = entry.get("player", {}).get("id")
            pstat = entry.get("statistics", [{}])[0]
            if pid:
                stats_by_id[pid] = {
                    "games": pstat.get("games", {}),
                    "goals": pstat.get("goals", {}),
                    "rating": float((pstat.get("games") or {}).get("rating") or 0),
                }

        players = []
        for sp in squad:
            pid   = sp.get("id")
            pos   = _norm_pos(sp.get("position", "MID"))
            stat  = stats_by_id.get(pid, {})
            score = _score_player({"stats": stat})
            players.append({
                "id":          pid,
                "name":        sp.get("name", ""),
                "number":      sp.get("number"),
                "photo":       sp.get("photo", ""),
                "nationality": sp.get("nationality", ""),
                "pos":         pos,
                "pos_group":   _pos_group(pos),
                "score":       score,
                "rating":      stat.get("rating") or None,
                "minutes":     (stat.get("games") or {}).get("minutes") or 0,
                "goals":       (stat.get("goals") or {}).get("total") or 0,
                "assists":     (stat.get("goals") or {}).get("assists") or 0,
            })
        return players
    except Exception:
        return []


# ─────────────────────────────────────────────
# Fetch injuries
# ─────────────────────────────────────────────

async def _fetch_injuries(team_id: int, season: int, api_key: str) -> tuple[list, list]:
    """Returns (injured, doubtful) player dicts."""
    injured  = []
    doubtful = []
    try:
        data = await _api("/injuries", {"team": team_id, "season": season}, api_key)
        for entry in data.get("response", []):
            p      = entry.get("player", {})
            reason = entry.get("reason", "")
            entry_type = entry.get("type", "Injury")
            pdata = {
                "id":     p.get("id"),
                "name":   p.get("name", ""),
                "photo":  p.get("photo", ""),
                "reason": reason,
                "type":   entry_type,
            }
            if entry_type in ("Injury",):
                injured.append(pdata)
            else:
                doubtful.append(pdata)
    except Exception:
        pass
    return injured, doubtful


# ─────────────────────────────────────────────
# Build predicted lineup
# ─────────────────────────────────────────────

def _build_xi_and_bench(players: list[dict], formation: str, injured_ids: set) -> tuple[list, list]:
    """
    Select starting XI based on formation slots.
    Returns (starting_xi, bench).
    """
    slots = _slots_for_formation(formation)

    # Exclude injured/suspended
    available = [p for p in players if p["id"] not in injured_ids]

    # Group by position group, sorted by score desc
    by_group: dict[str, list] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available:
        grp = p.get("pos_group", "MID")
        if grp in by_group:
            by_group[grp].append(p)
        else:
            by_group["MID"].append(p)

    for grp in by_group:
        by_group[grp].sort(key=lambda x: -x["score"])

    # Assign slots
    xi       = []
    used_ids = set()
    gk_count = def_count = mid_count = fwd_count = 0

    for slot in slots:
        grp = _pos_group(slot)
        candidates = [p for p in by_group.get(grp, []) if p["id"] not in used_ids]
        if not candidates:
            # Fallback: grab best available from any group
            candidates = [p for p in available if p["id"] not in used_ids]
        if candidates:
            chosen = candidates[0]
            chosen_with_pos = {**chosen, "pos": slot}  # assign formation slot position
            xi.append(chosen_with_pos)
            used_ids.add(chosen["id"])

    # Bench: remaining available players sorted by score
    bench = sorted(
        [p for p in available if p["id"] not in used_ids],
        key=lambda x: -x["score"]
    )[:7]

    return xi, bench


# ─────────────────────────────────────────────
# Main predict_lineup function
# ─────────────────────────────────────────────

async def predict_lineup(
    team_id: int,
    league_id: int,
    season: int,
    api_key: str,
    coach: str = "",
    coach_photo: str = "",
    team_name: str = "",
    team_logo: str = "",
) -> dict:
    """
    Predict lineup for a team. Returns normalised lineup dict.
    """

    # Parallel: formation + squad + injuries
    formation_task = _predict_formation(team_id, season, api_key)
    squad_task     = _fetch_squad_with_stats(team_id, season, api_key)
    injury_task    = _fetch_injuries(team_id, season, api_key)

    formation, players, (injured, doubtful) = await asyncio.gather(
        formation_task, squad_task, injury_task
    )

    injured_ids = {p["id"] for p in injured if p.get("id")}

    starting_xi, bench = _build_xi_and_bench(players, formation, injured_ids)

    # Recent form
    recent_form = await _team_recent_form(team_id, season, api_key)

    return {
        "team_id":     team_id,
        "team_name":   team_name,
        "logo":        team_logo,
        "formation":   formation,
        "coach":       coach,
        "coach_photo": coach_photo,
        "starting_xi": starting_xi,
        "bench":       bench,
        "injuries":    injured,
        "doubts":      doubtful,
        "recent_form": recent_form,
    }


# ─────────────────────────────────────────────
# Recent form helper
# ─────────────────────────────────────────────

async def _team_recent_form(team_id: int, season: int, api_key: str) -> list[str]:
    try:
        today = date.today().isoformat()
        data  = await _api(
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
            scored    = hg if is_home else ag
            conceded  = ag if is_home else hg
            if scored > conceded:
                form.append("W")
            elif scored == conceded:
                form.append("D")
            else:
                form.append("L")
        return form[-5:]
    except Exception:
        return []


# ─────────────────────────────────────────────
# Official lineup normaliser
# ─────────────────────────────────────────────

def normalise_official_lineup(
    lineup_raw: dict,
    injuries: list,
    doubts: list,
) -> dict:
    """
    Normalise API-Football /fixtures/lineups response into our format.
    """
    team    = lineup_raw.get("team",  {})
    coach   = lineup_raw.get("coach", {})
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
        "team_id":   team.get("id"),
        "team_name": team.get("name", ""),
        "logo":      team.get("logo", ""),
        "formation": _normalise_formation(lineup_raw.get("formation", "")),
        "coach":     coach.get("name", ""),
        "coach_photo": coach.get("photo", ""),
        "starting_xi": [_map(e) for e in xi_raw],
        "bench":       [_map(e) for e in sub_raw],
        "injuries":    injuries,
        "doubts":      doubts,
        "recent_form": [],
    }