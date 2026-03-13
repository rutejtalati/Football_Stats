# ═══════════════════════════════════════════════════════════════════════
# backend/app/routes/lineups.py
#
# GET /api/match-lineup/{fixture_id}
#
# Returns official lineup if announced, otherwise predicted XI.
#
# KEY FIXES vs previous versions:
#   1. /injuries returns full season history → we cross-check against
#      recent starters so recovered players are NOT excluded
#   2. /players fetches BOTH page 1 and page 2 (teams have 30+ players)
#   3. Formation grids use correct row counts per formation (4-2-3-1 = 5 rows)
#   4. Grid assignment is done IN ORDER: GK → DEF → MID → FWD
#      so grid[0]→GK, grid[1..4]→DEF etc., matching Pitch.jsx expectations
# ═══════════════════════════════════════════════════════════════════════

import asyncio
import math
import os
from collections import Counter
from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api")

API_KEY        = os.getenv("API_FOOTBALL_KEY", "")
API_BASE       = "https://v3.football.api-sports.io"
CURRENT_SEASON = 2025


# ────────────────────────────────────────────
# API helper
# ────────────────────────────────────────────

async def _call(path: str, params: dict) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{API_BASE}/{path.lstrip('/')}",
            headers={"x-apisports-key": API_KEY},
            params=params,
        )
        r.raise_for_status()
        return r.json()


# ────────────────────────────────────────────
# Normalisers
# ────────────────────────────────────────────

_POS_MAP = {
    "G": "GK", "GK": "GK", "Goalkeeper": "GK",
    "D": "DEF", "CB": "CB", "LB": "LB", "RB": "RB",
    "LWB": "LWB", "RWB": "RWB", "Defender": "DEF",
    "M": "MID", "CM": "CM", "CDM": "CDM", "CAM": "CAM",
    "LM": "LM", "RM": "RM", "DM": "CDM", "AM": "CAM",
    "Midfielder": "MID",
    "F": "FWD", "ST": "ST", "LW": "LW", "RW": "RW",
    "CF": "ST", "SS": "ST", "Forward": "FWD", "Attacker": "FWD",
}

