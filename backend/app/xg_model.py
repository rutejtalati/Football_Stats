import math


def poisson_prob(k, lam):

    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def match_probability(xg_home, xg_away):

    home = 0
    draw = 0
    away = 0

    for h in range(6):
        for a in range(6):

            p = poisson_prob(h, xg_home) * poisson_prob(a, xg_away)

            if h > a:
                home += p
            elif h == a:
                draw += p
            else:
                away += p

    return {
        "home": home,
        "draw": draw,
        "away": away
    }