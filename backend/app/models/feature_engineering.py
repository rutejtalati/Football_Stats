"""
backend/app/models/feature_engineering.py
══════════════════════════════════════════
Structured feature engineering layer for StatinSite match predictions.

Responsibility
──────────────
Extract and normalise every numeric signal that a prediction model
(current or future) should be able to consume from the data already
collected by fetch_team_stats_full(), get_or_build_elo(), and
parse_standings().

Design rules
────────────
1.  Pure functions only — no I/O, no side-effects, no API calls.
2.  Every public function returns a typed dict; callers can destructure
    exactly the keys they need without breaking if new features are added.
3.  Missing data is never an exception — each feature has a documented
    fallback so the pipeline degrades gracefully for early-season fixtures.
4.  All continuous features are also returned in a normalised form
    (0–1 range) inside the "scaled" sub-dict so they are ML-ready without
    any further preprocessing by the caller.
5.  The module is import-safe: it only depends on the Python standard
    library and the football_engine constants that are already in scope.

Public API
──────────
extract_match_features(
    home_stats, away_stats,
    league_avg, elo,
    home_team, away_team,
    standings,              # optional — enables league_position_difference
    home_team_id,           # optional — needed for standings lookup
    away_team_id,           # optional — needed for standings lookup
) -> MatchFeatures

The return value is a plain dict with three top-level sections:
  "raw"     — human-readable values with units (goals, points, Elo points …)
  "scaled"  — same features normalised to [0, 1] for model consumption
  "meta"    — data-quality flags (trust scores, missing-data indicators)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

# ── Shared constants (mirrors football_engine.py — kept in sync manually) ──
# We do NOT import from football_engine to keep this module dependency-free;
# the caller passes league_avg and the EloRatings object as arguments.

_FORM_DECAY_LAMBDA: float = 0.30   # must match football_engine.FORM_DECAY_LAMBDA
_MIN_MATCHES_FULL:  int   = 8      # must match football_engine.MIN_MATCHES_FULL
_MIN_MATCHES_HALF:  int   = 4      # must match football_engine.MIN_MATCHES_HALF
_ELO_DEFAULT:       float = 1500.0
_ELO_HOME_ADV:      float = 65.0   # must match football_engine.ELO_HOME_ADV

# ── Scaling reference ranges ───────────────────────────────────────────────
# These define the [min, max] range used to map each raw feature into [0, 1].
# Values outside the range are clamped, not extrapolated.
# Ranges are set to cover ~99 % of realistic top-five-league observations.

_SCALE_RANGES: Dict[str, tuple] = {
    # (min, max)
    "elo_diff":                  (-400.0,  400.0),   # signed, home − away w/ HFA
    "attack_strength":           (  0.30,    2.50),   # goals/game ÷ league avg
    "defense_strength":          (  0.30,    2.50),   # conceded/game ÷ league avg
    "form_points":               (  0.0,    15.0),    # 0–15 from last 5 matches
    "goal_difference_per_game":  ( -3.0,     3.0),    # signed GD ÷ games played
    "shots_on_target_pct":       (  0.0,   100.0),    # 0–100 %
    "league_position":           (  1.0,    20.0),    # 1 = top, 20 = bottom
    "clean_sheet_rate":          (  0.0,     1.0),    # proportion 0–1
    "possession_avg":            (  0.0,   100.0),    # 0–100 %
    "pass_accuracy":             (  0.0,   100.0),    # 0–100 %
    "shots_pg":                  (  0.0,    25.0),    # shots per game
}


# ══════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════

def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(value, hi))


def _scale(value: float, feature_name: str) -> float:
    """Map a raw value into [0, 1] using the feature's reference range."""
    lo, hi = _SCALE_RANGES.get(feature_name, (0.0, 1.0))
    if hi == lo:
        return 0.0
    return round(_clamp((value - lo) / (hi - lo), 0.0, 1.0), 4)


def _safe(d: Optional[Dict], *keys: str, default: float = 0.0) -> float:
    """Safe nested dict lookup that always returns a float."""
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k, default)  # type: ignore[assignment]
    try:
        return float(d or default)
    except (TypeError, ValueError):
        return default


