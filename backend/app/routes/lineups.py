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

ANNOUNCE_WINDOW_MINUTES = 60


# ─────────────────────────────────────────────
# Low-level API helper
# ─────────────────────────────────────────────

async def _call(path: str, params: dict) -> dict:
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

# ── Grid positions per formation (row:col) — must match slot order above ──
_FORMATION_GRIDS = {
    "4-3-3":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","4:1","4:2","4:3"],
    "4-4-2":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","4:1","4:2"],
    "4-2-3-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    "3-4-3":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","4:1","4:2","4:3"],
    "3-5-2":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","3:5","4:1","4:2"],
    "4-5-1":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    "4-1-4-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    "5-3-2":   ["1:1","2:1","2:2","2:3","2:4","2:5","3:1","3:2","3:3","4:1","4:2"],
    "4-3-2-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","4:1","4:2","4:3"],
    "3-4-2-1": ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","4:1","4:2","4:3"],
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
        "grid":   p.get("grid"),   # official API provides this directly
        "rating": None,
    }


# ─────────────────────────────────────────────
# Prediction engine — exponential-decay scoring
# ─────────────────────────────────────────────

import math as _math

_DECAY        = 0.35   # exp decay per match back in time
_RECENT_LIMIT = 8      # fixtures to consider
_START_MINS   = 55     # minutes to count as a start


def _score_player_recent(player_id: int, recent_fixtures: list) -> float:
    """
    Score based on recency-weighted recent fixture participation.
    Most recent match = weight 1.0, each prior match decays by e^(-0.35).
    +30 per weighted start, +20*mins/90, +8 per goal, +5 per assist, ±5*(rating-6)
    """
    total = 0.0
    for i, fx in enumerate(recent_fixtures[:_RECENT_LIMIT]):
        w = _math.exp(-_DECAY * i)
        # find player in this fixture's player stats
        for team_block in (fx.get("players") or []):
            for entry in (team_block.get("players") or []):
                if (entry.get("player") or {}).get("id") == player_id:
                    s      = (entry.get("statistics") or [{}])[0]
                    games  = s.get("games")  or {}
                    goals_ = s.get("goals")  or {}
                    mins   = int(games.get("minutes")  or 0)
                    rating = float(games.get("rating") or 0)
                    goals  = int(goals_.get("total")   or 0)
                    assists= int(goals_.get("assists")  or 0)
                    total += w * (30.0 if mins >= _START_MINS else 8.0)
                    total += w * (mins / 90.0) * 20.0
                    total += w * (goals * 8.0 + assists * 5.0)
                    if rating > 0:
                        total += w * (rating - 6.0) * 5.0
    return round(total, 2)


