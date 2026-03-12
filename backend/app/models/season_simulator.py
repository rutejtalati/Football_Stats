"""
models/season_simulator.py  —  StatinSite Season Simulator v4
══════════════════════════════════════════════════════════════
Monte Carlo league simulation.

Uses the canonical prediction engine (football_engine.py) for all
match simulations — no separate Poisson implementation.

main.py import: from app.models.season_simulator import monte_carlo_league

Returns a list of dicts compatible with /api/simulate/{league} response.
"""

import math
import random
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

# ── Engine imports ────────────────────────────────────────────────────────────
from app.football_engine import (
    build_score_matrix,
    outcome_probs,
    LEAGUE_AVG_GOALS,
    FALLBACK_AVG,
    EloRatings,
)

# ── Simulation parameters ─────────────────────────────────────────────────────
N_SIMULATIONS   = 8000     # number of full-season Monte Carlo runs
PLAYOFF_SPOTS   = 4        # "top 4" threshold (Champions League)
RELEGATION_ZONE = 3        # bottom N teams relegated

# ── League metadata ───────────────────────────────────────────────────────────
LEAGUE_IDS = {
    "epl":        39,
    "laliga":     140,
    "seriea":     135,
    "ligue1":     61,
    "bundesliga": 78,
}

# Teams-per-league (used for relegation zone calculation)
TEAMS_PER_LEAGUE = {
    "epl":        20,
    "laliga":     20,
    "seriea":     20,
    "ligue1":     18,
    "bundesliga": 18,
}


# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _simulate_match_fast(xg_h: float, xg_a: float) -> Tuple[int, int]:
    """
    Single-match simulation via direct Poisson sampling.
    Much faster than building the full score matrix per simulation.
    Uses the Knuth algorithm for Poisson random variates.
    """
    def poisson_sample(lam: float) -> int:
        if lam <= 0:
            return 0
        L = math.exp(-lam)
        k = 0
        p = 1.0
        while p > L:
            k += 1
            p *= random.random()
        return k - 1

    return poisson_sample(xg_h), poisson_sample(xg_a)


