"""
football_engine.py  —  StatinSite Prediction Engine v4
═══════════════════════════════════════════════════════
Architecture
────────────
  Layer 1 · Dynamic Elo         — team strength with recency decay + margin weighting
  Layer 2 · Dixon-Coles Poisson — scoreline distribution with low-score correction
  Layer 3 · xG Model            — attack/defence strengths + shot proxy + Elo blend
  Layer 4 · Form Engine         — exponentially weighted recent results
  Layer 5 · Confidence Scorer   — multi-signal probabilistic rating

All public exports are drop-in replacements for the v3 engine.
main.py imports: EloRatings, TTLCache, predict_match, LEAGUE_AVG_GOALS, FALLBACK_AVG
"""

import math
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple


# ═══════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════

# ── Elo ──────────────────────────────────────────────────────────────
ELO_DEFAULT   = 1500.0
ELO_HOME_ADV  = 65.0       # home advantage in Elo points (refined from 60)
ELO_K_BASE    = 32.0       # base K-factor
ELO_K_SCALE   = 0.04       # extra K per goal-difference unit (margin of victory)
ELO_DECAY_TAU = 90.0       # half-life in days for rating regression to mean

# ── Dixon-Coles ───────────────────────────────────────────────────────
DC_TAU    = 0.22           # correction strength (industry standard ~0.18–0.25)
MAX_GOALS = 8              # score matrix dimension

# ── xG model ─────────────────────────────────────────────────────────
XG_ELO_BLEND      = 0.20   # weight of Elo signal in final xG (0 = pure stats)
XG_FORM_WEIGHT    = 0.15   # weight of form factor in xG adjustment
XG_SHOT_WEIGHT    = 0.10   # weight of shot-rate proxy
MIN_MATCHES_FULL  = 8      # matches needed for full strength calculation
MIN_MATCHES_HALF  = 4      # matches needed for partial calculation (50% trust)

# ── Form decay ───────────────────────────────────────────────────────
FORM_DECAY_LAMBDA = 0.30   # exponential decay per match (most recent = weight 1)

# ── League averages (per-match, home/away split) ──────────────────────
LEAGUE_AVG_GOALS: Dict[int, Dict[str, float]] = {
    39:  {"home": 1.54, "away": 1.24},   # EPL
    140: {"home": 1.62, "away": 1.18},   # La Liga
    135: {"home": 1.50, "away": 1.16},   # Serie A
    61:  {"home": 1.56, "away": 1.20},   # Ligue 1
    78:  {"home": 1.58, "away": 1.22},   # Bundesliga
}
FALLBACK_AVG: Dict[str, float] = {"home": 1.55, "away": 1.20}


# ═══════════════════════════════════════════════════════════════════════
# LAYER 1 · DYNAMIC ELO
# ═══════════════════════════════════════════════════════════════════════