def _data_trust(matches_played: int) -> float:
    """
    Return a [0, 1] trust coefficient based on sample size.
    Mirrors the same thresholds used in football_engine.build_xg_from_team_stats.

    0 matches → 0.0   (no data at all)
    4 matches → 0.50  (_MIN_MATCHES_HALF)
    8 matches → 1.0   (_MIN_MATCHES_FULL, full trust)
    """
    if matches_played <= 0:
        return 0.0
    if matches_played >= _MIN_MATCHES_FULL:
        return 1.0
    return round(matches_played / _MIN_MATCHES_FULL, 3)


# ══════════════════════════════════════════════════════════════════════
# FEATURE EXTRACTORS
# Each extractor is a focused single-purpose function so individual
# features can be unit-tested and replaced independently.
# ══════════════════════════════════════════════════════════════════════

# ── 1. Elo difference ──────────────────────────────────────────────────

def extract_elo_difference(
    elo: Any,                  # EloRatings instance or None
    home_team: str,
    away_team: str,
) -> float:
    """
    Signed Elo difference: (home_rating + HOME_ADVANTAGE) − away_rating.
    Positive → home team is stronger.  Zero when Elo is unavailable.

    Uses EloRatings.diff() which already includes the home-advantage offset
    so the feature captures both structural strength and venue bonus.
    """
    if elo is None:
        return 0.0
    try:
        return round(float(elo.diff(home_team, away_team)), 2)
    except Exception:
        return 0.0


# ── 2 & 3. Attack strength ────────────────────────────────────────────

def extract_attack_strength(
    stats: Optional[Dict],
    side: str,                 # "home" or "away"
    league_avg: Dict[str, float],
) -> float:
    """
    Attack strength = goals_scored_per_match / league_average_goals.

    Definition follows the Dixon-Coles convention used in football_engine:
    uses the *correct venue split* — home teams are benchmarked against
    the home-goals average, away teams against the away-goals average.
    This prevents a systematic bias where away teams always look weak.

    Returns 1.0 (league average) when stats are insufficient.
    """
    if not stats:
        return 1.0

    if side == "home":
        played  = float(stats.get("played_home") or 0)
        scored  = float(stats.get("scored_home") or 0)
        avg     = float(league_avg.get("home") or 1.55)
    else:
        played  = float(stats.get("played_away") or 0)
        scored  = float(stats.get("scored_away") or 0)
        avg     = float(league_avg.get("away") or 1.20)

    if played < _MIN_MATCHES_HALF or avg == 0:
        return 1.0

    return round((scored / played) / avg, 4)


# ── 4 & 5. Defense strength ───────────────────────────────────────────

def extract_defense_strength(
    stats: Optional[Dict],
    side: str,                 # "home" or "away"
    league_avg: Dict[str, float],
) -> float:
    """
    Defense strength = goals_conceded_per_match / league_average_goals.

    A value < 1.0 means better-than-average defence (concedes less than
    the league norm).  A value > 1.0 means leakier than average.

    The asymmetry: a HOME team's defence is tested against AWAY-team
    attack (so we divide by the league away-goals average) and vice versa.
    This matches the Dixon-Coles bivariate Poisson formulation exactly.
    """
    if not stats:
        return 1.0

    if side == "home":
        played   = float(stats.get("played_home") or 0)
        conceded = float(stats.get("conceded_home") or 0)
        # home team concedes against away-side attackers
        avg      = float(league_avg.get("away") or 1.20)
    else:
        played   = float(stats.get("played_away") or 0)
        conceded = float(stats.get("conceded_away") or 0)
        # away team concedes against home-side attackers
        avg      = float(league_avg.get("home") or 1.55)

    if played < _MIN_MATCHES_HALF or avg == 0:
        return 1.0

    return round((conceded / played) / avg, 4)


# ── 6 & 7. Recent form points ─────────────────────────────────────────

