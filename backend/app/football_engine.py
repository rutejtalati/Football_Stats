"""
football_engine.py
──────────────────
Unified prediction engine for the Football Stats API.
"""

import math
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any


# ─── Constants ──────────────────────────────────────────────────────────────

ELO_K            = 32
ELO_DEFAULT      = 1500
ELO_HOME_ADV     = 60
ELO_DECAY        = 0.05

DC_TAU           = 0.10
MAX_GOALS        = 7

LEAGUE_AVG_GOALS = {
    39:  {"home": 1.54, "away": 1.24},   # EPL
    140: {"home": 1.62, "away": 1.18},   # La Liga
    135: {"home": 1.50, "away": 1.16},   # Serie A
    61:  {"home": 1.56, "away": 1.20},   # Ligue 1
    78:  {"home": 1.58, "away": 1.22},   # Bundesliga
}
FALLBACK_AVG     = {"home": 1.55, "away": 1.20}

MIN_MATCHES_FOR_STATS = 5


# ─── Poisson helpers ────────────────────────────────────────────────────────

def poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def dixon_coles_correction(home_goals: int, away_goals: int,
                           lam_h: float, lam_a: float, tau: float = DC_TAU) -> float:
    if home_goals == 0 and away_goals == 0:
        return 1.0 - lam_h * lam_a * tau
    if home_goals == 1 and away_goals == 0:
        return 1.0 + lam_a * tau
    if home_goals == 0 and away_goals == 1:
        return 1.0 + lam_h * tau
    if home_goals == 1 and away_goals == 1:
        return 1.0 - tau
    return 1.0


def build_score_matrix(lam_h: float, lam_a: float,
                       max_goals: int = MAX_GOALS, use_dc: bool = True
                       ) -> List[Tuple[Tuple[int, int], float]]:
    raw = []
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = poisson_pmf(h, lam_h) * poisson_pmf(a, lam_a)
            if use_dc:
                p *= dixon_coles_correction(h, a, lam_h, lam_a)
            raw.append(((h, a), p))

    total = sum(p for _, p in raw)
    if total > 0:
        raw = [(score, p / total) for score, p in raw]

    raw.sort(key=lambda x: x[1], reverse=True)
    return raw


# ─── Outcome probabilities ───────────────────────────────────────────────────

def outcome_probs(score_matrix) -> Tuple[float, float, float]:
    home_win = draw = away_win = 0.0
    for (h, a), p in score_matrix:
        if   h > a:  home_win += p
        elif h == a: draw     += p
        else:        away_win += p
    return home_win, draw, away_win


def market_probs(score_matrix) -> Dict[str, float]:
    over25 = over35 = btts = home_cs = away_cs = 0.0
    for (h, a), p in score_matrix:
        total_goals = h + a
        if total_goals > 2:       over25  += p
        if total_goals > 3:       over35  += p
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


# ─── Confidence score ────────────────────────────────────────────────────────

def confidence_score(p_home: float, p_draw: float, p_away: float,
                     elo_diff: float = 0.0) -> int:
    p_max  = max(p_home, p_draw, p_away)
    spread = int(round((p_max - 1/3) * 120))
    elo_c  = int(min(abs(elo_diff) / 5, 20))
    return max(0, min(spread + elo_c, 100))


# ─── Elo engine ─────────────────────────────────────────────────────────────

class EloRatings:
    def __init__(self, default: float = ELO_DEFAULT, k: float = ELO_K):
        self.ratings: Dict[str, float] = defaultdict(lambda: default)
        self.default  = default
        self.k        = k
        self._built   = False

    def expected(self, home: str, away: str) -> float:
        rh = self.ratings[home] + ELO_HOME_ADV
        ra = self.ratings[away]
        return 1.0 / (1.0 + 10.0 ** ((ra - rh) / 400.0))

    def update(self, home: str, away: str, home_goals: int, away_goals: int):
        exp_h = self.expected(home, away)
        if   home_goals > away_goals:  result_h = 1.0
        elif home_goals == away_goals: result_h = 0.5
        else:                          result_h = 0.0
        delta = self.k * (result_h - exp_h)
        self.ratings[home] += delta
        self.ratings[away] -= delta

    def build_from_fixtures(self, completed_fixtures: List[Dict]):
        for fx in completed_fixtures:
            self.update(
                fx["home_team"], fx["away_team"],
                fx["home_goals"], fx["away_goals"]
            )
        self._built = True

    def get(self, team: str) -> float:
        return self.ratings[team]

    def diff(self, home: str, away: str) -> float:
        return (self.ratings[home] + ELO_HOME_ADV) - self.ratings[away]


# ─── xG model ───────────────────────────────────────────────────────────────