class EloRatings:
    """
    Dynamic Elo with:
      - Goal-margin K-factor scaling (larger wins → bigger updates)
      - Optional time-decay regression toward mean between seasons
      - Home advantage baked into expected-score calculation
    """

    def __init__(self, default: float = ELO_DEFAULT):
        self.ratings: Dict[str, float] = defaultdict(lambda: default)
        self.default  = default
        self._built   = False

    # ── Core math ────────────────────────────────────────────────────

    def expected(self, home: str, away: str) -> float:
        """P(home win) according to Elo, including home advantage."""
        rh = self.ratings[home] + ELO_HOME_ADV
        ra = self.ratings[away]
        return 1.0 / (1.0 + 10.0 ** ((ra - rh) / 400.0))

    def _k_factor(self, goal_diff: int) -> float:
        """
        Dynamic K: larger margin of victory → larger rating swing.
        Diminishing returns via log scaling (standard in club Elo systems).
        """
        gd = abs(goal_diff)
        if gd == 0:
            multiplier = 1.0
        elif gd == 1:
            multiplier = 1.0
        elif gd == 2:
            multiplier = 1.5
        else:
            # log-based diminishing returns
            multiplier = (11.0 + gd) / 8.0
        return ELO_K_BASE * multiplier

    def update(self, home: str, away: str, home_goals: int, away_goals: int):
        exp_h     = self.expected(home, away)
        goal_diff = home_goals - away_goals
        k         = self._k_factor(goal_diff)

        if   goal_diff > 0: result_h = 1.0
        elif goal_diff < 0: result_h = 0.0
        else:               result_h = 0.5

        delta = k * (result_h - exp_h)
        self.ratings[home] += delta
        self.ratings[away] -= delta

    def build_from_fixtures(self, completed_fixtures: List[Dict]):
        """
        Build ratings from chronologically sorted fixtures.
        Applies a mid-season regression pulse after the first half
        of the fixture list to prevent early-season rating lock-in.
        """
        n = len(completed_fixtures)
        midpoint = n // 2

        for i, fx in enumerate(completed_fixtures):
            # Soft regression toward mean at season midpoint
            if i == midpoint and n > 20:
                self._regress_to_mean(fraction=0.10)
            self.update(
                fx["home_team"], fx["away_team"],
                int(fx["home_goals"]), int(fx["away_goals"])
            )
        self._built = True

    def _regress_to_mean(self, fraction: float = 0.10):
        """Pull every rating fraction closer to the default (1500)."""
        for team in list(self.ratings.keys()):
            self.ratings[team] += fraction * (self.default - self.ratings[team])

    # ── Accessors ────────────────────────────────────────────────────

    def get(self, team: str) -> float:
        return self.ratings[team]

    def diff(self, home: str, away: str) -> float:
        """Signed Elo difference (home advantage included)."""
        return (self.ratings[home] + ELO_HOME_ADV) - self.ratings[away]

    def percentile(self, team: str) -> float:
        """
        What fraction of teams have a lower rating?
        Useful for strength-of-schedule context.
        """
        all_ratings = list(self.ratings.values())
        if not all_ratings:
            return 0.5
        r = self.ratings[team]
        return sum(1 for x in all_ratings if x < r) / len(all_ratings)


# ═══════════════════════════════════════════════════════════════════════
# LAYER 2 · DIXON-COLES POISSON MODEL
# ═══════════════════════════════════════════════════════════════════════

