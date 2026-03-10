import random
import numpy as np


def simulate_season(fixtures, team_strength):

    table = {team: 0 for team in team_strength}

    for match in fixtures:

        home = match["home"]
        away = match["away"]

        xg_home = team_strength[home]
        xg_away = team_strength[away]

        hg = np.random.poisson(xg_home)
        ag = np.random.poisson(xg_away)

        if hg > ag:
            table[home] += 3
        elif ag > hg:
            table[away] += 3
        else:
            table[home] += 1
            table[away] += 1

    return table