def build_xg_from_team_stats(
        home_team_id: int,
        away_team_id: int,
        home_stats: Optional[Dict],
        away_stats: Optional[Dict],
        league_avg: Dict,
        elo: Optional[EloRatings] = None,
        home_team_name: str = "",
        away_team_name: str = "",
) -> Tuple[float, float]:
    league_avg_h = league_avg.get("home", FALLBACK_AVG["home"])
    league_avg_a = league_avg.get("away", FALLBACK_AVG["away"])

    # Home team attack/defence strengths
    if home_stats and home_stats.get("played_home", 0) >= MIN_MATCHES_FOR_STATS:
        ph    = home_stats["played_home"]
        h_att = (home_stats["scored_home"] / ph)    / league_avg_h
        h_def = (home_stats["conceded_home"] / ph)  / league_avg_a
    else:
        h_att = 1.0
        h_def = 1.0

    # Away team attack/defence strengths
    if away_stats and away_stats.get("played_away", 0) >= MIN_MATCHES_FOR_STATS:
        pa    = away_stats["played_away"]
        a_att = (away_stats["scored_away"] / pa)    / league_avg_a
        a_def = (away_stats["conceded_away"] / pa)  / league_avg_h
    else:
        a_att = 1.0
        a_def = 1.0

    xg_home = league_avg_h * h_att * a_def
    xg_away = league_avg_a * a_att * h_def

    # Elo adjustment (±15% max)
    if elo and home_team_name and away_team_name:
        diff = elo.diff(home_team_name, away_team_name)
        adj  = 1.0 + min(max(diff / 2000.0, -0.15), 0.15)
        xg_home *= adj
        xg_away *= (2.0 - adj)

    xg_home = round(max(0.30, min(xg_home, 3.50)), 3)
    xg_away = round(max(0.20, min(xg_away, 3.00)), 3)

    return xg_home, xg_away


# ─── Form string helpers ─────────────────────────────────────────────────────

def parse_form(raw_form: str) -> List[str]:
    return [c for c in str(raw_form or "") if c in ("W", "D", "L")][-5:]


# ─── Full match prediction ───────────────────────────────────────────────────

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
) -> Dict[str, Any]:

    xg_home, xg_away = build_xg_from_team_stats(
        home_team_id, away_team_id,
        home_stats, away_stats,
        league_avg, elo,
        home_team, away_team,
    )

    score_matrix             = build_score_matrix(xg_home, xg_away)
    p_home, p_draw, p_away   = outcome_probs(score_matrix)
    markets                  = market_probs(score_matrix)

    elo_diff = elo.diff(home_team, away_team) if elo else 0.0
    conf     = confidence_score(p_home, p_draw, p_away, elo_diff)

    top_scores          = score_matrix[:9]
    most_likely_score   = f"{top_scores[0][0][0]}-{top_scores[0][0][1]}"

    if p_home > p_away and p_home > p_draw:
        outcome = "home"
    elif p_away > p_home and p_away > p_draw:
        outcome = "away"
    else:
        outcome = "draw"

    return {
        # ── Match identity ──
        "date":               fixture_date,
        "time":               fixture_time,
        "home_team":          home_team,
        "away_team":          away_team,
        "home_logo":          home_logo,
        "away_logo":          away_logo,
        "fixture_date":       fixture_date,   # alias used by intelligence feed

        # ── Core probabilities (canonical names) ──
        "p_home_win":         round(p_home, 4),
        "p_draw":             round(p_draw, 4),
        "p_away_win":         round(p_away, 4),
        "predicted_outcome":  outcome,

        # ── Aliases expected by main.py article builders & PredictionsPage ──
        "home_win_prob":      round(p_home, 4),
        "draw_prob":          round(p_draw, 4),
        "away_win_prob":      round(p_away, 4),

        # ── xG (canonical names) ──
        "xg_home":            xg_home,
        "xg_away":            xg_away,

        # ── Aliases expected by main.py article builders & PredictionsPage ──
        "expected_home_goals": xg_home,
        "expected_away_goals": xg_away,

        # ── Score ──
        "most_likely_score":  most_likely_score,
        "top_scores": [
            {"score": f"{s[0][0]}-{s[0][1]}", "prob": round(s[1], 4)}
            for s in top_scores
        ],

        # ── Markets ──
        **markets,

        # ── Meta ──
        "confidence":  conf,
        "elo_home":    round(elo.get(home_team), 1) if elo else None,
        "elo_away":    round(elo.get(away_team), 1) if elo else None,
        "elo_diff":    round(elo_diff, 1),

        # ── Form ──
        "home_form":   parse_form(home_form),
        "away_form":   parse_form(away_form),
    }


# ─── Cache helper ────────────────────────────────────────────────────────────

class TTLCache:
    def __init__(self, ttl_seconds: int = 3600):
        self._store: Dict[str, Any] = {}
        self._ts:    Dict[str, float] = {}
        self.ttl     = ttl_seconds

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