def extract_form_points(form_string: str) -> float:
    """
    Raw points tally from the last 5 results in a W/D/L form string.
    W = 3, D = 1, L = 0.  Maximum possible = 15.

    Uses a flat (non-decayed) count here because the decayed version
    already lives in football_engine._form_factor().  The raw points
    total is more interpretable for display and for future ML models
    that may want to apply their own decay.
    """
    results = [c for c in str(form_string or "") if c in ("W", "D", "L")][-5:]
    return float(sum(3 if r == "W" else (1 if r == "D" else 0) for r in results))


def extract_form_points_weighted(form_string: str) -> float:
    """
    Exponentially-weighted form points (most recent match = weight 1.0).
    Mirrors the decay used in football_engine._form_factor() but returns
    a points-scale value (0–15 equivalent) instead of a multiplier.

    This is the preferred feature for predictive models; the unweighted
    version above is kept for interpretability and display purposes.
    """
    results = [c for c in str(form_string or "") if c in ("W", "D", "L")][-5:]
    if not results:
        return 0.0

    total_weight = 0.0
    weighted_pts = 0.0
    for i, r in enumerate(reversed(results)):   # most recent first
        w = math.exp(-_FORM_DECAY_LAMBDA * i)
        total_weight += w
        pts = 3.0 if r == "W" else (1.0 if r == "D" else 0.0)
        weighted_pts += w * pts

    # Rescale to the 0–15 range so it's comparable with the flat version
    max_weighted = total_weight * 3.0
    return round(weighted_pts / max_weighted * 15.0, 3) if max_weighted > 0 else 0.0


# ── 8 & 9. Goal difference per game ──────────────────────────────────

def extract_goal_difference_per_game(stats: Optional[Dict]) -> float:
    """
    (goals_scored − goals_conceded) / total_games_played.
    Signed: positive = net scorer, negative = net conceder.
    Divided by games to make it scale-invariant across the season.
    """
    if not stats:
        return 0.0
    ph = float(stats.get("played_home") or 0)
    pa = float(stats.get("played_away") or 0)
    total_games = ph + pa
    if total_games == 0:
        return 0.0

    scored   = (float(stats.get("scored_home")   or 0) +
                float(stats.get("scored_away")   or 0))
    conceded = (float(stats.get("conceded_home") or 0) +
                float(stats.get("conceded_away") or 0))

    return round((scored - conceded) / total_games, 4)


# ── 10 & 11. Shots on target ─────────────────────────────────────────

def extract_shots_on_target_pct(stats: Optional[Dict]) -> float:
    """
    Percentage of shots that were on target (season aggregate).
    Derived from the pre-computed shots_on_target_pct field in
    fetch_team_stats_full.  Returns 33.0 (league typical) if absent.
    """
    if not stats:
        return 33.0
    return float(stats.get("shots_on_target_pct") or 33.0)


def extract_shots_pg(stats: Optional[Dict]) -> float:
    """Total shots per game (season aggregate)."""
    if not stats:
        return 0.0
    return float(stats.get("shots_pg") or 0.0)


# ── 12. League position difference ───────────────────────────────────

def extract_league_position(
    team_id: Optional[int],
    standings: Optional[List[Dict]],
) -> Optional[int]:
    """
    Look up a team's current league rank from the standings list as
    returned by parse_standings().  Returns None if unavailable.
    Rank 1 = top of table.
    """
    if not team_id or not standings:
        return None
    for row in standings:
        if row.get("team_id") == team_id:
            rank = row.get("rank")
            return int(rank) if rank is not None else None
    return None


def extract_league_position_difference(
    home_pos: Optional[int],
    away_pos: Optional[int],
) -> Optional[float]:
    """
    Signed difference: away_rank − home_rank.
    Positive → home team is higher in the table (lower rank number).
    None when either position is unavailable.
    """
    if home_pos is None or away_pos is None:
        return None
    return float(away_pos - home_pos)


# ── 13. Home advantage ────────────────────────────────────────────────

