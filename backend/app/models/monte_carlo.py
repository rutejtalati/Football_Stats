import numpy as np

def simulate_match(xg_home, xg_away):

    home_goals = np.random.poisson(xg_home)
    away_goals = np.random.poisson(xg_away)

    return home_goals, away_goals


def monte_carlo_match(xg_home, xg_away, simulations=20000):

    home = 0
    draw = 0
    away = 0

    for _ in range(simulations):

        hg, ag = simulate_match(xg_home, xg_away)

        if hg > ag:
            home += 1
        elif hg == ag:
            draw += 1
        else:
            away += 1

    return {
        "home_win_prob": round(home/simulations,4),
        "draw_prob": round(draw/simulations,4),
        "away_win_prob": round(away/simulations,4)
    }