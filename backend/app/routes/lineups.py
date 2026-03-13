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
# Row 1=GK, row 2=DEF, row 3=first MID line, row 4=second MID line (if any), last row=FWD
# Cols are numbered left-to-right for that row
_FORMATION_GRIDS = {
    # GK, CB CB LB RB, CM CM CM, LW RW ST
    "4-3-3":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","4:1","4:3","4:2"],
    # GK, CB CB LB RB, LM CM CM RM, ST ST
    "4-4-2":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","4:1","4:2"],
    # GK, CB CB LB RB, CDM CDM, LW CAM RW, ST
    "4-2-3-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","4:1","4:2","4:3","5:1"],
    # GK, CB CB CB, LM CM CM RM, LW ST RW
    "3-4-3":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","4:1","4:2","4:3"],
    # GK, CB CB CB, LWB CM CM CM RWB, ST ST
    "3-5-2":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","3:5","4:1","4:2"],
    # GK, CB CB LB RB, LM CM CM CM RM, ST
    "4-5-1":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    # GK, CB CB LB RB, CDM, LM CM CM RM, ST
    "4-1-4-1": ["1:1","2:1","2:2","2:3","2:4","3:1","4:1","4:2","4:3","4:4","5:1"],
    # GK, CB CB CB LWB RWB, CM CM CM, ST ST
    "5-3-2":   ["1:1","2:1","2:2","2:3","2:4","2:5","3:1","3:2","3:3","4:1","4:2"],
    # GK, CB CB LB RB, CM CM CM, SS SS, ST
    "4-3-2-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","4:1","4:2","5:1"],
    # GK, CB CB CB, LM CM CM RM, CAM CAM, ST
    "3-4-2-1": ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","4:1","4:2","5:1"],
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
    Predict XI correctly:

    KEY INSIGHT — /injuries returns ENTIRE season history.
    A player who started any of the last 3 matches CANNOT be currently injured.
    We use starter_recency (from /fixtures/lineups) to override false injury flags.

    API calls per team:
      1. /players/squads          → squad roster + position + photo
      2. /players page 1+2        → season stats for all ~30+ players  
      3. /fixtures last 10 FT     → form + fixture IDs
      4. /fixtures/lineups × 5   → who actually started recently (key signal)
      5. /injuries                → injury list (filtered by recency check)
      6. /coachs                  → active coach
    """
    from collections import Counter
    print(f"[lineup_engine] Predicting for {team_name} ({team_id})")

    # ── 1. Squad roster ───────────────────────────────────────────────
    async def fetch_squad():
        try:
            d = await _call("/players/squads", {"team": team_id})
            return d.get("response", [{}])[0].get("players", [])
        except Exception as e:
            print(f"[lineup_engine] squad failed: {e}"); return []

    # ── 2. Season player stats — fetch BOTH pages ────────────────────
    async def fetch_season_stats():
        stats = {}
        async def _fetch_page(page):
            try:
                d = await _call("/players", {"team": team_id, "season": season, "page": page})
                for entry in d.get("response", []):
                    pid  = (entry.get("player") or {}).get("id")
                    stat = (entry.get("statistics") or [{}])[0]
                    if not pid: continue
                    g  = stat.get("games") or {}
                    gl = stat.get("goals") or {}
                    stats[pid] = {
                        "minutes":   int(g.get("minutes")     or 0),
                        "appeared":  int(g.get("appearences") or 0),
                        "rating":    float(g.get("rating")    or 0),
                        "goals":     int(gl.get("total")      or 0),
                        "assists":   int(gl.get("assists")     or 0),
                    }
            except Exception as e:
                print(f"[lineup_engine] stats page {page} failed: {e}")
        await asyncio.gather(_fetch_page(1), _fetch_page(2))
        return stats

    # ── 3+4. Recent fixtures + lineups (formation, form, starters) ───
    async def fetch_recent_data():
        try:
            d = await _call("/fixtures", {
                "team": team_id, "season": season,
                "last": 10, "status": "FT",
            })
            fixtures  = d.get("response", [])
            form_list = []
            fixture_ids = []
            for fx in fixtures:
                fid = fx.get("fixture", {}).get("id")
                fixture_ids.append(fid)
                t = fx.get("teams", {}); g = fx.get("goals", {})
                is_home  = t.get("home",{}).get("id") == team_id
                scored   = (g.get("home") or 0) if is_home else (g.get("away") or 0)
                conceded = (g.get("away") or 0) if is_home else (g.get("home") or 0)
                form_list.append("W" if scored > conceded else "D" if scored == conceded else "L")

            # Fetch actual startXI from last 5 lineups
            formations: list      = []
            starter_recency: dict = {}   # pid → cumulative recency score

            async def get_lineup(fid, match_idx):
                if not fid: return
                try:
                    ld = await _call("/fixtures/lineups", {"fixture": fid})
                    weight = 0.8 ** match_idx
                    for team_data in ld.get("response", []):
                        if team_data.get("team", {}).get("id") != team_id:
                            continue
                        f = team_data.get("formation", "")
                        if f: formations.append(_norm_formation(f))
                        for entry in team_data.get("startXI", []):
                            pid = (entry.get("player") or {}).get("id")
                            if pid:
                                starter_recency[pid] = starter_recency.get(pid, 0.0) + weight
                except Exception:
                    pass

            await asyncio.gather(*[
                get_lineup(fid, idx)
                for idx, fid in enumerate(fixture_ids[:5])
            ])

            formation = Counter(formations).most_common(1)[0][0] if formations else "4-3-3"
            return formation, form_list[-5:], starter_recency

        except Exception as e:
            print(f"[lineup_engine] recent data failed: {e}")
            return "4-3-3", [], {}

    # ── 5. Injuries — but will be filtered against recent starters ────
    async def fetch_injuries():
        try:
            d = await _call("/injuries", {"team": team_id, "season": season})
            seen: dict = {}
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
                # Keep most recent entry per player
                seen[pid] = rec
            return seen   # return dict keyed by pid for easy lookup
        except Exception as e:
            print(f"[lineup_engine] injuries failed: {e}"); return {}

    # ── 6. Active coach ───────────────────────────────────────────────
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
     injury_dict, (coach, coach_photo)) = await asyncio.gather(
        fetch_squad(),
        fetch_season_stats(),
        fetch_recent_data(),
        fetch_injuries(),
        fetch_coach(),
    )

    # ── KEY FIX: Filter injury list using starter_recency ─────────────
    # /injuries returns entire season history. A player who started any of
    # the last 3 matches CANNOT still be injured — remove false positives.
    # "last 3" = starter_recency[pid] > 0 since weight for match 3 = 0.8^2 = 0.512
    # Any player with recency > 0 started at least one of the last 5 games.
    RECENCY_THRESHOLD = 0.1   # any recent start clears injury flag

    active_injured: dict  = {}
    active_doubtful: dict = {}
    false_positive_count  = 0

    for pid, rec in injury_dict.items():
        if starter_recency.get(pid, 0) >= RECENCY_THRESHOLD:
            # Player started recently → they recovered, ignore historical injury entry
            false_positive_count += 1
            continue
        if rec["status"] in ("injured", "suspended"):
            active_injured[pid]  = rec
        else:
            active_doubtful[pid] = rec

    print(f"[lineup_engine] {team_name}: injuries raw={len(injury_dict)}, "
          f"false_positives={false_positive_count}, "
          f"active_injured={len(active_injured)}, active_doubtful={len(active_doubtful)}")

    injured   = list(active_injured.values())
    doubtful  = list(active_doubtful.values())
    injured_ids = {p["id"] for p in injured}  # only truly injured are excluded

    # ── Score each squad player ───────────────────────────────────────
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

        # Season base score (normalised 0-1 → scaled to 0-40)
        min_pct    = min(minutes / max(appeared * 90, 1), 1.0) if s.get("appeared",0) > 0 else 0.0
        rat_score  = min(rating / 10.0, 1.0)
        gc_score   = min((goals + assists) / max(appeared, 1), 1.0)
        app_score  = min(appeared / 30.0, 1.0)
        base_score = (0.40 * min_pct + 0.30 * rat_score + 0.20 * gc_score + 0.10 * app_score) * 40.0

        # Recency bonus — who actually started recently (dominates over season stats)
        # A player who started all 5 last games scores: sum(0.8^i, i=0..4) ≈ 3.36 × 30 = ~101
        recency_bonus = starter_recency.get(pid, 0.0) * 30.0

        final = round(base_score + recency_bonus, 3)

        # Tiny baseline for squad players with no data (youth/new signing)
        if final < 0.5:
            final = 0.5

        players.append({
            "id":          pid,
            "name":        sp.get("name", ""),
            "number":      sp.get("number"),
            "photo":       sp.get("photo", ""),
            "pos":         pos,
            "score":       final,
            "rating":      rating if rating > 0 else None,
            "nationality": sp.get("nationality", ""),
        })

    # Debug: log top picks per group
    print(f"[lineup_engine] {team_name}: {len(players)} players, formation={formation}")
    for grp in ("GK","DEF","MID","FWD"):
        top = sorted([p for p in players if _pos_group(p["pos"]) == grp],
                     key=lambda x: -x["score"])[:5]
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