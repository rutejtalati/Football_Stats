import random

def random_xg():

    return round(random.uniform(0.8,2.0),2)


def league_points(home_goals, away_goals):

    if home_goals > away_goals:
        return 3,0
    elif away_goals > home_goals:
        return 0,3
    else:
        return 1,1