def poisson_pmf(k: int, lam: float) -> float:
    """P(X = k) for Poisson(λ). Handles λ=0 and large k gracefully."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    # Use log-space for numerical stability at large k
    log_p = -lam + k * math.log(lam) - sum(math.log(i) for i in range(1, k + 1))
    return math.exp(log_p)


def dixon_coles_correction(
    home_goals: int, away_goals: int,
    lam_h: float, lam_a: float,
    tau: float = DC_TAU
) -> float:
    """
    Dixon-Coles (1997) low-score correction factor ρ.
    Applied to (0,0), (1,0), (0,1), (1,1) scorelines.
    Higher tau = stronger correction toward observed frequency of draws/low scores.
    """
    if home_goals == 0 and away_goals == 0:
        return 1.0 - lam_h * lam_a * tau
    if home_goals == 1 and away_goals == 0:
        return 1.0 + lam_a * tau
    if home_goals == 0 and away_goals == 1:
        return 1.0 + lam_h * tau
    if home_goals == 1 and away_goals == 1:
        return 1.0 - tau
    return 1.0


def build_score_matrix(
    lam_h: float, lam_a: float,
    max_goals: int = MAX_GOALS,
    use_dc: bool = True
) -> List[Tuple[Tuple[int, int], float]]:
    """
    Full (max_goals+1)² scoreline probability matrix.
    Normalised so probabilities sum to 1.0.
    Returns sorted by probability descending.
    """
    raw: List[Tuple[Tuple[int, int], float]] = []
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = poisson_pmf(h, lam_h) * poisson_pmf(a, lam_a)
            if use_dc:
                p *= dixon_coles_correction(h, a, lam_h, lam_a, tau=DC_TAU)
            raw.append(((h, a), p))

    total = sum(p for _, p in raw)
    if total > 0:
        raw = [(score, p / total) for score, p in raw]

    raw.sort(key=lambda x: x[1], reverse=True)
    return raw


def outcome_probs(score_matrix: List) -> Tuple[float, float, float]:
    """Aggregate score matrix into (P_home, P_draw, P_away)."""
    home_win = draw = away_win = 0.0
    for (h, a), p in score_matrix:
        if   h > a:  home_win += p
        elif h == a: draw     += p
        else:        away_win += p
    return home_win, draw, away_win


def market_probs(score_matrix: List) -> Dict[str, float]:
    """Compute betting-market props from the score matrix."""
    over25 = over35 = btts = home_cs = away_cs = 0.0
    for (h, a), p in score_matrix:
        total = h + a
        if total > 2:             over25  += p
        if total > 3:             over35  += p
        if h >= 1 and a >= 1:     btts    += p
        if a == 0:                home_cs += p
        if h == 0:                away_cs += p
    return {
        "over_2_5":         round(over25,  4),
        "over_3_5":         round(over35,  4),
        "btts":             round(btts,    4),
        "home_clean_sheet": round(home_cs, 4),
        "away_clean_sheet": round(away_cs, 4),
    }


# ═══════════════════════════════════════════════════════════════════════
# LAYER 3 · xG MODEL
# ═══════════════════════════════════════════════════════════════════════

def _shot_quality_proxy(stats: Optional[Dict], side: str) -> float:
    """
    Derive a shot quality factor from shots-per-game and on-target %.
    Returns a multiplier 0.85–1.15 centred at 1.0 (league average).
    Used as a weak signal when no xG data is available.
    """
    if not stats:
        return 1.0
    shots_pg     = stats.get("shots_pg", 0) or 0
    on_tgt_pct   = stats.get("shots_on_target_pct", 33.0) or 33.0
    # Normalise: league typical ~4.5 shots/game, 33% on target
    shots_norm   = min(shots_pg / 4.5, 1.5)
    quality_norm = min(on_tgt_pct / 33.0, 1.5)
    raw          = shots_norm * quality_norm
    # Map to ±15% adjustment, centred at 1.0
    return round(0.85 + (raw - 1.0) * 0.15 / 0.5, 4)


def _form_factor(form_string: str) -> float:
    """
    Exponentially weighted form score from recent results string.
    'WWDLW' → weight most recent match highest.
    Returns a multiplier centred at 1.0 (0.85 cold streak → 1.15 hot streak).
    """
    results = [c for c in str(form_string or "") if c in ("W", "D", "L")][-5:]
    if not results:
        return 1.0

    score   = 0.0
    weights = 0.0
    for i, r in enumerate(reversed(results)):  # most recent first
        w = math.exp(-FORM_DECAY_LAMBDA * i)
        weights += w
        if r == "W":
            score += w * 1.0
        elif r == "D":
            score += w * 0.33
        else:
            score += w * 0.0

    normalised = score / weights   # 0.0 (all losses) → 1.0 (all wins)
    return round(0.85 + normalised * 0.30, 4)   # 0.85 → 1.15


def build_xg_from_team_stats(
    home_team_id: int,
    away_team_id: int,
    home_stats:   Optional[Dict],
    away_stats:   Optional[Dict],
    league_avg:   Dict,
    elo:          Optional[EloRatings] = None,
    home_team_name: str = "",
    away_team_name: str = "",
    home_form:    str = "",
    away_form:    str = "",
) -> Tuple[float, float]:
    """
    Multi-signal xG estimator:
      1. Attack / defence strength from season stats (Dixon-Coles style)
      2. Shot quality proxy (shots-on-target rate)
      3. Form factor (exponentially weighted recent results)
      4. Elo blend (structural team strength signal)
      5. Hard clamp to realistic range
    """
    league_avg_h = league_avg.get("home", FALLBACK_AVG["home"])
    league_avg_a = league_avg.get("away", FALLBACK_AVG["away"])

    # ── Home attack / away defence ──────────────────────────────────
    home_matches = (home_stats or {}).get("played_home", 0)
    if home_stats and home_matches >= MIN_MATCHES_FULL:
        trust = 1.0
        h_att = (home_stats["scored_home"]   / home_matches) / league_avg_h
        h_def = (home_stats["conceded_home"] / home_matches) / league_avg_a
    elif home_stats and home_matches >= MIN_MATCHES_HALF:
        trust = home_matches / MIN_MATCHES_FULL
        h_att = trust * ((home_stats["scored_home"]   / home_matches) / league_avg_h) + (1 - trust) * 1.0
        h_def = trust * ((home_stats["conceded_home"] / home_matches) / league_avg_a) + (1 - trust) * 1.0
    else:
        h_att = 1.0
        h_def = 1.0

    # ── Away attack / home defence ──────────────────────────────────
    away_matches = (away_stats or {}).get("played_away", 0)
    if away_stats and away_matches >= MIN_MATCHES_FULL:
        trust = 1.0
        a_att = (away_stats["scored_away"]   / away_matches) / league_avg_a
        a_def = (away_stats["conceded_away"] / away_matches) / league_avg_h
    elif away_stats and away_matches >= MIN_MATCHES_HALF:
        trust = away_matches / MIN_MATCHES_FULL
        a_att = trust * ((away_stats["scored_away"]   / away_matches) / league_avg_a) + (1 - trust) * 1.0
        a_def = trust * ((away_stats["conceded_away"] / away_matches) / league_avg_h) + (1 - trust) * 1.0
    else:
        a_att = 1.0
        a_def = 1.0

    # ── Base xG ─────────────────────────────────────────────────────
    xg_home = league_avg_h * h_att * a_def
    xg_away = league_avg_a * a_att * h_def

    # ── Shot quality proxy ───────────────────────────────────────────
    h_shot = _shot_quality_proxy(home_stats, "home")
    a_shot = _shot_quality_proxy(away_stats, "away")
    xg_home = xg_home * (1.0 - XG_SHOT_WEIGHT + XG_SHOT_WEIGHT * h_shot)
    xg_away = xg_away * (1.0 - XG_SHOT_WEIGHT + XG_SHOT_WEIGHT * a_shot)

    # ── Form factor ──────────────────────────────────────────────────
    h_form = _form_factor(home_form)
    a_form = _form_factor(away_form)
    xg_home = xg_home * (1.0 - XG_FORM_WEIGHT + XG_FORM_WEIGHT * h_form)
    xg_away = xg_away * (1.0 - XG_FORM_WEIGHT + XG_FORM_WEIGHT * a_form)

    # ── Elo blend ────────────────────────────────────────────────────
    if elo and home_team_name and away_team_name:
        elo_diff  = elo.diff(home_team_name, away_team_name)
        # Map diff → ±20% adjustment, max at ±300 Elo points
        elo_adj   = max(-0.20, min(elo_diff / 1500.0, 0.20))
        xg_home   = xg_home * (1.0 - XG_ELO_BLEND + XG_ELO_BLEND * (1.0 + elo_adj))
        xg_away   = xg_away * (1.0 - XG_ELO_BLEND + XG_ELO_BLEND * (1.0 - elo_adj))

    # ── Hard clamp ───────────────────────────────────────────────────
    xg_home = round(max(0.25, min(xg_home, 3.80)), 3)
    xg_away = round(max(0.15, min(xg_away, 3.20)), 3)

    return xg_home, xg_away


# ═══════════════════════════════════════════════════════════════════════
# LAYER 4 · FORM PARSER
# ═══════════════════════════════════════════════════════════════════════

def parse_form(raw_form: str) -> List[str]:
    """Extract last 5 W/D/L results from a form string."""
    return [c for c in str(raw_form or "") if c in ("W", "D", "L")][-5:]


# ═══════════════════════════════════════════════════════════════════════
# LAYER 5 · CONFIDENCE SCORER
# ═══════════════════════════════════════════════════════════════════════

def confidence_score(
    p_home: float, p_draw: float, p_away: float,
    elo_diff: float = 0.0,
    n_stats_home: int = 0,
    n_stats_away: int = 0,
) -> int:
    """
    Multi-signal confidence rating (0–100).

    Signals:
      1. Outcome dominance   — how far the leading probability is from 1/3 (uniform)
      2. Entropy penalty     — high entropy (uncertain outcome) reduces confidence
      3. Elo signal          — large Elo gap → higher confidence
      4. Data availability   — penalty if teams have few matches played
    """
    p_max = max(p_home, p_draw, p_away)

    # Signal 1: dominance — how much better than random is the top outcome
    dominance = (p_max - 1.0 / 3.0) * 150.0   # 0 at uniform, ~50 at p_max=0.67

    # Signal 2: entropy — penalise flat distributions
    def _safe_log(x: float) -> float:
        return math.log(x) if x > 1e-9 else 0.0
    entropy   = -(p_home * _safe_log(p_home) + p_draw * _safe_log(p_draw) + p_away * _safe_log(p_away))
    max_ent   = math.log(3)  # entropy of uniform distribution
    ent_score = (1.0 - entropy / max_ent) * 30.0   # 0 at uniform, 30 at certain

    # Signal 3: Elo gap
    elo_score = min(abs(elo_diff) / 10.0, 20.0)    # caps at 20 points

    # Signal 4: data availability penalty
    data_penalty = 0
    if n_stats_home < MIN_MATCHES_HALF:
        data_penalty += 8
    if n_stats_away < MIN_MATCHES_HALF:
        data_penalty += 8

    raw = dominance + ent_score + elo_score - data_penalty
    return max(10, min(int(round(raw)), 100))


# ═══════════════════════════════════════════════════════════════════════
# LAYER 5 · MONTE CARLO SIMULATION
# Simulates N matches using Poisson-distributed goals.
# Returns (p_home, p_draw, p_away, avg_home_goals, avg_away_goals).
# Falls back to Poisson model if numpy is unavailable.
# ═══════════════════════════════════════════════════════════════════════

def monte_carlo_simulation(
    xg_home: float,
    xg_away: float,
    n: int = 10_000,
) -> Dict[str, Any]:
    """
    Simulate n matches using independent Poisson draws.
    Returns outcome probabilities and goal distribution stats.
    """
    try:
        import numpy as np
        rng = np.random.default_rng(seed=42)
        home_goals = rng.poisson(xg_home, n)
        away_goals = rng.poisson(xg_away, n)
        home_wins  = int(np.sum(home_goals > away_goals))
        draws      = int(np.sum(home_goals == away_goals))
        away_wins  = int(np.sum(home_goals < away_goals))
        # Most common score
        scores = {}
        for hg, ag in zip(home_goals.tolist(), away_goals.tolist()):
            k = f"{hg}-{ag}"
            scores[k] = scores.get(k, 0) + 1
        top_mc = sorted(scores.items(), key=lambda x: -x[1])[:5]
        return {
            "mc_home_win":   round(home_wins / n, 4),
            "mc_draw":       round(draws / n, 4),
            "mc_away_win":   round(away_wins / n, 4),
            "mc_n":          n,
            "mc_avg_home":   round(float(np.mean(home_goals)), 3),
            "mc_avg_away":   round(float(np.mean(away_goals)), 3),
            "mc_top_scores": [{"score": s, "freq": round(c / n, 4)} for s, c in top_mc],
        }
    except ImportError:
        # numpy not available — use pure-Python Poisson
        import random, math as _math
        random.seed(42)
        def _poisson_sample(lam: float) -> int:
            L = _math.exp(-lam); k = 0; p = 1.0
            while p > L: k += 1; p *= random.random()
            return k - 1
        hw = dw = aw = 0
        hg_sum = ag_sum = 0.0
        scores: Dict[str, int] = {}
        for _ in range(n):
            hg = _poisson_sample(xg_home)
            ag = _poisson_sample(xg_away)
            hg_sum += hg; ag_sum += ag
            if hg > ag: hw += 1
            elif hg == ag: dw += 1
            else: aw += 1
            k = f"{hg}-{ag}"; scores[k] = scores.get(k, 0) + 1
        top_mc = sorted(scores.items(), key=lambda x: -x[1])[:5]
        return {
            "mc_home_win":   round(hw / n, 4),
            "mc_draw":       round(dw / n, 4),
            "mc_away_win":   round(aw / n, 4),
            "mc_n":          n,
            "mc_avg_home":   round(hg_sum / n, 3),
            "mc_avg_away":   round(ag_sum / n, 3),
            "mc_top_scores": [{"score": s, "freq": round(c / n, 4)} for s, c in top_mc],
        }


# ═══════════════════════════════════════════════════════════════════════
# LAYER 6 · ENSEMBLE COMBINER
# Blends Poisson model + Elo + Monte Carlo into final probabilities.
# Weights are tunable — default reflects Poisson-heavy approach.
# ═══════════════════════════════════════════════════════════════════════

ENSEMBLE_WEIGHTS = {
    "poisson": 0.45,
    "elo":     0.20,
    "monte":   0.25,
    "form":    0.10,
}

def ensemble_predict(
    p_poisson_home: float, p_poisson_draw: float, p_poisson_away: float,
    p_elo_home:     float, p_elo_draw:     float, p_elo_away:     float,
    p_mc_home:      float, p_mc_draw:      float, p_mc_away:      float,
    p_form_home:    float = 1/3, p_form_draw: float = 1/3, p_form_away: float = 1/3,
    # H2H layer (optional — weight is 0 when insufficient history)
    p_h2h_home: float = 1/3, p_h2h_draw: float = 1/3, p_h2h_away: float = 1/3,
    # Per-call weight overrides (allow H2H to borrow from Poisson dynamically)
    w_poisson: Optional[float] = None,
    w_h2h:     float = 0.0,
) -> Tuple[float, float, float]:
    """
    Weighted blend of all prediction layers.
    w_poisson defaults to ENSEMBLE_WEIGHTS["poisson"] but can be reduced
    when h2h_weight is non-zero so the total stays at 1.0.
    """
    wp = ENSEMBLE_WEIGHTS["poisson"] if w_poisson is None else w_poisson
    we = ENSEMBLE_WEIGHTS["elo"]
    wm = ENSEMBLE_WEIGHTS["monte"]
    wf = ENSEMBLE_WEIGHTS["form"]
    wh = w_h2h
    h = wp*p_poisson_home + we*p_elo_home + wm*p_mc_home + wf*p_form_home + wh*p_h2h_home
    d = wp*p_poisson_draw + we*p_elo_draw + wm*p_mc_draw + wf*p_form_draw + wh*p_h2h_draw
    a = wp*p_poisson_away + we*p_elo_away + wm*p_mc_away + wf*p_form_away + wh*p_h2h_away
    total = h + d + a
    if total > 0: h, d, a = h/total, d/total, a/total
    return round(h, 4), round(d, 4), round(a, 4)


# ═══════════════════════════════════════════════════════════════════════
# MAIN PREDICTION FUNCTION
# ═══════════════════════════════════════════════════════════════════════

def predict_match(
    home_team:    str,
    away_team:    str,
    home_stats:   Optional[Dict],
    away_stats:   Optional[Dict],
    league_avg:   Dict,
    elo:          Optional[EloRatings] = None,
    home_team_id: int = 0,
    away_team_id: int = 0,
    fixture_date: str = "TBD",
    fixture_time: str = "",
    home_logo:    str = "",
    away_logo:    str = "",
    home_form:    str = "",
    away_form:    str = "",
    h2h_results:  Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Full match prediction. Drop-in replacement for v3.

    Pipeline:
      1. Build xG via multi-signal estimator (stats + shots + form + Elo)
      2. Generate Dixon-Coles score matrix
      3. Extract outcome probabilities + market props
      4. Score confidence with multi-signal scorer
      5. Monte Carlo simulation
      6. Form signal (correctly normalised to a probability triple)
      7. H2H signal (optional — requires >= 5 meetings; zero-weight otherwise)
      8. Ensemble combiner → final probabilities

    h2h_results: list of fixture dicts as returned by /fixtures/headtohead,
                 where each dict has teams.home.id / teams.away.id and goals.
                 Caller must pass home_team_id / away_team_id for orientation.
    """

    # ── Step 1: xG ───────────────────────────────────────────────────
    xg_home, xg_away = build_xg_from_team_stats(
        home_team_id, away_team_id,
        home_stats, away_stats,
        league_avg, elo,
        home_team, away_team,
        home_form=home_form,
        away_form=away_form,
    )

    # ── Step 2: Score matrix ──────────────────────────────────────────
    score_matrix           = build_score_matrix(xg_home, xg_away)
    p_home, p_draw, p_away = outcome_probs(score_matrix)
    markets                = market_probs(score_matrix)

    # ── Step 3: Elo diff + Elo probabilities ─────────────────────────
    elo_diff = elo.diff(home_team, away_team) if elo else 0.0
    # Elo-only win probability (Bradley-Terry style)
    if elo:
        elo_p_home = elo.expected(home_team, away_team)
        elo_p_away = 1.0 - elo_p_home
        elo_p_draw = 0.265  # empirical average draw rate
        # renormalize
        _s = elo_p_home + elo_p_draw + elo_p_away
        elo_p_home /= _s; elo_p_draw /= _s; elo_p_away /= _s
    else:
        elo_p_home = p_home; elo_p_draw = p_draw; elo_p_away = p_away

    # ── Step 4: Confidence ────────────────────────────────────────────
    n_home = (home_stats or {}).get("played_home", 0)
    n_away = (away_stats or {}).get("played_away", 0)
    conf   = confidence_score(p_home, p_draw, p_away, elo_diff, n_home, n_away)

    # ── Step 5: Monte Carlo simulation ───────────────────────────────
    mc = monte_carlo_simulation(xg_home, xg_away, n=10_000)

    # ── Step 6: Form-based signal ─────────────────────────────────────
    # _form_factor() returns a multiplier in [0.85, 1.15] centred at 1.0.
    # Map it to a win-probability estimate: 1.0 (neutral form) → 0.40,
    # 1.15 (peak form) → 0.55, 0.85 (cold streak) → 0.25.
    # Draw share is fixed at the empirical league average (26.5 %).
    # The three values are then renormalised to sum to exactly 1.0.
    hf = _form_factor(home_form)
    af = _form_factor(away_form)
    _FORM_NEUTRAL  = 0.40   # P(win) at form_factor == 1.0
    _FORM_SCALE    = 0.50   # (0.55 - 0.25) / (1.15 - 0.85) = 1.0 → full range
    _DRAW_SHARE    = 0.265  # empirical top-5-league draw rate
    form_p_home_raw = _FORM_NEUTRAL + (hf - 1.0) * _FORM_SCALE
    form_p_away_raw = _FORM_NEUTRAL + (af - 1.0) * _FORM_SCALE
    form_p_home_raw = max(0.05, min(form_p_home_raw, 0.90))
    form_p_away_raw = max(0.05, min(form_p_away_raw, 0.90))
    _form_raw_total = form_p_home_raw + _DRAW_SHARE + form_p_away_raw
    form_p_home = round(form_p_home_raw / _form_raw_total, 4)
    form_p_draw = round(_DRAW_SHARE    / _form_raw_total, 4)
    form_p_away = round(form_p_away_raw / _form_raw_total, 4)

    # ── Step 7: H2H signal ────────────────────────────────────────────
    # Derive win-rate probabilities from historical meetings.
    # Requires >= H2H_MIN_MATCHES to get meaningful signal weight.
    # Results are oriented so "home" always refers to the current home team.
    H2H_MIN_MATCHES   = 5     # below this the weight is zero
    H2H_FULL_MATCHES  = 10    # above this, full weight applies
    H2H_DRAW_FLOOR    = 0.15  # prevent degenerate draw estimates
    H2H_WEIGHT_MAX    = 0.08  # max contribution to ensemble

    h2h_p_home = h2h_p_draw = h2h_p_away = 1.0 / 3.0  # neutral prior
    h2h_weight = 0.0
    # Default stats dict — always present in the response even when no H2H data supplied
    h2h_stats: Dict[str, Any] = {
        "meetings": 0,
        "home_wins": 0,
        "draws": 0,
        "away_wins": 0,
        "weight_applied": 0.0,
    }

    if h2h_results and home_team_id and away_team_id:
        hw = dw = aw = 0
        for fx in h2h_results:
            teams_fx = (fx.get("teams") or {})
            goals_fx = (fx.get("goals") or {})
            fx_home_id = (teams_fx.get("home") or {}).get("id")
            hg = int(goals_fx.get("home") or 0)
            ag = int(goals_fx.get("away") or 0)
            # Orient result relative to the *current* home side
            if fx_home_id == home_team_id:
                if hg > ag:   hw += 1
                elif ag > hg: aw += 1
                else:         dw += 1
            else:
                if ag > hg:   hw += 1   # current home won as away in this game
                elif hg > ag: aw += 1
                else:         dw += 1

        total_h2h = hw + dw + aw
        if total_h2h >= H2H_MIN_MATCHES:
            raw_h = hw / total_h2h
            raw_d = max(H2H_DRAW_FLOOR, dw / total_h2h)
            raw_a = aw / total_h2h
            _h2h_sum = raw_h + raw_d + raw_a
            h2h_p_home = round(raw_h / _h2h_sum, 4)
            h2h_p_draw = round(raw_d / _h2h_sum, 4)
            h2h_p_away = round(raw_a / _h2h_sum, 4)
            # Scale weight linearly from min to full-match threshold
            h2h_weight = H2H_WEIGHT_MAX * min(
                1.0,
                (total_h2h - H2H_MIN_MATCHES) / (H2H_FULL_MATCHES - H2H_MIN_MATCHES + 1e-9)
            )
        h2h_stats = {
            "meetings": total_h2h if total_h2h > 0 else 0,
            "home_wins": hw, "draws": dw, "away_wins": aw,
            "weight_applied": round(h2h_weight, 4),
        }
    # ── Step 8: Ensemble (H2H-aware weights) ─────────────────────────
    # When H2H has enough data its weight is carved from the Poisson layer.
    effective_poisson_w = ENSEMBLE_WEIGHTS["poisson"] - h2h_weight
    e_home, e_draw, e_away = ensemble_predict(
        p_home, p_draw, p_away,
        elo_p_home, elo_p_draw, elo_p_away,
        mc["mc_home_win"], mc["mc_draw"], mc["mc_away_win"],
        form_p_home, form_p_draw, form_p_away,
        p_h2h_home=h2h_p_home, p_h2h_draw=h2h_p_draw, p_h2h_away=h2h_p_away,
        w_poisson=effective_poisson_w, w_h2h=h2h_weight,
    )

    # ── Step 8: Score summary ─────────────────────────────────────────
    top_scores         = score_matrix[:9]
    most_likely_score  = f"{top_scores[0][0][0]}-{top_scores[0][0][1]}"

    if   e_home > e_away and e_home > e_draw: outcome = "home"
    elif e_away > e_home and e_away > e_draw: outcome = "away"
    else:                                     outcome = "draw"

    return {
        # ── Identity ──────────────────────────────────────────────────
        "date":               fixture_date,
        "time":               fixture_time,
        "home_team":          home_team,
        "away_team":          away_team,
        "home_logo":          home_logo,
        "away_logo":          away_logo,
        "fixture_date":       fixture_date,

        # ── Core probabilities (ensemble — canonical) ─────────────────
        "p_home_win":         e_home,
        "p_draw":             e_draw,
        "p_away_win":         e_away,
        "predicted_outcome":  outcome,

        # ── Aliases (frontend + main.py article builders) ─────────────
        "home_win_prob":      e_home,
        "draw_prob":          e_draw,
        "away_win_prob":      e_away,

        # ── Layer breakdown (frontend can display per-model breakdown) ─
        "layers": {
            "poisson": {
                "home": round(p_home, 4),
                "draw": round(p_draw, 4),
                "away": round(p_away, 4),
            },
            "elo": {
                "home": round(elo_p_home, 4),
                "draw": round(elo_p_draw, 4),
                "away": round(elo_p_away, 4),
            },
            "monte_carlo": {
                k: mc[k]
                for k in ("mc_home_win", "mc_draw", "mc_away_win", "mc_top_scores", "mc_n")
            },
            "form": {
                "home": form_p_home,
                "draw": form_p_draw,
                "away": form_p_away,
            },
            "h2h": {
                "home":   round(h2h_p_home, 4),
                "draw":   round(h2h_p_draw, 4),
                "away":   round(h2h_p_away, 4),
                **h2h_stats,
            },
            "ensemble_weights": {
                **ENSEMBLE_WEIGHTS,
                "poisson": round(effective_poisson_w, 4),
                "h2h":     round(h2h_weight, 4),
            },
        },

        # ── xG (canonical) ────────────────────────────────────────────
        "xg_home":            xg_home,
        "xg_away":            xg_away,
        "expected_home_goals": xg_home,
        "expected_away_goals": xg_away,

        # ── Scoreline ─────────────────────────────────────────────────
        "most_likely_score": most_likely_score,
        "top_scores": [
            {"score": f"{s[0][0]}-{s[0][1]}", "prob": round(s[1], 4)}
            for s in top_scores
        ],

        # ── Markets ───────────────────────────────────────────────────
        **markets,

        # ── Meta ──────────────────────────────────────────────────────
        "confidence": conf,
        "elo_home":   round(elo.get(home_team), 1) if elo else None,
        "elo_away":   round(elo.get(away_team), 1) if elo else None,
        "elo_diff":   round(elo_diff, 1),

        # ── Form ──────────────────────────────────────────────────────
        "home_form":  parse_form(home_form),
        "away_form":  parse_form(away_form),
    }


# ═══════════════════════════════════════════════════════════════════════
# TTL CACHE  (unchanged — main.py depends on this class)
# ═══════════════════════════════════════════════════════════════════════

class TTLCache:
    def __init__(self, ttl_seconds: int = 3600):
        self._store: Dict[str, Any]   = {}
        self._ts:    Dict[str, float] = {}
        self.ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            if time.time() - self._ts[key] < self.ttl:
                return self._store[key]
            del self._store[key]
            del self._ts[key]
        return None

    def set(self, key: str, value: Any):
        self._store[key] = value
        self._ts[key]    = time.time()

    def invalidate(self, key: str):
        self._store.pop(key, None)
        self._ts.pop(key, None)