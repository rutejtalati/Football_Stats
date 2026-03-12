# ═════════════════════════════════════════════════════
# backend/app/routes/lineups.py
#
# Registers: GET /api/match-lineup/{fixture_id}
# ═════════════════════════════════════════════════════

import asyncio
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api")

API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
API_BASE       = "https://v3.football.api-sports.io"
CURRENT_SEASON = 2025

# Lineups are typically announced ~60 min before kickoff
ANNOUNCE_WINDOW_MINUTES = 60


# ─────────────────────────────────────────────
# Low-level API helper
# ─────────────────────────────────────────────

async def _call(path: str, params: dict) -> dict:
    """Single async API-Football request."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{API_BASE}/{path.lstrip('/')}",
            headers={"x-apisports-key": API_KEY},
            params=params,
        )
        r.raise_for_status()
        return r.json()


# ─────────────────────────────────────────────
# Field normalisers
# ─────────────────────────────────────────────

_POS_MAP = {
    "G": "GK", "GK": "GK", "Goalkeeper": "GK",
    "D": "DEF", "CB": "CB", "LB": "LB", "RB": "RB",
    "LWB": "LWB", "RWB": "RWB", "Defender": "DEF",
    "M": "MID", "CM": "CM", "CDM": "CDM", "CAM": "CAM",
    "LM": "LM", "RM": "RM", "DM": "CDM", "AM": "CAM",
    "Midfielder": "MID",
    "F": "FWD", "ST": "ST", "LW": "LW", "RW": "RW",
    "CF": "ST", "SS": "SS", "Forward": "FWD", "Attacker": "FWD",
}

_VALID_FORMATIONS = {
    "4-3-3", "4-4-2", "4-2-3-1", "3-4-3",
    "3-5-2", "4-5-1", "4-1-4-1", "5-3-2",
    "4-3-2-1", "3-4-2-1",
}

_FORMATION_SLOTS = {
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


def _norm_pos(raw: str) -> str:
    return _POS_MAP.get((raw or "").strip(), (raw or "MID").strip().upper()[:3])


def _norm_formation(raw: str) -> str:
    if not raw:
        return "4-3-3"
    s = str(raw).strip()
    if s in _VALID_FORMATIONS:
        return s
    digits = [c for c in s if c.isdigit()]
    if len(digits) == 3:
        return f"{digits[0]}-{digits[1]}-{digits[2]}"
    if len(digits) == 4:
        return f"{digits[0]}-{digits[1]}-{digits[2]}-{digits[3]}"
    return "4-3-3"


def _norm_player_official(entry: dict) -> dict:
    """Normalise a player entry from /fixtures/lineups response."""
    p = entry.get("player", {})
    return {
        "id":     p.get("id"),
        "name":   p.get("name", ""),
        "number": p.get("number"),
        "photo":  p.get("photo", ""),
        "pos":    _norm_pos(p.get("pos", "MID")),
        "grid":   p.get("grid"),
        "rating": None,
    }


# ─────────────────────────────────────────────
# Prediction engine (self-contained)
# ─────────────────────────────────────────────

def _score_player(stats: dict) -> float:
    """
    score = 0.40 * minutes_weight
          + 0.25 * rating
          + 0.20 * form (proxy: rating again)
          + 0.10 * goal_contrib
          + 0.05 * consistency
    """
    games    = stats.get("games", {})
    goals    = stats.get("goals", {})
    appeared = max(games.get("appearences") or 0, 1)
    minutes  = games.get("minutes") or 0
    rating   = float(games.get("rating") or 0)
    g        = goals.get("total") or 0
    a        = goals.get("assists") or 0

    min_w  = min(minutes / (appeared * 90), 1.0)
    form   = min(rating / 10.0, 1.0)
    gc     = min((g + a) / appeared, 1.0)
    consist = min(appeared / 20.0, 1.0)

    return round(0.40 * min_w + 0.25 * form + 0.20 * form + 0.10 * gc + 0.05 * consist, 4)


def _pos_group(pos: str) -> str:
    pos = pos.upper()
    if pos == "GK":
        return "GK"
    if pos in ("CB","LB","RB","LWB","RWB","DEF"):
        return "DEF"
    if pos in ("CM","CDM","CAM","LM","RM","MID","DM","AM"):
        return "MID"
    return "FWD"


def _build_xi(players: list, formation: str, excluded_ids: set) -> tuple:
    slots     = _FORMATION_SLOTS.get(formation, _FORMATION_SLOTS["4-3-3"])
    available = [p for p in players if p["id"] not in excluded_ids]

    by_grp: dict = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available:
        by_grp.setdefault(_pos_group(p["pos"]), []).append(p)
    for grp in by_grp:
        by_grp[grp].sort(key=lambda x: -(x.get("score") or 0))

    xi, used = [], set()
    for slot in slots:
        grp  = _pos_group(slot)
        pool = [p for p in by_grp.get(grp, []) if p["id"] not in used]
        if not pool:
            pool = [p for p in available if p["id"] not in used]
        if pool:
            chosen = {**pool[0], "pos": slot}
            xi.append(chosen)
            used.add(pool[0]["id"])

    bench = sorted(
        [p for p in available if p["id"] not in used],
        key=lambda x: -(x.get("score") or 0)
    )[:7]

    return xi, bench


async def _predict_for_team(
    team_id: int, season: int,
    team_name: str, team_logo: str,
) -> dict:
    """Run the full prediction pipeline for one team."""

    print(f"[lineup_engine] Predicting lineup for team {team_id} season {season}")

    async def fetch_squad():
        try:
            d = await _call("/players/squads", {"team": team_id})
            return d.get("response", [{}])[0].get("players", [])
        except Exception as e:
            print(f"[lineup_engine] squad fetch failed: {e}")
            return []

    async def fetch_stats():
        try:
            d = await _call("/players", {"team": team_id, "season": season})
            return {
                e["player"]["id"]: e.get("statistics", [{}])[0]
                for e in d.get("response", [])
                if e.get("player", {}).get("id")
            }
        except Exception as e:
            print(f"[lineup_engine] stats fetch failed: {e}")
            return {}

    async def fetch_formation():
        try:
            d = await _call("/fixtures", {"team": team_id, "season": season, "last": 5, "status": "FT"})
            formations = []
            for fx in d.get("response", []):
                for lu in fx.get("lineups", []):
                    if lu.get("team", {}).get("id") == team_id:
                        f = lu.get("formation", "")
                        if f:
                            formations.append(_norm_formation(f))
            if formations:
                from collections import Counter
                return Counter(formations).most_common(1)[0][0]
        except Exception as e:
            print(f"[lineup_engine] formation fetch failed: {e}")
        return "4-3-3"

    async def fetch_injuries():
        try:
            d = await _call("/injuries", {"team": team_id, "season": season})
            injured, doubtful = [], []
            for e in d.get("response", []):
                p = e.get("player", {})
                entry = {
                    "id":     p.get("id"),
                    "name":   p.get("name", ""),
                    "photo":  p.get("photo", ""),
                    "reason": e.get("reason", ""),
                    "type":   e.get("type", "Injury"),
                }
                if e.get("type") == "Injury":
                    injured.append(entry)
                else:
                    doubtful.append(entry)
            return injured, doubtful
        except Exception as e:
            print(f"[lineup_engine] injuries fetch failed: {e}")
            return [], []

    async def fetch_coach():
        try:
            d = await _call("/coachs", {"team": team_id})
            resp = d.get("response", [])
            if resp:
                return resp[0].get("name", ""), resp[0].get("photo", "")
        except Exception:
            pass
        return "", ""

    async def fetch_form():
        try:
            d = await _call("/fixtures", {"team": team_id, "season": season, "last": 5, "status": "FT"})
            form = []
            for fx in d.get("response", []):
                t = fx.get("teams", {})
                g = fx.get("goals", {})
                is_home = t.get("home", {}).get("id") == team_id
                scored   = g.get("home", 0) if is_home else g.get("away", 0)
                conceded = g.get("away", 0) if is_home else g.get("home", 0)
                form.append("W" if scored > conceded else "D" if scored == conceded else "L")
            return form[-5:]
        except Exception:
            return []

    squad, stats_map, formation, (injured, doubtful), (coach, coach_photo), recent_form = (
        await asyncio.gather(
            fetch_squad(), fetch_stats(), fetch_formation(),
            fetch_injuries(), fetch_coach(), fetch_form(),
        )
    )

    injured_ids = {p["id"] for p in injured if p.get("id")}

    players = []
    for sp in squad:
        pid  = sp.get("id")
        stat = stats_map.get(pid, {})
        pos  = _norm_pos(sp.get("position", "MID"))
        players.append({
            "id":          pid,
            "name":        sp.get("name", ""),
            "number":      sp.get("number"),
            "photo":       sp.get("photo", ""),
            "pos":         pos,
            "score":       _score_player({"games": stat.get("games",{}), "goals": stat.get("goals",{})}),
            "rating":      float(stat.get("games",{}).get("rating") or 0) or None,
            "nationality": sp.get("nationality", ""),
        })

    starting_xi, bench = _build_xi(players, formation, injured_ids)

    print(f"[lineup_engine] Predicted: {formation}, {len(starting_xi)} starters, {len(bench)} bench")

    return {
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
# Normalise official lineup from API-Football
# ─────────────────────────────────────────────

def _normalise_official(raw: dict, injuries: list, doubts: list) -> dict:
    team  = raw.get("team",  {})
    coach = raw.get("coach", {})
    return {
        "team_name":   team.get("name", ""),
        "logo":        team.get("logo", ""),
        "formation":   _norm_formation(raw.get("formation", "")),
        "coach":       coach.get("name", ""),
        "coach_photo": coach.get("photo", ""),
        "starting_xi": [_norm_player_official(e) for e in raw.get("startXI",     [])],
        "bench":       [_norm_player_official(e) for e in raw.get("substitutes", [])],
        "injuries":    injuries,
        "doubts":      doubts,
        "recent_form": [],
    }


# ─────────────────────────────────────────────
# Public endpoint
# ─────────────────────────────────────────────

@router.get("/match-lineup/{fixture_id}")
async def get_match_lineup(fixture_id: int):
    """
    Returns normalised lineup data.

    Response:
    {
        mode: "official" | "predicted",
        announced_at: str | null,
        home: { team_name, logo, formation, coach, starting_xi, bench, injuries, doubts, recent_form },
        away: { ... }
    }
    """
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    print(f"[lineups] GET /api/match-lineup/{fixture_id}")

    # ── Fetch fixture + official lineups in parallel ──
    async def get_fixture():
        d = await _call("/fixtures", {"id": fixture_id})
        return (d.get("response") or [{}])[0]

    async def get_official():
        d = await _call("/fixtures/lineups", {"fixture": fixture_id})
        return d.get("response", [])

    try:
        fixture, official_raw = await asyncio.gather(get_fixture(), get_official())
    except Exception as e:
        print(f"[lineups] fixture fetch error: {e}")
        raise HTTPException(502, f"Upstream API error: {e}")

    if not fixture:
        raise HTTPException(404, f"Fixture {fixture_id} not found")

    fix      = fixture.get("fixture", {})
    teams    = fixture.get("teams",   {})
    league   = fixture.get("league",  {})

    home_team    = teams.get("home", {})
    away_team    = teams.get("away", {})
    home_id      = home_team.get("id")
    away_id      = away_team.get("id")
    league_id    = league.get("id")
    season       = league.get("season") or CURRENT_SEASON
    kickoff      = fix.get("date")

    # ── Decide mode ───────────────────────────
    has_official = len(official_raw) >= 2

    if not has_official and kickoff:
        try:
            ko  = datetime.fromisoformat(kickoff.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            mins_until = (ko - now).total_seconds() / 60
            if mins_until <= ANNOUNCE_WINDOW_MINUTES:
                has_official = False  # window passed but no lineups yet → still predict
        except Exception:
            pass

    # ── Official path ─────────────────────────
    if has_official:
        print(f"[lineups] Official lineups found for fixture {fixture_id}")

        async def home_inj():
            try:
                d = await _call("/injuries", {"team": home_id, "season": season})
                return [{"id": e["player"].get("id"), "name": e["player"].get("name",""), "photo": e["player"].get("photo",""), "reason": e.get("reason",""), "type": e.get("type","Injury")}
                        for e in d.get("response", [])]
            except Exception:
                return []

        async def away_inj():
            try:
                d = await _call("/injuries", {"team": away_id, "season": season})
                return [{"id": e["player"].get("id"), "name": e["player"].get("name",""), "photo": e["player"].get("photo",""), "reason": e.get("reason",""), "type": e.get("type","Injury")}
                        for e in d.get("response", [])]
            except Exception:
                return []

        home_injuries, away_injuries = await asyncio.gather(home_inj(), away_inj())

        home_raw = next((l for l in official_raw if l.get("team",{}).get("id") == home_id), official_raw[0] if official_raw else {})
        away_raw = next((l for l in official_raw if l.get("team",{}).get("id") == away_id), official_raw[1] if len(official_raw) > 1 else {})

        home_data = _normalise_official(home_raw, home_injuries, [])
        away_data = _normalise_official(away_raw, away_injuries, [])

        return {
            "mode":         "official",
            "announced_at": kickoff,
            "home":         home_data,
            "away":         away_data,
        }

    # ── Predicted path ────────────────────────
    print(f"[lineups] No official lineups yet — generating predictions for fixture {fixture_id}")

    home_data, away_data = await asyncio.gather(
        _predict_for_team(home_id, season, home_team.get("name",""), home_team.get("logo","")),
        _predict_for_team(away_id, season, away_team.get("name",""), away_team.get("logo","")),
    )

    return {
        "mode":         "predicted",
        "announced_at": None,
        "home":         home_data,
        "away":         away_data,
    }