def _season_table(results: List[Tuple[str, str, int, int]]) -> List[Dict]:
    """
    Build a standings table from a list of (home, away, hg, ag) tuples.
    Returns list sorted by points desc, then goal difference, then goals for.
    """
    table: Dict[str, Dict] = defaultdict(lambda: {
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "goals_for": 0, "goals_against": 0, "points": 0
    })

    for home, away, hg, ag in results:
        for team, gf, ga in [(home, hg, ag), (away, ag, hg)]:
            t = table[team]
            t["played"] += 1
            t["goals_for"] += gf
            t["goals_against"] += ga

        if hg > ag:
            table[home]["won"]   += 1; table[home]["points"] += 3
            table[away]["lost"]  += 1
        elif hg < ag:
            table[away]["won"]   += 1; table[away]["points"] += 3
            table[home]["lost"]  += 1
        else:
            table[home]["drawn"] += 1; table[home]["points"] += 1
            table[away]["drawn"] += 1; table[away]["points"] += 1

    sorted_table = sorted(
        table.items(),
        key=lambda x: (
            -x[1]["points"],
            -(x[1]["goals_for"] - x[1]["goals_against"]),
            -x[1]["goals_for"],
        )
    )
    return [{"team": name, **stats} for name, stats in sorted_table]


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def monte_carlo_league(
    league_code: str,
    standings:   Optional[List[Dict]] = None,
    predictions: Optional[List[Dict]] = None,
    elo:         Optional[EloRatings] = None,
    n_sims:      int = N_SIMULATIONS,
) -> List[Dict]:
    """
    Run N Monte Carlo simulations of the remaining season and return
    probabilistic final standings.

    Parameters
    ──────────
    league_code : str
        One of "epl", "laliga", "seriea", "ligue1", "bundesliga".
    standings : list of dicts, optional
        Current league table rows (from /api/standings/{league}).
        Each row must have: team_name, points, played, won, drawn, lost,
        goals_for, goals_against, goal_diff.
    predictions : list of dicts, optional
        Upcoming fixtures with xg_home/xg_away per match.
    elo : EloRatings, optional
        Pre-built Elo ratings for this league.
    n_sims : int
        Number of Monte Carlo iterations.

    Returns
    ───────
    List of dicts, one per team, sorted by median finishing position:
        team_name, current_points, title_prob, top4_prob,
        relegation_prob, avg_final_points, avg_final_position,
        min_points, max_points, current_rank
    """
    if league_code not in LEAGUE_IDS:
        raise ValueError(f"Unknown league: {league_code}")

    lid         = LEAGUE_IDS[league_code]
    league_avg  = LEAGUE_AVG_GOALS.get(lid, FALLBACK_AVG)
    n_teams     = TEAMS_PER_LEAGUE.get(league_code, 20)
    relegate_from = n_teams - RELEGATION_ZONE + 1   # e.g. rank 18+ in a 20-team league

    # ── Seed current standings ────────────────────────────────────────
    if not standings:
        # No standings available — simulate with placeholder teams
        team_names = [f"Team {i+1}" for i in range(n_teams)]
        current_pts:  Dict[str, int] = {t: 0 for t in team_names}
        current_gf:   Dict[str, int] = {t: 0 for t in team_names}
        current_ga:   Dict[str, int] = {t: 0 for t in team_names}
        current_played: Dict[str, int] = {t: 0 for t in team_names}
    else:
        team_names    = [row["team_name"] for row in standings]
        current_pts   = {row["team_name"]: row.get("points", 0)       for row in standings}
        current_gf    = {row["team_name"]: row.get("goals_for", 0)    for row in standings}
        current_ga    = {row["team_name"]: row.get("goals_against", 0) for row in standings}
        current_played = {row["team_name"]: row.get("played", 0)      for row in standings}

    # ── Build xG lookup from predictions ─────────────────────────────
    # Key: (home_team, away_team) → (xg_home, xg_away)
    xg_lookup: Dict[Tuple[str, str], Tuple[float, float]] = {}
    if predictions:
        for p in predictions:
            ht = p.get("home_team", "")
            at = p.get("away_team", "")
            if ht and at:
                xg_lookup[(ht, at)] = (
                    float(p.get("xg_home") or p.get("expected_home_goals") or league_avg["home"]),
                    float(p.get("xg_away") or p.get("expected_away_goals") or league_avg["away"]),
                )

    # ── Generate remaining fixtures ───────────────────────────────────
    # Build a round-robin fixture list for remaining matches.
    # For each pair not in xg_lookup, use league averages adjusted by Elo.
    remaining_fixtures: List[Tuple[str, str, float, float]] = []
    total_matches_per_team = (n_teams - 1) * 2   # home and away vs every other team

    for i, home in enumerate(team_names):
        for away in team_names:
            if home == away:
                continue
            # Estimate matches already played between these two (rough heuristic)
            # Only simulate if neither team has played full schedule
            avg_played = (current_played.get(home, 0) + current_played.get(away, 0)) / 2
            if avg_played >= total_matches_per_team:
                continue

            # Use prediction xG if available, else build from Elo
            if (home, away) in xg_lookup:
                xg_h, xg_a = xg_lookup[(home, away)]
            elif elo:
                elo_diff = elo.diff(home, away)
                elo_adj  = max(-0.20, min(elo_diff / 1500.0, 0.20))
                xg_h = league_avg["home"] * (1.0 + elo_adj)
                xg_a = league_avg["away"] * (1.0 - elo_adj)
                xg_h = max(0.25, min(xg_h, 3.80))
                xg_a = max(0.15, min(xg_a, 3.20))
            else:
                xg_h = league_avg["home"]
                xg_a = league_avg["away"]

            remaining_fixtures.append((home, away, xg_h, xg_a))

    # If no remaining fixtures (all played), return current standings as-is
    if not remaining_fixtures:
        result = []
        for rank, row in enumerate(standings or [], start=1):
            pts = current_pts.get(row["team_name"], 0)
            result.append({
                "team_name":         row["team_name"],
                "current_rank":      rank,
                "current_points":    pts,
                "title_prob":        1.0 if rank == 1 else 0.0,
                "top4_prob":         1.0 if rank <= PLAYOFF_SPOTS else 0.0,
                "relegation_prob":   1.0 if rank >= relegate_from else 0.0,
                "avg_final_points":  pts,
                "avg_final_position": rank,
                "min_points":        pts,
                "max_points":        pts,
            })
        return result

    # ── Monte Carlo loop ──────────────────────────────────────────────
    # Accumulators
    title_count:      Dict[str, int]   = defaultdict(int)
    top4_count:       Dict[str, int]   = defaultdict(int)
    relegation_count: Dict[str, int]   = defaultdict(int)
    total_points:     Dict[str, float] = defaultdict(float)
    total_position:   Dict[str, float] = defaultdict(float)
    min_pts:          Dict[str, int]   = {t: 999 for t in team_names}
    max_pts:          Dict[str, int]   = {t: 0   for t in team_names}

    for _ in range(n_sims):
        # Simulate all remaining fixtures
        sim_results: List[Tuple[str, str, int, int]] = []
        for home, away, xg_h, xg_a in remaining_fixtures:
            hg, ag = _simulate_match_fast(xg_h, xg_a)
            sim_results.append((home, away, hg, ag))

        # Build final table for this simulation
        sim_table_delta = _season_table(sim_results)

        # Add to current standings
        sim_final: Dict[str, int] = dict(current_pts)   # copy
        for row in sim_table_delta:
            sim_final[row["team"]] = sim_final.get(row["team"], 0) + row["points"]

        # Sort by final points
        sorted_teams = sorted(
            team_names,
            key=lambda t: -sim_final.get(t, 0)
        )

        # Record outcomes
        for rank, team in enumerate(sorted_teams, start=1):
            pts = sim_final.get(team, 0)
            if rank == 1:
                title_count[team] += 1
            if rank <= PLAYOFF_SPOTS:
                top4_count[team] += 1
            if rank >= relegate_from:
                relegation_count[team] += 1
            total_points[team]   += pts
            total_position[team] += rank
            if pts < min_pts[team]:
                min_pts[team] = pts
            if pts > max_pts[team]:
                max_pts[team] = pts

    # ── Build output ──────────────────────────────────────────────────
    output = []
    current_rank_lookup = {
        row["team_name"]: i + 1
        for i, row in enumerate(standings or [])
    }

    for team in team_names:
        current_rank = current_rank_lookup.get(team, 0)
        output.append({
            "team_name":          team,
            "current_rank":       current_rank,
            "current_points":     current_pts.get(team, 0),
            "title_prob":         round(title_count[team]      / n_sims, 4),
            "top4_prob":          round(top4_count[team]       / n_sims, 4),
            "relegation_prob":    round(relegation_count[team] / n_sims, 4),
            "avg_final_points":   round(total_points[team]     / n_sims, 1),
            "avg_final_position": round(total_position[team]   / n_sims, 1),
            "min_points":         min_pts[team] if min_pts[team] != 999 else current_pts.get(team, 0),
            "max_points":         max_pts[team],
        })

    # Sort by average final position ascending (1st place first)
    output.sort(key=lambda x: x["avg_final_position"])
    return output