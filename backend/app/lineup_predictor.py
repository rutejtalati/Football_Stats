"""
backend/app/lineup_predictor.py  —  StatinSite Predicted Lineup Engine
═══════════════════════════════════════════════════════════════════════
Predicts the most likely starting XI for an upcoming fixture using:

  1. Formation detection from last 5 official lineups
  2. Exponentially weighted recent starts + minutes
  3. Injury / suspension hard exclusion
  4. Position group quota enforcement (GK / DEF / MID / FWD)
  5. Player form signal (goals + assists per recent match)
  6. Per-player confidence score

For live / completed fixtures: caller skips this module entirely and
uses the official lineup from /fixtures/lineups.
"""

import math
from typing import Any, Dict, List, Optional, Tuple

# ── Tuning constants ──────────────────────────────────────────────────
DECAY_LAMBDA  = 0.35   # exp decay per match back in time; most recent = 1.0
RECENT_LIMIT  = 7      # how many recent fixtures to score against
MIN_STARTER_MINUTES = 55  # minutes threshold to count as a "start"
CONF_FLOOR    = 28     # minimum player confidence %
CONF_CEIL     = 94     # maximum player confidence %

# ── Supported formations and their slot counts ────────────────────────
FORMATION_SLOTS: Dict[str, Dict[str, int]] = {
    "4-3-3":   {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "4-2-3-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "4-4-2":   {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "3-5-2":   {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "3-4-3":   {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "5-3-2":   {"GK": 1, "DEF": 5, "MID": 3, "FWD": 2},
    "5-4-1":   {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
    "4-5-1":   {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "4-1-4-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
}

# Grid positions for visual layout (row:col) — 11 positions per formation
FORMATION_GRID: Dict[str, List[str]] = {
    "4-3-3":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","4:1","4:2","4:3"],
    "4-2-3-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    "4-4-2":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","4:1","4:2"],
    "3-5-2":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","3:5","4:1","4:2"],
    "3-4-3":   ["1:1","2:1","2:2","2:3","3:1","3:2","3:3","3:4","4:1","4:2","4:3"],
    "5-3-2":   ["1:1","2:1","2:2","2:3","2:4","2:5","3:1","3:2","3:3","4:1","4:2"],
    "5-4-1":   ["1:1","2:1","2:2","2:3","2:4","2:5","3:1","3:2","3:3","3:4","4:1"],
    "4-5-1":   ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
    "4-1-4-1": ["1:1","2:1","2:2","2:3","2:4","3:1","3:2","3:3","3:4","3:5","4:1"],
}

# API-Football pos → group
POS_MAP = {"G": "GK", "D": "DEF", "M": "MID", "F": "FWD"}


# ══════════════════════════════════════════════════════════════════════
# FORMATION DETECTION
# ══════════════════════════════════════════════════════════════════════

def detect_formation(recent_lineups: List[Dict]) -> str:
    """Vote on the team's modal formation from their last 5 lineups."""
    tally: Dict[str, int] = {}
    for lu in recent_lineups[:5]:
        f = (lu or {}).get("formation") if isinstance(lu, dict) else None
        if f:
            tally[f] = tally.get(f, 0) + 1
    if not tally:
        return "4-3-3"
    return max(tally, key=lambda k: tally[k])


# ══════════════════════════════════════════════════════════════════════
# PLAYER SCORING
# ══════════════════════════════════════════════════════════════════════

def _find_player_in_fixture(player_id: int, fixture: Dict) -> Optional[Dict]:
    """Extract one player's stats block from a fixture with embedded player data."""
    for team_block in fixture.get("players", []) or []:
        for entry in (team_block.get("players") or []):
            if (entry.get("player") or {}).get("id") == player_id:
                stats = entry.get("statistics") or []
                return stats[0] if stats else {}
    return None


def score_player(player: Dict, recent_fixtures: List[Dict]) -> Tuple[float, str]:
    """
    Composite selection score.  Returns (score, reason).

    Weighted components (most recent match = weight 1.0):
      +30 per weighted start
      +20 × weighted minutes/90
      + 8 per weighted goal
      + 5 per weighted assist
      ±5 × (avg_rating − 6.0)  where API rating 6.0 = average
    """
    pid = player.get("id")
    if not pid:
        return 0.0, "no data"

    total = 0.0
    n_starts = 0
    reasons  = []

    for i, fx in enumerate(recent_fixtures[:RECENT_LIMIT]):
        w     = math.exp(-DECAY_LAMBDA * i)
        stats = _find_player_in_fixture(pid, fx)
        if stats is None:
            continue

        games   = stats.get("games")   or {}
        goals_s = stats.get("goals")   or {}
        mins    = int(games.get("minutes")  or 0)
        rating  = float(games.get("rating") or 0)
        goals   = int(goals_s.get("total")  or 0)
        assists = int(goals_s.get("assists") or 0)
        started = mins >= MIN_STARTER_MINUTES

        if started:
            total   += w * 30.0
            n_starts += 1
        else:
            total   += w * 8.0   # sub credit

        total += w * (mins / 90.0) * 20.0
        total += w * (goals * 8.0 + assists * 5.0)
        if rating > 0:
            total += w * (rating - 6.0) * 5.0

    if n_starts >= 4:
        reasons.append(f"{n_starts} recent starts")
    elif n_starts >= 1:
        reasons.append(f"{n_starts} start(s) recently")
    else:
        reasons.append("rotation candidate")

    return round(total, 2), ", ".join(reasons)


# ══════════════════════════════════════════════════════════════════════
# INJURY CHECK
# ══════════════════════════════════════════════════════════════════════

def is_available(player: Dict, injuries: List[Dict]) -> Tuple[bool, str]:
    """Returns (available, reason). Injury list from /injuries endpoint."""
    pid = player.get("id")
    for inj in (injuries or []):
        ip = (inj.get("player") or {})
        if ip.get("id") == pid:
            return False, ip.get("type") or "Injury"
    return True, ""


# ══════════════════════════════════════════════════════════════════════
# MAIN PREDICTION FUNCTION
# ══════════════════════════════════════════════════════════════════════

def predict_lineup(
    squad:           List[Dict],   # from /players/squads — {player:{id,name,number,pos}}
    recent_fixtures: List[Dict],   # enriched with player stats, newest first
    recent_lineups:  List[Dict],   # official lineup dicts from previous matches
    injuries:        List[Dict],   # from /injuries endpoint for this team
) -> Dict[str, Any]:
    """
    Predict the most likely starting XI for an upcoming match.

    Returns:
    {
      formation: str,
      start_xi:  [{player_id, name, number, pos, group, grid, confidence, reason}, ...],
      bench:     [{player_id, name, number, pos, confidence, reason}, ...],
      unavailable: [{player_id, name, pos, reason}, ...],
      confidence: int,   # overall lineup confidence 0-100
      predicted:  True
    }
    """
    if not squad:
        return {"formation": "4-3-3", "start_xi": [], "bench": [], "unavailable": [], "confidence": 0, "predicted": True}

    formation = detect_formation(recent_lineups)
    slots     = FORMATION_SLOTS.get(formation, FORMATION_SLOTS["4-3-3"])
    grids     = FORMATION_GRID.get(formation,  FORMATION_GRID["4-3-3"])

    # ── Score every squad player ──────────────────────────────────────
    available_pool: List[Dict]  = []
    unavailable:    List[Dict]  = []

    for entry in squad:
        p = entry.get("player") or entry
        avail, reason = is_available(p, injuries)
        group = POS_MAP.get((p.get("pos") or "")[:1].upper(), "MID")
        sc, sc_reason = score_player(p, recent_fixtures)

        record = {
            "player_id": p.get("id"),
            "name":      p.get("name"),
            "number":    p.get("number"),
            "pos":       p.get("pos"),
            "group":     group,
            "score":     sc,
            "reason":    sc_reason,
        }

        if not avail:
            unavailable.append({**record, "reason": f"OUT: {reason}", "confidence": 0})
        else:
            available_pool.append(record)

    # ── Pick starters by positional quota ─────────────────────────────
    by_group: Dict[str, List[Dict]] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in available_pool:
        g = p["group"]
        if g in by_group:
            by_group[g].append(p)

    for g in by_group:
        by_group[g].sort(key=lambda x: -x["score"])

    starters:  List[Dict] = []
    remainder: List[Dict] = []

    for group in ("GK", "DEF", "MID", "FWD"):
        quota = slots.get(group, 0)
        pool  = by_group[group]
        starters.extend(pool[:quota])
        remainder.extend(pool[quota:])

    # Fill to 11 if positional imbalance
    if len(starters) < 11:
        remainder.sort(key=lambda x: -x["score"])
        need = 11 - len(starters)
        starters.extend(remainder[:need])
        remainder = remainder[need:]

    starters = starters[:11]

    # ── Assign confidence to starters ─────────────────────────────────
    max_sc = max((p["score"] for p in starters if p["score"] > 0), default=1.0)
    for p in starters:
        raw   = (p["score"] / max_sc) * 100 if max_sc > 0 else 50
        p["confidence"] = max(CONF_FLOOR, min(int(round(raw * 0.92)), CONF_CEIL))

    # ── Assign grid positions ─────────────────────────────────────────
    group_order: Dict[str, List] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in starters:
        group_order[p["group"]].append(p)

    xi_out = []
    g_idx  = 0
    for group in ("GK", "DEF", "MID", "FWD"):
        for p in group_order[group]:
            grid = grids[g_idx] if g_idx < len(grids) else f"{g_idx+1}:1"
            xi_out.append({**p, "grid": grid})
            g_idx += 1

    # ── Bench (top 9 remainder by score) ─────────────────────────────
    remainder.sort(key=lambda x: -x["score"])
    bench_pool = remainder[:9]
    max_bsc = max((p["score"] for p in bench_pool if p["score"] > 0), default=1.0)
    bench_out = []
    for p in bench_pool:
        raw = (p["score"] / max_bsc) * 100 if max_bsc > 0 else 40
        conf = max(CONF_FLOOR - 5, min(int(round(raw * 0.75)), CONF_CEIL - 20))
        bench_out.append({
            "player_id":  p["player_id"],
            "name":       p["name"],
            "number":     p["number"],
            "pos":        p["pos"],
            "confidence": conf,
            "reason":     p["reason"],
        })

    # ── Overall confidence (capped — it's always a prediction) ────────
    avg_conf     = sum(p["confidence"] for p in xi_out) / max(len(xi_out), 1)
    overall_conf = min(int(round(avg_conf * 0.83)), 80)

    return {
        "formation":   formation,
        "start_xi":    xi_out,
        "bench":       bench_out,
        "unavailable": [{"player_id": p["player_id"], "name": p["name"], "pos": p["pos"], "reason": p["reason"]} for p in unavailable],
        "confidence":  overall_conf,
        "predicted":   True,
    }