def extract_home_advantage(league_avg: Dict[str, float]) -> float:
    """
    Structural home advantage expressed as the ratio of the league's
    average home goals to average away goals.

    A ratio > 1.0 means home teams score more on average (typical).
    In the EPL this is ≈ 1.54 / 1.24 ≈ 1.24 — i.e. home teams score
    about 24 % more goals on average.

    This is a fixture-level constant (same for both teams) that captures
    how much the venue matters in the competition being modelled.
    """
    home_avg = float(league_avg.get("home") or 1.55)
    away_avg = float(league_avg.get("away") or 1.20)
    if away_avg == 0:
        return 1.0
    return round(home_avg / away_avg, 4)


# ── 14. Clean sheet rate ─────────────────────────────────────────────

def extract_clean_sheet_rate(stats: Optional[Dict]) -> float:
    """
    Proportion of games in which the team kept a clean sheet.
    Defensive solidity signal complementary to defense_strength.
    """
    if not stats:
        return 0.0
    ph = float(stats.get("played_home") or 0)
    pa = float(stats.get("played_away") or 0)
    total = ph + pa
    if total == 0:
        return 0.0
    cs = float(stats.get("clean_sheets") or 0)
    return round(cs / total, 4)


# ── 15. Possession and passing ────────────────────────────────────────

def extract_possession_avg(stats: Optional[Dict]) -> float:
    """Season-average ball possession percentage (0–100)."""
    if not stats:
        return 50.0
    return float(stats.get("possession_avg") or 50.0)


def extract_pass_accuracy(stats: Optional[Dict]) -> float:
    """Season-average pass completion percentage (0–100)."""
    if not stats:
        return 0.0
    return float(stats.get("pass_accuracy") or 0.0)


# ══════════════════════════════════════════════════════════════════════
# MAIN PUBLIC FUNCTION
# ══════════════════════════════════════════════════════════════════════

