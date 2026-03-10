import random
import numpy as np


def simulate_match(xg_home, xg_away):

    home_goals = np.random.poisson(xg_home)
    away_goals = np.random.poisson(xg_away)

    return home_goals, away_goals


def monte_carlo_match(xg_home, xg_away, simulations=20000):

    home_wins = 0
    draws = 0
    away_wins = 0

    for _ in range(simulations):

        hg, ag = simulate_match(xg_home, xg_away)

        if hg > ag:
            home_wins += 1
        elif hg == ag:
            draws += 1
        else:
            away_wins += 1

    return {
        "home_win": home_wins / simulations,
        "draw": draws / simulations,
        "away_win": away_wins / simulations
    }