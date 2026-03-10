import random
from collections import defaultdict

SIMS = 10000

LEAGUE_TEAMS = {
    "epl": [
        "Arsenal", "Chelsea", "Liverpool", "Man City", "Man United",
        "Newcastle", "Spurs", "Aston Villa", "Brighton", "West Ham",
        "Wolves", "Everton", "Fulham", "Brentford", "Bournemouth",
        "Crystal Palace", "Forest", "Burnley", "Leeds", "Sunderland",
    ],
    "laliga": [
        "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Villarreal",
        "Real Sociedad", "Valencia", "Betis", "Athletic Club", "Getafe",
        "Osasuna", "Mallorca", "Celta Vigo", "Girona", "Alaves",
        "Las Palmas", "Espanyol", "Rayo Vallecano", "Leganes", "Granada",
    ],
    "seriea": [
        "Inter", "Milan", "Juventus", "Napoli", "Roma",
        "Lazio", "Atalanta", "Fiorentina", "Bologna", "Torino",
        "Udinese", "Genoa", "Sassuolo", "Monza", "Parma",
        "Cagliari", "Verona", "Lecce", "Empoli", "Como",
    ],
    "ligue1": [
        "PSG", "Marseille", "Monaco", "Lyon", "Lille",
        "Nice", "Lens", "Rennes", "Strasbourg", "Nantes",
        "Brest", "Toulouse", "Reims", "Montpellier", "Auxerre",
        "Le Havre", "Angers", "Saint-Etienne", "Metz", "Lorient",
    ],
}

LEAGUE_STRENGTHS = {
    "epl": {
        "Arsenal": 1.90, "Chelsea": 1.45, "Liverpool": 1.85, "Man City": 2.05, "Man United": 1.45,
        "Newcastle": 1.55, "Spurs": 1.55, "Aston Villa": 1.45, "Brighton": 1.35, "West Ham": 1.20,
        "Wolves": 1.05, "Everton": 1.10, "Fulham": 1.08, "Brentford": 1.12, "Bournemouth": 1.08,
        "Crystal Palace": 1.10, "Forest": 1.00, "Burnley": 0.92, "Leeds": 0.95, "Sunderland": 0.88,
    },
    "laliga": {
        "Real Madrid": 2.00, "Barcelona": 1.90, "Atletico Madrid": 1.70, "Sevilla": 1.20, "Villarreal": 1.30,
        "Real Sociedad": 1.35, "Valencia": 1.18, "Betis": 1.28, "Athletic Club": 1.32, "Getafe": 1.00,
        "Osasuna": 1.00, "Mallorca": 0.96, "Celta Vigo": 0.98, "Girona": 1.35, "Alaves": 0.92,
        "Las Palmas": 0.90, "Espanyol": 0.92, "Rayo Vallecano": 0.95, "Leganes": 0.86, "Granada": 0.84,
    },
    "seriea": {
        "Inter": 1.95, "Milan": 1.70, "Juventus": 1.68, "Napoli": 1.62, "Roma": 1.45,
        "Lazio": 1.42, "Atalanta": 1.55, "Fiorentina": 1.28, "Bologna": 1.24, "Torino": 1.08,
        "Udinese": 1.00, "Genoa": 0.98, "Sassuolo": 0.96, "Monza": 0.98, "Parma": 0.92,
        "Cagliari": 0.88, "Verona": 0.86, "Lecce": 0.85, "Empoli": 0.82, "Como": 0.80,
    },
    "ligue1": {
        "PSG": 2.10, "Marseille": 1.55, "Monaco": 1.58, "Lyon": 1.30, "Lille": 1.48,
        "Nice": 1.35, "Lens": 1.32, "Rennes": 1.28, "Strasbourg": 1.05, "Nantes": 0.96,
        "Brest": 1.05, "Toulouse": 0.98, "Reims": 1.00, "Montpellier": 0.94, "Auxerre": 0.88,
        "Le Havre": 0.86, "Angers": 0.84, "Saint-Etienne": 0.82, "Metz": 0.80, "Lorient": 0.79,
    },
}


def generate_round_robin_pairs(teams):
    fixtures = []
    n = len(teams)
    for i in range(n):
        for j in range(i + 1, n):
            fixtures.append((teams[i], teams[j]))
            fixtures.append((teams[j], teams[i]))
    return fixtures


def simulate_match(home_strength, away_strength):
    home_advantage = 0.18
    home_xg = max(0.2, home_strength + home_advantage)
    away_xg = max(0.2, away_strength)

    home_goals = min(7, random.poisson(home_xg) if hasattr(random, "poisson") else _poisson_sample(home_xg))
    away_goals = min(7, random.poisson(away_xg) if hasattr(random, "poisson") else _poisson_sample(away_xg))
    return home_goals, away_goals


def _poisson_sample(lam):
    # Knuth method
    import math
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while p > L:
        k += 1
        p *= random.random()
    return k - 1


def monte_carlo_league(league_code: str):
    if league_code not in LEAGUE_TEAMS:
        raise ValueError(f"Unknown league code: {league_code}")

    teams = LEAGUE_TEAMS[league_code]
    strengths = LEAGUE_STRENGTHS[league_code]
    fixtures = generate_round_robin_pairs(teams)

    position_history = defaultdict(list)
    points_history = defaultdict(list)

    for _ in range(SIMS):
        points = defaultdict(int)
        gf = defaultdict(int)
        ga = defaultdict(int)

        for home, away in fixtures:
            hg, ag = simulate_match(strengths[home], strengths[away])

            gf[home] += hg
            ga[home] += ag
            gf[away] += ag
            ga[away] += hg

            if hg > ag:
                points[home] += 3
            elif ag > hg:
                points[away] += 3
            else:
                points[home] += 1
                points[away] += 1

        table = sorted(
            teams,
            key=lambda t: (points[t], gf[t] - ga[t], gf[t]),
            reverse=True,
        )

        for pos, team in enumerate(table, start=1):
            position_history[team].append(pos)
            points_history[team].append(points[team])

    results = []
    for team in teams:
        positions = position_history[team]
        pts = points_history[team]
        total = len(positions)

        results.append({
            "team": team,
            "avg_position": round(sum(positions) / total, 2),
            "avg_points": round(sum(pts) / total, 1),
            "title_prob": round(100 * sum(1 for p in positions if p == 1) / total, 2),
            "top4_prob": round(100 * sum(1 for p in positions if p <= 4) / total, 2),
            "top5_prob": round(100 * sum(1 for p in positions if p <= 5) / total, 2),
            "top_half_prob": round(100 * sum(1 for p in positions if p <= 10) / total, 2),
            "relegation_prob": round(100 * sum(1 for p in positions if p >= 18) / total, 2),
        })

    results.sort(key=lambda x: x["avg_position"])
    return results