def _score_player(stats: dict) -> float:
    """Fallback season-aggregate scorer (used when no recent fixtures available)."""
    games    = stats.get("games", {})
    goals    = stats.get("goals", {})
    appeared = max(games.get("appearences") or 0, 1)
    minutes  = games.get("minutes") or 0
    rating   = float(games.get("rating") or 0)
    g        = goals.get("total") or 0
    a        = goals.get("assists") or 0
    min_w    = min(minutes / (appeared * 90), 1.0)
    form     = min(rating / 10.0, 1.0)
    gc       = min((g + a) / appeared, 1.0)
    return round(0.40 * min_w + 0.30 * form + 0.20 * gc + 0.10 * min(appeared / 20.0, 1.0), 4)


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
    grids     = _FORMATION_GRIDS.get(formation, _FORMATION_GRIDS["4-3-3"])
    available = [p for p in players if p["id"] not in excluded_ids]

    # Group by position group, best score first
    by_grp: dict = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available:
        by_grp.setdefault(_pos_group(p["pos"]), []).append(p)
    for grp in by_grp:
        by_grp[grp].sort(key=lambda x: -(x.get("score") or 0))

    # Fill slots: iterate formation slots in order (GK, then DEF left→right, etc.)
    xi, used = [], set()
    # Track how many of each group have been picked so far
    grp_idx: dict = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}

    for slot_idx, slot in enumerate(slots):
        grp      = _pos_group(slot)
        grp_pool = by_grp.get(grp, [])
        # Find next unused player in this group
        pool     = [p for p in grp_pool if p["id"] not in used]
        if not pool:
            # Fallback: best available from any group
            pool = sorted([p for p in available if p["id"] not in used],
                          key=lambda x: -(x.get("score") or 0))
        if pool:
            grid   = grids[slot_idx] if slot_idx < len(grids) else f"{slot_idx+1}:1"
            chosen = {**pool[0], "pos": slot, "grid": grid}
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
    """
    Predict XI using standard API-Football Pro endpoints:

    Data pulled (3 parallel calls only — avoids rate limits):
      1. /players/squads          → full squad roster + position + photo
      2. /players                 → season stats (minutes, rating, goals, assists)
      3. /fixtures (last 10 FT)   → formation detection, recent form, AND startXI data
                                    (fixtures response includes lineups when available)
      4. /injuries                → current unavailability
      5. /coachs                  → active coach

    Scoring formula per player:
      base_score  = 0.4*(avg_mins_pct) + 0.3*(avg_rating/10) + 0.2*(goal_contrib/app) + 0.1*(appearances/30)
      start_bonus = sum over last 10 matches of: 0.8^match_index if they started
      final_score = base_score * 40 + start_bonus

    This ensures: players who start regularly AND have good season stats rank highest.
    New signings with few season stats but recent starts still rank via start_bonus.
    """
    from collections import Counter
    print(f"[lineup_engine] Predicting for {team_name} ({team_id})")

    # ── 1. Squad roster ────────────────────────────────────────────────
    async def fetch_squad():
        try:
            d = await _call("/players/squads", {"team": team_id})
            return d.get("response", [{}])[0].get("players", [])
        except Exception as e:
            print(f"[lineup_engine] squad failed: {e}"); return []

    # ── 2. Season player stats ─────────────────────────────────────────
    async def fetch_season_stats():
        try:
            d = await _call("/players", {"team": team_id, "season": season, "page": 1})
            stats = {}
            for entry in d.get("response", []):
                pid  = (entry.get("player") or {}).get("id")
                stat = (entry.get("statistics") or [{}])[0]
                if not pid: continue
                g = stat.get("games") or {}
                gl= stat.get("goals") or {}
                stats[pid] = {
                    "minutes":   int(g.get("minutes")     or 0),
                    "appeared":  int(g.get("appearences") or 0),
                    "rating":    float(g.get("rating")    or 0),
                    "goals":     int(gl.get("total")      or 0),
                    "assists":   int(gl.get("assists")     or 0),
                }
            return stats
        except Exception as e:
            print(f"[lineup_engine] season stats failed: {e}"); return {}

    # ── 3. Recent fixtures: formation + form + who started ────────────
    async def fetch_recent_data():
        """
        Single call to /fixtures gets last 10 FT results.
        Then ONE call per fixture to /fixtures/lineups gets startXI.
        We cap at 5 lineup fetches (most recent 5 games) to stay well within rate limits.
        """
        try:
            d = await _call("/fixtures", {
                "team": team_id, "season": season,
                "last": 10, "status": "FT",
            })
            fixtures = d.get("response", [])

            # Formation + form from fixture results
            formations, form_list = [], []
            fixture_ids = []
            for fx in fixtures:
                fix_info = fx.get("fixture", {})
                fixture_ids.append(fix_info.get("id"))
                t  = fx.get("teams",  {}); g = fx.get("goals", {})
                is_home  = t.get("home",{}).get("id") == team_id
                scored   = g.get("home",0) if is_home else g.get("away",0)
                conceded = g.get("away",0) if is_home else g.get("home",0)
                form_list.append("W" if scored > conceded else "D" if scored == conceded else "L")

            # Fetch lineups for last 5 matches only (5 extra calls max)
            starter_recency: dict = {}  # pid → recency_score (higher = started more recently)

            async def get_lineup(fid, match_idx):
                if not fid: return
                try:
                    ld = await _call("/fixtures/lineups", {"fixture": fid})
                    weight = 0.8 ** match_idx   # most recent = 1.0, drops off fast
                    for team_data in ld.get("response", []):
                        if team_data.get("team", {}).get("id") != team_id:
                            continue
                        formation_str = team_data.get("formation", "")
                        if formation_str:
                            formations.append(_norm_formation(formation_str))
                        for entry in team_data.get("startXI", []):
                            pid = (entry.get("player") or {}).get("id")
                            if pid:
                                starter_recency[pid] = starter_recency.get(pid, 0) + weight
                except Exception:
                    pass

            # Fetch lineups for most recent 5 fixtures in parallel
            await asyncio.gather(*[
                get_lineup(fid, idx)
                for idx, fid in enumerate(fixture_ids[:5])
            ])

            formation = Counter(formations).most_common(1)[0][0] if formations else "4-3-3"
            return formation, form_list[-5:], starter_recency

        except Exception as e:
            print(f"[lineup_engine] recent data failed: {e}")
            return "4-3-3", [], {}

    # ── 4. Injuries ────────────────────────────────────────────────────
    async def fetch_injuries():
        try:
            d = await _call("/injuries", {"team": team_id, "season": season})
            seen_inj, seen_dbt = {}, {}
            for e in d.get("response", []):
                p   = e.get("player", {})
                pid = p.get("id")
                if not pid: continue
                inj_type = (e.get("type") or "Injury").strip()
                reason   = (e.get("reason") or "").strip()
                tl, rl   = inj_type.lower(), reason.lower()
                if "suspend" in tl or "suspension" in rl or "card" in rl:
                    status = "suspended"
                elif "doubt" in tl or "question" in tl:
                    status = "doubtful"
                else:
                    status = "injured"
                rec = {"id": pid, "name": p.get("name",""), "photo": p.get("photo",""),
                       "reason": reason, "type": inj_type, "status": status}
                (seen_inj if status == "injured" else seen_dbt)[pid] = rec
            return list(seen_inj.values()), list(seen_dbt.values())
        except Exception as e:
            print(f"[lineup_engine] injuries failed: {e}"); return [], []

    # ── 5. Active coach ────────────────────────────────────────────────
    async def fetch_coach():
        try:
            d = await _call("/coachs", {"team": team_id})
            for c in d.get("response", []):
                for spell in c.get("career", []):
                    if spell.get("team", {}).get("id") == team_id and spell.get("end") is None:
                        return c.get("name",""), c.get("photo","")
            resp = d.get("response", [])
            if resp: return resp[0].get("name",""), resp[0].get("photo","")
        except Exception:
            pass
        return "", ""

    # ── Parallel fetch ────────────────────────────────────────────────
    (squad, season_stats, (formation, recent_form, starter_recency),
     (injured, doubtful), (coach, coach_photo)) = await asyncio.gather(
        fetch_squad(),
        fetch_season_stats(),
        fetch_recent_data(),
        fetch_injuries(),
        fetch_coach(),
    )

    injured_ids = {p["id"] for p in injured + doubtful if p.get("id")}

    # ── Score each player ─────────────────────────────────────────────
    _squad_pos_map = {
        "Goalkeeper": "GK", "Defender": "DEF",
        "Midfielder": "MID", "Attacker": "FWD",
    }

    players = []
    for sp in squad:
        pid = sp.get("id")
        if not pid: continue

        raw_pos = sp.get("position", "Midfielder")
        pos     = _squad_pos_map.get(raw_pos, _norm_pos(raw_pos))
        s       = season_stats.get(pid, {})

        appeared = max(s.get("appeared", 0), 1)
        minutes  = s.get("minutes",  0)
        rating   = s.get("rating",   0.0)
        goals    = s.get("goals",    0)
        assists  = s.get("assists",  0)

        # Season aggregate score (0–1 range each component)
        min_pct    = min(minutes / max(appeared * 90, 1), 1.0) if appeared > 1 else 0.0
        rat_score  = min(rating / 10.0, 1.0)
        gc_score   = min((goals + assists) / max(appeared, 1), 1.0)
        app_score  = min(appeared / 30.0, 1.0)
        base_score = (0.40 * min_pct + 0.30 * rat_score + 0.20 * gc_score + 0.10 * app_score) * 40.0

        # Recency bonus: who actually started recently (0.8^i per start, up to ~5 matches)
        recency = starter_recency.get(pid, 0.0) * 30.0

        # Final score: recency-weighted starts dominate over pure season stats
        final = round(base_score + recency, 3)

        # Small baseline so players with zero stats aren't completely ignored
        if final < 0.5 and appeared > 0:
            final = 0.5

        players.append({
            "id":          pid,
            "name":        sp.get("name", ""),
            "number":      sp.get("number"),
            "photo":       sp.get("photo", ""),
            "pos":         pos,
            "score":       final,
            "rating":      rating or None,
            "nationality": sp.get("nationality", ""),
        })

    print(f"[lineup_engine] {team_name}: {len(players)} squad players, formation={formation}")
    # Debug top 5 per group
    for grp in ("GK","DEF","MID","FWD"):
        top = sorted([p for p in players if _pos_group(p["pos"])==grp],
                     key=lambda x:-x["score"])[:5]
        print(f"  {grp}: {[(p['name'], round(p['score'],1)) for p in top]}")

    starting_xi, bench = _build_xi(players, formation, injured_ids)

    if len(starting_xi) < 11:
        print(f"[lineup_engine] WARNING: only {len(starting_xi)} starters for {team_name}")

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
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    print(f"[lineups] GET /api/match-lineup/{fixture_id}")

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

    home_team = teams.get("home", {})
    away_team = teams.get("away", {})
    home_id   = home_team.get("id")
    away_id   = away_team.get("id")
    season    = league.get("season") or CURRENT_SEASON
    kickoff   = fix.get("date")

    has_official = len(official_raw) >= 2

    # ── Official path ─────────────────────────
    if has_official:
        print(f"[lineups] Official lineups found for fixture {fixture_id}")

        def _parse_inj(response):
            seen = {}
            for e in response:
                p    = e.get("player", {})
                pid  = p.get("id")
                if not pid:
                    continue
                inj_type     = (e.get("type") or "Injury").strip()
                reason       = (e.get("reason") or "").strip()
                tl           = inj_type.lower()
                rl           = reason.lower()
                if "suspend" in tl or "suspension" in rl or "card" in rl:
                    status = "suspended"
                elif "doubt" in tl or "question" in tl:
                    status = "doubtful"
                else:
                    status = "injured"
                seen[pid] = {"id": pid, "name": p.get("name",""), "photo": p.get("photo",""),
                             "reason": reason, "type": inj_type, "status": status}
            return list(seen.values())

        async def home_inj():
            try:
                d = await _call("/injuries", {"team": home_id, "season": season})
                return _parse_inj(d.get("response", []))
            except Exception:
                return []

        async def away_inj():
            try:
                d = await _call("/injuries", {"team": away_id, "season": season})
                return _parse_inj(d.get("response", []))
            except Exception:
                return []

        home_injuries, away_injuries = await asyncio.gather(home_inj(), away_inj())

        home_raw = next((l for l in official_raw if l.get("team",{}).get("id") == home_id), official_raw[0] if official_raw else {})
        away_raw = next((l for l in official_raw if l.get("team",{}).get("id") == away_id), official_raw[1] if len(official_raw) > 1 else {})

        return {
            "mode":         "official",
            "announced_at": kickoff,
            "home":         _normalise_official(home_raw, home_injuries, []),
            "away":         _normalise_official(away_raw, away_injuries, []),
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