_VALID_FORMATIONS = {
    "4-3-3", "4-4-2", "4-2-3-1", "3-4-3", "3-5-2",
    "4-5-1", "4-1-4-1", "5-3-2", "4-3-2-1", "3-4-2-1",
    "4-2-2-2", "3-4-1-2", "4-1-3-2",
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


def _pos_group(pos: str) -> str:
    p = pos.upper()
    if p in ("GK",):
        return "GK"
    if p in ("CB", "LB", "RB", "LWB", "RWB", "DEF"):
        return "DEF"
    if p in ("CM", "CDM", "CAM", "LM", "RM", "MID", "DM", "AM"):
        return "MID"
    return "FWD"


# ────────────────────────────────────────────
# Formation → ordered position slots
# (must match grid order exactly: GK first, then DEF L→R, etc.)
# ────────────────────────────────────────────

_FORMATION_SLOTS = {
    # GK  ← DEF →           ← MID →        ← FWD →
    "4-3-3":   ["GK","CB","CB","LB","RB",  "CM","CM","CM",        "LW","RW","ST"],
    "4-4-2":   ["GK","CB","CB","LB","RB",  "LM","CM","CM","RM",   "ST","ST"],
    "4-2-3-1": ["GK","CB","CB","LB","RB",  "CDM","CDM",  "LW","CAM","RW",  "ST"],
    "3-4-3":   ["GK","CB","CB","CB",       "LM","CM","CM","RM",   "LW","ST","RW"],
    "3-5-2":   ["GK","CB","CB","CB",       "LWB","CM","CM","CM","RWB",  "ST","ST"],
    "4-5-1":   ["GK","CB","CB","LB","RB",  "LM","CM","CM","CM","RM",   "ST"],
    "4-1-4-1": ["GK","CB","CB","LB","RB",  "CDM",  "LM","CM","CM","RM",  "ST"],
    "5-3-2":   ["GK","CB","CB","CB","LWB","RWB",  "CM","CM","CM",  "ST","ST"],
    "4-3-2-1": ["GK","CB","CB","LB","RB",  "CM","CM","CM",  "SS","SS",  "ST"],
    "3-4-2-1": ["GK","CB","CB","CB",       "LM","CM","CM","RM",  "CAM","CAM",  "ST"],
}

# ────────────────────────────────────────────
# Formation → grid strings, one per slot, same order as _FORMATION_SLOTS
#
# "row:col"  row 1 = GK row, last row = FWD row
# Pitch.jsx uses: rowSizes = [1, ...formation.split("-").map(n=>parseInt(n))]
# so for "4-2-3-1" → rowSizes=[1,4,2,3,1] → 5 rows
# ────────────────────────────────────────────

_FORMATION_GRIDS = {
    # 4-3-3: 4 rows  [1 GK | 4 DEF | 3 MID | 3 FWD]
    "4-3-3":   [
        "1:1",                          # GK
        "2:1","2:2","2:3","2:4",        # 4 DEF  (L→R: CB LB  CB RB → visually LB CB CB RB)
        "3:1","3:2","3:3",              # 3 MID
        "4:1","4:2","4:3",              # 3 FWD  LW ST RW
    ],
    # 4-4-2: 4 rows  [1|4|4|2]
    "4-4-2":   [
        "1:1",
        "2:1","2:2","2:3","2:4",
        "3:1","3:2","3:3","3:4",
        "4:1","4:2",
    ],
    # 4-2-3-1: 5 rows  [1|4|2|3|1]
    "4-2-3-1": [
        "1:1",
        "2:1","2:2","2:3","2:4",
        "3:1","3:2",
        "4:1","4:2","4:3",
        "5:1",
    ],
    # 3-4-3: 4 rows  [1|3|4|3]
    "3-4-3":   [
        "1:1",
        "2:1","2:2","2:3",
        "3:1","3:2","3:3","3:4",
        "4:1","4:2","4:3",
    ],
    # 3-5-2: 4 rows  [1|3|5|2]
    "3-5-2":   [
        "1:1",
        "2:1","2:2","2:3",
        "3:1","3:2","3:3","3:4","3:5",
        "4:1","4:2",
    ],
    # 4-5-1: 4 rows  [1|4|5|1]
    "4-5-1":   [
        "1:1",
        "2:1","2:2","2:3","2:4",
        "3:1","3:2","3:3","3:4","3:5",
        "4:1",
    ],
    # 4-1-4-1: 5 rows  [1|4|1|4|1]
    "4-1-4-1": [
        "1:1",
        "2:1","2:2","2:3","2:4",
        "3:1",
        "4:1","4:2","4:3","4:4",
        "5:1",
    ],
    # 5-3-2: 4 rows  [1|5|3|2]
    "5-3-2":   [
        "1:1",
        "2:1","2:2","2:3","2:4","2:5",
        "3:1","3:2","3:3",
        "4:1","4:2",
    ],
    # 4-3-2-1: 5 rows  [1|4|3|2|1]
    "4-3-2-1": [
        "1:1",
        "2:1","2:2","2:3","2:4",
        "3:1","3:2","3:3",
        "4:1","4:2",
        "5:1",
    ],
    # 3-4-2-1: 5 rows  [1|3|4|2|1]
    "3-4-2-1": [
        "1:1",
        "2:1","2:2","2:3",
        "3:1","3:2","3:3","3:4",
        "4:1","4:2",
        "5:1",
    ],
}


def _get_grids(formation: str) -> list:
    """Return grid list for a formation, falling back to 4-3-3."""
    return _FORMATION_GRIDS.get(formation, _FORMATION_GRIDS["4-3-3"])


def _get_slots(formation: str) -> list:
    return _FORMATION_SLOTS.get(formation, _FORMATION_SLOTS["4-3-3"])


# ────────────────────────────────────────────
# Official lineup normaliser
# ────────────────────────────────────────────

def _norm_player_official(entry: dict) -> dict:
    p = entry.get("player", {})
    return {
        "id":     p.get("id"),
        "name":   p.get("name", ""),
        "number": p.get("number"),
        "photo":  p.get("photo", ""),
        "pos":    _norm_pos(p.get("pos", "MID")),
        "grid":   p.get("grid"),   # API provides this directly for official lineups
        "rating": None,
    }


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


# ────────────────────────────────────────────
# _build_xi: fill formation slots, assign grid
# ────────────────────────────────────────────

def _build_xi(players: list, formation: str, excluded_ids: set) -> tuple:
    """
    Select the best 11 players for the given formation.
    - Fills slots in order: GK → DEF → MID → FWD
    - Assigns grid strings from _FORMATION_GRIDS in the same order
    - Falls back to best available if a position group is exhausted
    Returns (starting_xi, bench)
    """
    slots     = _get_slots(formation)
    grids     = _get_grids(formation)
    available = [p for p in players if p["id"] not in excluded_ids]

    # Group by position group, sorted best→worst
    by_grp: dict = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available:
        grp = _pos_group(p["pos"])
        by_grp.setdefault(grp, []).append(p)
    for grp in by_grp:
        by_grp[grp].sort(key=lambda x: -(x.get("score") or 0))

    xi, used = [], set()
    for slot_idx, slot in enumerate(slots):
        grp   = _pos_group(slot)
        pool  = [p for p in by_grp.get(grp, []) if p["id"] not in used]
        if not pool:
            # Fallback: any remaining available player
            pool = sorted(
                [p for p in available if p["id"] not in used],
                key=lambda x: -(x.get("score") or 0),
            )
        if pool:
            grid   = grids[slot_idx] if slot_idx < len(grids) else f"{slot_idx+1}:1"
            chosen = {**pool[0], "pos": slot, "grid": grid}
            xi.append(chosen)
            used.add(pool[0]["id"])

    bench = sorted(
        [p for p in available if p["id"] not in used],
        key=lambda x: -(x.get("score") or 0),
    )[:7]

    return xi, bench


# ────────────────────────────────────────────
# Prediction engine
# ────────────────────────────────────────────

async def _predict_for_team(
    team_id: int, season: int,
    team_name: str, team_logo: str,
) -> dict:
    """
    Predict XI for a team before official lineup announcement.

    API calls (all run in parallel where possible):
      • /players/squads          → roster + position + photo
      • /players page 1 + 2      → season stats (handles 30+ player squads)
      • /fixtures last 10 FT     → form string + fixture IDs
      • /fixtures/lineups × 5   → who actually started recently
      • /injuries                → injury list (filtered by recency)
      • /coachs                  → active manager

    Scoring per player:
      base   = season aggregate (minutes %, rating, goal contrib) → 0-40
      recency= sum(0.8^i) for each match i ago they started      → 0-~100
      final  = base + recency

    CRITICAL: /injuries returns the ENTIRE season history.
    Any player who started one of the last 5 matches is NOT currently injured.
    We use starter_recency to filter false positives before exclusion.
    """
    print(f"[lineup] Predicting for {team_name} ({team_id})")

    # ── Squad ────────────────────────────────────────────────────────
    async def fetch_squad():
        try:
            d = await _call("/players/squads", {"team": team_id})
            return d.get("response", [{}])[0].get("players", [])
        except Exception as e:
            print(f"[lineup] squad failed: {e}"); return []

    # ── Season stats — both pages ────────────────────────────────────
    async def fetch_season_stats():
        stats: dict = {}
        async def _page(n: int):
            try:
                d = await _call("/players", {"team": team_id, "season": season, "page": n})
                for entry in d.get("response", []):
                    pid  = (entry.get("player") or {}).get("id")
                    stat = (entry.get("statistics") or [{}])[0]
                    if not pid: continue
                    g  = stat.get("games") or {}
                    gl = stat.get("goals") or {}
                    stats[pid] = {
                        "minutes":  int(g.get("minutes")     or 0),
                        "appeared": int(g.get("appearences") or 0),
                        "rating":   float(g.get("rating")    or 0),
                        "goals":    int(gl.get("total")      or 0),
                        "assists":  int(gl.get("assists")     or 0),
                    }
            except Exception as e:
                print(f"[lineup] stats page {n} failed: {e}")
        await asyncio.gather(_page(1), _page(2))
        return stats

    # ── Recent fixtures + lineups → formation + form + who started ───
    async def fetch_recent_data():
        try:
            d = await _call("/fixtures", {
                "team": team_id, "season": season,
                "last": 10, "status": "FT",
            })
            fixtures    = d.get("response", [])
            form_list   = []
            fixture_ids = []
            for fx in fixtures:
                fid = fx.get("fixture", {}).get("id")
                fixture_ids.append(fid)
                t = fx.get("teams", {}); g = fx.get("goals", {})
                is_home  = t.get("home", {}).get("id") == team_id
                scored   = (g.get("home") or 0) if is_home else (g.get("away") or 0)
                conceded = (g.get("away") or 0) if is_home else (g.get("home") or 0)
                form_list.append("W" if scored > conceded else "D" if scored == conceded else "L")

            formations:      list = []
            starter_recency: dict = {}   # pid → cumulative recency score

            async def _get_lineup(fid, match_idx):
                if not fid: return
                try:
                    ld = await _call("/fixtures/lineups", {"fixture": fid})
                    w  = 0.8 ** match_idx   # most recent = 1.0
                    for td in ld.get("response", []):
                        if td.get("team", {}).get("id") != team_id:
                            continue
                        f = td.get("formation", "")
                        if f: formations.append(_norm_formation(f))
                        for entry in td.get("startXI", []):
                            pid = (entry.get("player") or {}).get("id")
                            if pid:
                                starter_recency[pid] = starter_recency.get(pid, 0.0) + w
                except Exception:
                    pass

            # Fetch last 5 lineups in parallel
            await asyncio.gather(*[
                _get_lineup(fid, idx)
                for idx, fid in enumerate(fixture_ids[:5])
            ])

            formation = Counter(formations).most_common(1)[0][0] if formations else "4-3-3"
            return formation, form_list[-5:], starter_recency

        except Exception as e:
            print(f"[lineup] recent data failed: {e}")
            return "4-3-3", [], {}

    # ── Injuries (returns full season history — must filter) ─────────
    async def fetch_injuries():
        try:
            d = await _call("/injuries", {"team": team_id, "season": season})
            seen: dict = {}
            for e in d.get("response", []):
                p   = e.get("player", {})
                pid = p.get("id")
                if not pid: continue
                inj_type = (e.get("type")   or "Injury").strip()
                reason   = (e.get("reason") or "").strip()
                tl, rl   = inj_type.lower(), reason.lower()
                if "suspend" in tl or "suspension" in rl or "card" in rl:
                    status = "suspended"
                elif "doubt" in tl or "question" in tl:
                    status = "doubtful"
                else:
                    status = "injured"
                # Keep only the most recent entry per player
                seen[pid] = {
                    "id":     pid,
                    "name":   p.get("name", ""),
                    "photo":  p.get("photo", ""),
                    "reason": reason,
                    "type":   inj_type,
                    "status": status,
                }
            return seen
        except Exception as e:
            print(f"[lineup] injuries failed: {e}"); return {}

    # ── Active coach ─────────────────────────────────────────────────
    async def fetch_coach():
        try:
            d = await _call("/coachs", {"team": team_id})
            # Find spell with no end date for this team
            for c in d.get("response", []):
                for spell in c.get("career", []):
                    if (spell.get("team", {}).get("id") == team_id
                            and spell.get("end") is None):
                        return c.get("name", ""), c.get("photo", "")
            # Fallback: first coach returned
            resp = d.get("response", [])
            if resp:
                return resp[0].get("name", ""), resp[0].get("photo", "")
        except Exception:
            pass
        return "", ""

    # ── Run everything in parallel ────────────────────────────────────
    (squad, season_stats,
     (formation, recent_form, starter_recency),
     injury_dict,
     (coach, coach_photo)) = await asyncio.gather(
        fetch_squad(),
        fetch_season_stats(),
        fetch_recent_data(),
        fetch_injuries(),
        fetch_coach(),
    )

    # ── KEY: filter injury list against recent starters ───────────────
    # /injuries returns the WHOLE season. A player who started any of
    # the last 5 games has recovered — don't exclude them.
    # Threshold: 0.1 means they appeared in at least one of the 5 fetched lineups.
    RECENCY_OK = 0.1

    active_injured:  list = []
    active_doubtful: list = []
    cleared = 0

    for pid, rec in injury_dict.items():
        if starter_recency.get(pid, 0.0) >= RECENCY_OK:
            cleared += 1
            continue   # recently started → not currently injured
        if rec["status"] == "doubtful":
            active_doubtful.append(rec)
        else:
            active_injured.append(rec)

    print(f"[lineup] {team_name}: {len(injury_dict)} raw injuries, "
          f"{cleared} cleared by recent starts, "
          f"{len(active_injured)} injured, {len(active_doubtful)} doubtful")

    # Only truly injured/suspended are excluded from XI selection
    excluded_ids = {p["id"] for p in active_injured}

    # ── Score every squad player ──────────────────────────────────────
    _SQUAD_POS = {
        "Goalkeeper": "GK", "Defender": "DEF",
        "Midfielder": "MID", "Attacker": "FWD",
    }

    players = []
    for sp in squad:
        pid = sp.get("id")
        if not pid: continue

        raw_pos = sp.get("position", "Midfielder")
        pos     = _SQUAD_POS.get(raw_pos, _norm_pos(raw_pos))
        s       = season_stats.get(pid, {})

        appeared = max(s.get("appeared", 0), 1)
        minutes  = s.get("minutes",  0)
        rating   = s.get("rating",   0.0)
        goals    = s.get("goals",    0)
        assists  = s.get("assists",  0)

        # Season aggregate (0→40)
        min_pct   = min(minutes / max(appeared * 90, 1), 1.0) if s.get("appeared", 0) > 0 else 0.0
        rat_score = min(rating / 10.0, 1.0)
        gc_score  = min((goals + assists) / max(appeared, 1), 1.0)
        app_score = min(appeared / 30.0, 1.0)
        base      = (0.40 * min_pct + 0.30 * rat_score + 0.20 * gc_score + 0.10 * app_score) * 40.0

        # Recency bonus: consistent starter in last 5 games scores ~(1+0.8+0.64+0.51+0.41)×30 ≈ 101
        recency = starter_recency.get(pid, 0.0) * 30.0

        # Consecutive starts bonus (manager preference signal): +3 if started 3+ in a row
        # starter_recency keys only exist if player appeared, so we check the last 3 weights
        # 0.8^0=1.0, 0.8^1=0.8, 0.8^2=0.64 → sum=2.44 if started all 3
        consec_bonus = 3.0 if starter_recency.get(pid, 0.0) >= 2.4 else 0.0

        final = round(base + recency + consec_bonus, 3)
        if final < 0.5:
            final = 0.5  # baseline so new signings aren't ranked below 0

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

    # Debug logging
    print(f"[lineup] {team_name}: {len(players)} squad players, formation={formation}")
    for grp in ("GK", "DEF", "MID", "FWD"):
        top = sorted(
            [p for p in players if _pos_group(p["pos"]) == grp],
            key=lambda x: -x["score"],
        )[:5]
        print(f"  {grp}: {[(p['name'], round(p['score'],1)) for p in top]}")

    starting_xi, bench = _build_xi(players, formation, excluded_ids)

    if len(starting_xi) < 11:
        print(f"[lineup] WARNING: only {len(starting_xi)} starters for {team_name}")

    return {
        "team_name":   team_name,
        "logo":        team_logo,
        "formation":   formation,
        "coach":       coach,
        "coach_photo": coach_photo,
        "starting_xi": starting_xi,
        "bench":       bench,
        "injuries":    active_injured,
        "doubts":      active_doubtful,
        "recent_form": recent_form,
    }


# ────────────────────────────────────────────
# Injury parser (used by official path)
# ────────────────────────────────────────────

def _parse_injuries(response: list) -> list:
    seen: dict = {}
    for e in response:
        p   = e.get("player", {})
        pid = p.get("id")
        if not pid: continue
        inj_type = (e.get("type")   or "Injury").strip()
        reason   = (e.get("reason") or "").strip()
        tl, rl   = inj_type.lower(), reason.lower()
        if "suspend" in tl or "suspension" in rl or "card" in rl:
            status = "suspended"
        elif "doubt" in tl or "question" in tl:
            status = "doubtful"
        else:
            status = "injured"
        seen[pid] = {
            "id":     pid,
            "name":   p.get("name", ""),
            "photo":  p.get("photo", ""),
            "reason": reason,
            "type":   inj_type,
            "status": status,
        }
    return list(seen.values())


# ────────────────────────────────────────────
# Route
# ────────────────────────────────────────────

@router.get("/match-lineup/{fixture_id}")
async def get_match_lineup(fixture_id: int):
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not configured")

    print(f"[lineup] GET /api/match-lineup/{fixture_id}")

    async def get_fixture():
        d = await _call("/fixtures", {"id": fixture_id})
        return (d.get("response") or [{}])[0]

    async def get_official():
        d = await _call("/fixtures/lineups", {"fixture": fixture_id})
        return d.get("response", [])

    try:
        fixture, official_raw = await asyncio.gather(get_fixture(), get_official())
    except Exception as e:
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

    # ── Official path ─────────────────────────────────────────────────
    if has_official:
        print(f"[lineup] Official lineups found for {fixture_id}")

        async def _inj(team_id):
            try:
                d = await _call("/injuries", {"team": team_id, "season": season})
                return _parse_injuries(d.get("response", []))
            except Exception:
                return []

        home_inj_all, away_inj_all = await asyncio.gather(_inj(home_id), _inj(away_id))

        # For official path just pass all injuries — the UI shows them in the panel
        home_raw = next(
            (l for l in official_raw if l.get("team", {}).get("id") == home_id),
            official_raw[0] if official_raw else {},
        )
        away_raw = next(
            (l for l in official_raw if l.get("team", {}).get("id") == away_id),
            official_raw[1] if len(official_raw) > 1 else {},
        )

        return {
            "mode":         "official",
            "announced_at": kickoff,
            "home":         _normalise_official(home_raw, home_inj_all, []),
            "away":         _normalise_official(away_raw, away_inj_all, []),
        }

    # ── Predicted path ────────────────────────────────────────────────
    print(f"[lineup] No official lineups yet — generating predictions for {fixture_id}")

    home_data, away_data = await asyncio.gather(
        _predict_for_team(home_id, season, home_team.get("name", ""), home_team.get("logo", "")),
        _predict_for_team(away_id, season, away_team.get("name", ""), away_team.get("logo", "")),
    )

    return {
        "mode":         "predicted",
        "announced_at": None,
        "home":         home_data,
        "away":         away_data,
    }