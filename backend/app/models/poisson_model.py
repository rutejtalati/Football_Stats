import math

def poisson_probability(k, lam):
    return (lam ** k * math.exp(-lam)) / math.factorial(k)


def match_outcome_probabilities(xg_home, xg_away, max_goals=6):

    home_win = 0
    draw = 0
    away_win = 0

    for home_goals in range(max_goals + 1):
        for away_goals in range(max_goals + 1):

            p = poisson_probability(home_goals, xg_home) * \
                poisson_probability(away_goals, xg_away)

            if home_goals > away_goals:
                home_win += p
            elif home_goals == away_goals:
                draw += p
            else:
                away_win += p

    return {
        "home_win": round(home_win,4),
        "draw": round(draw,4),
        "away_win": round(away_win,4)
    }