def extract_match_features(
    home_stats:   Optional[Dict],
    away_stats:   Optional[Dict],
    league_avg:   Dict[str, float],
    elo:          Any                    = None,
    home_team:    str                    = "",
    away_team:    str                    = "",
    standings:    Optional[List[Dict]]   = None,
    home_team_id: Optional[int]          = None,
    away_team_id: Optional[int]          = None,
) -> Dict[str, Any]:
    """
    Extract all structured features for a single upcoming fixture.

    Parameters
    ──────────
    home_stats   : dict from fetch_team_stats_full() for the home side
    away_stats   : dict from fetch_team_stats_full() for the away side
    league_avg   : {"home": float, "away": float} from LEAGUE_AVG_GOALS
    elo          : EloRatings instance (or None — features degrade gracefully)
    home_team    : team name string (must match EloRatings key)
    away_team    : team name string (must match EloRatings key)
    standings    : list from parse_standings() — needed for position features
    home_team_id : int — needed for standings lookup
    away_team_id : int — needed for standings lookup

    Returns
    ───────
    {
      "raw":    { <feature_name>: <human-readable value>, ... },
      "scaled": { <feature_name>: <float in [0,1]>, ... },
      "meta":   { data quality / availability flags },
    }

    All keys in "raw" are always present.  Values are None only for
    features that genuinely require external data (e.g. standings) that
    was not supplied.
    """

    # ── Totals needed by several features ─────────────────────────────
    h_played_home = float((home_stats or {}).get("played_home") or 0)
    h_played_away = float((home_stats or {}).get("played_away") or 0)
    a_played_home = float((away_stats or {}).get("played_home") or 0)
    a_played_away = float((away_stats or {}).get("played_away") or 0)
    h_total = h_played_home + h_played_away
    a_total = a_played_home + a_played_away

    # ── Extract every feature ─────────────────────────────────────────

    elo_diff = extract_elo_difference(elo, home_team, away_team)

    attack_home  = extract_attack_strength(home_stats, "home", league_avg)
    attack_away  = extract_attack_strength(away_stats, "away", league_avg)

    defense_home = extract_defense_strength(home_stats, "home", league_avg)
    defense_away = extract_defense_strength(away_stats, "away", league_avg)

    home_form_str = (home_stats or {}).get("form", "")
    away_form_str = (away_stats or {}).get("form", "")

    form_home     = extract_form_points(home_form_str)
    form_away     = extract_form_points(away_form_str)
    form_home_wtd = extract_form_points_weighted(home_form_str)
    form_away_wtd = extract_form_points_weighted(away_form_str)

    gd_home = extract_goal_difference_per_game(home_stats)
    gd_away = extract_goal_difference_per_game(away_stats)

    sot_home  = extract_shots_on_target_pct(home_stats)
    sot_away  = extract_shots_on_target_pct(away_stats)
    spg_home  = extract_shots_pg(home_stats)
    spg_away  = extract_shots_pg(away_stats)

    home_pos  = extract_league_position(home_team_id, standings)
    away_pos  = extract_league_position(away_team_id, standings)
    pos_diff  = extract_league_position_difference(home_pos, away_pos)

    home_adv  = extract_home_advantage(league_avg)

    cs_home   = extract_clean_sheet_rate(home_stats)
    cs_away   = extract_clean_sheet_rate(away_stats)

    poss_home = extract_possession_avg(home_stats)
    poss_away = extract_possession_avg(away_stats)

    pacc_home = extract_pass_accuracy(home_stats)
    pacc_away = extract_pass_accuracy(away_stats)

    # ── Raw feature dict ──────────────────────────────────────────────
    raw: Dict[str, Any] = {
        # Core prediction features (those listed in the spec)
        "elo_diff":                     elo_diff,
        "attack_home":                  attack_home,
        "attack_away":                  attack_away,
        "defense_home":                 defense_home,
        "defense_away":                 defense_away,
        "form_home":                    form_home,
        "form_away":                    form_away,
        "goal_difference_home":         gd_home,
        "goal_difference_away":         gd_away,
        "shots_on_target_home":         sot_home,
        "shots_on_target_away":         sot_away,
        "league_position_home":         home_pos,
        "league_position_away":         away_pos,
        "league_position_difference":   pos_diff,
        "home_advantage":               home_adv,
        # Extended features
        "form_home_weighted":           form_home_wtd,
        "form_away_weighted":           form_away_wtd,
        "clean_sheet_rate_home":        cs_home,
        "clean_sheet_rate_away":        cs_away,
        "shots_pg_home":                spg_home,
        "shots_pg_away":                spg_away,
        "possession_avg_home":          poss_home,
        "possession_avg_away":          poss_away,
        "pass_accuracy_home":           pacc_home,
        "pass_accuracy_away":           pacc_away,
    }

    # ── Scaled feature dict (ML-ready, all in [0, 1]) ─────────────────
    # league_position_difference: map from [-19, +19] to [0, 1] where
    # 0.5 = equal position, >0.5 = home team higher in table.
    def _scale_pos_diff(v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        return round(_clamp((v + 19) / 38, 0.0, 1.0), 4)

    # defense_strength: lower is better, so we invert: 1 − scaled value
    # gives 1.0 for best defence, 0.0 for worst.
    def _scale_defense(v: float) -> float:
        lo, hi = _SCALE_RANGES["defense_strength"]
        raw_scaled = _clamp((v - lo) / (hi - lo), 0.0, 1.0)
        return round(1.0 - raw_scaled, 4)   # invert: low concede → high score

    scaled: Dict[str, Any] = {
        "elo_diff":                     _scale(elo_diff, "elo_diff"),
        "attack_home":                  _scale(attack_home, "attack_strength"),
        "attack_away":                  _scale(attack_away, "attack_strength"),
        "defense_home":                 _scale_defense(defense_home),
        "defense_away":                 _scale_defense(defense_away),
        "form_home":                    _scale(form_home, "form_points"),
        "form_away":                    _scale(form_away, "form_points"),
        "form_home_weighted":           _scale(form_home_wtd, "form_points"),
        "form_away_weighted":           _scale(form_away_wtd, "form_points"),
        "goal_difference_home":         _scale(gd_home, "goal_difference_per_game"),
        "goal_difference_away":         _scale(gd_away, "goal_difference_per_game"),
        "shots_on_target_home":         _scale(sot_home, "shots_on_target_pct"),
        "shots_on_target_away":         _scale(sot_away, "shots_on_target_pct"),
        "shots_pg_home":                _scale(spg_home, "shots_pg"),
        "shots_pg_away":                _scale(spg_away, "shots_pg"),
        "league_position_home":         _scale(float(home_pos), "league_position") if home_pos else None,
        "league_position_away":         _scale(float(away_pos), "league_position") if away_pos else None,
        "league_position_difference":   _scale_pos_diff(pos_diff),
        "home_advantage":               round(_clamp((home_adv - 1.0) / 0.5, 0.0, 1.0), 4),
        "clean_sheet_rate_home":        _scale(cs_home, "clean_sheet_rate"),
        "clean_sheet_rate_away":        _scale(cs_away, "clean_sheet_rate"),
        "possession_avg_home":          _scale(poss_home, "possession_avg"),
        "possession_avg_away":          _scale(poss_away, "possession_avg"),
        "pass_accuracy_home":           _scale(pacc_home, "pass_accuracy"),
        "pass_accuracy_away":           _scale(pacc_away, "pass_accuracy"),
    }

    # ── Meta / data-quality flags ─────────────────────────────────────
    meta: Dict[str, Any] = {
        "home_data_trust":          _data_trust(int(h_total)),
        "away_data_trust":          _data_trust(int(a_total)),
        "home_matches_played":      int(h_total),
        "away_matches_played":      int(a_total),
        "elo_available":            elo is not None,
        "standings_available":      standings is not None and len(standings) > 0,
        "position_available":       home_pos is not None and away_pos is not None,
        # Which features are at their fallback values (no real data)
        "fallback_features": [
            name for name, flag in [
                ("attack_home",  h_played_home < _MIN_MATCHES_HALF),
                ("attack_away",  a_played_away < _MIN_MATCHES_HALF),
                ("defense_home", h_played_home < _MIN_MATCHES_HALF),
                ("defense_away", a_played_away < _MIN_MATCHES_HALF),
                ("form_home",    not home_form_str),
                ("form_away",    not away_form_str),
                ("shots_on_target_home", not (home_stats or {}).get("shots_on_target_pct")),
                ("shots_on_target_away", not (away_stats or {}).get("shots_on_target_pct")),
                ("league_position_difference", pos_diff is None),
                ("elo_diff",     elo is None),
            ] if flag
        ],
    }

    return {"raw": raw, "scaled": scaled, "meta": meta}


# ══════════════════════════════════════════════════════════════════════
# USAGE DEMONSTRATION
# ══════════════════════════════════════════════════════════════════════
# This section shows exactly how predict_match() in football_engine.py
# would integrate this module.  It is NOT executed at import time —
# it lives here as a living code comment that stays in sync with the
# actual signatures.
#
# When you are ready to connect the feature layer to the prediction
# pipeline, the change to predict_match() would be:
#
#   from app.models.feature_engineering import extract_match_features
#
#   def predict_match(
#       home_team, away_team,
#       home_stats, away_stats,
#       league_avg, elo=None,
#       ...,
#       standings=None,           # ← add this parameter
#   ):
#       # Step 0 — extract features (new)
#       features = extract_match_features(
#           home_stats=home_stats,
#           away_stats=away_stats,
#           league_avg=league_avg,
#           elo=elo,
#           home_team=home_team,
#           away_team=away_team,
#           standings=standings,
#           home_team_id=home_team_id,
#           away_team_id=away_team_id,
#       )
#
#       # Existing Step 1 — xG (unchanged)
#       xg_home, xg_away = build_xg_from_team_stats(...)
#
#       # The features dict can now be:
#       #   a) included in the response payload for frontend display
#       #   b) passed to a future ML model instead of the manual pipeline
#       #   c) used to override or weight the ensemble
#
#       return {
#           ...,                          # all existing keys preserved
#           "features": features,         # ← new key, non-breaking addition
#       }
#
# The "meta.fallback_features" list lets the confidence scorer apply an
# additional penalty for fixtures where several key features are missing.
# ══════════════════════════════════════════════════════════════════════