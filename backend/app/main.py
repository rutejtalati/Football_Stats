from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Any
import random
import math

app = FastAPI(title="Football Predictions API", version="1.0.0")

# --- CORS (so frontend can call backend) ---
# In production we will lock this down; for now allow all to avoid "blocked by CORS" errors.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LEAGUES = {
    "epl": "English Premier League",
    "laliga": "La Liga",
    "ligue1": "Ligue 1",
    "seriea": "Serie A",
}

# Minimal team lists (offline, no APIs)
TEAMS = {
    "epl": ["Arsenal", "Chelsea", "Liverpool", "Man City", "Man United", "Newcastle", "Spurs"],
    "laliga": ["Barcelona", "Real Madrid", "Atletico Madrid", "Sevilla", "Villarreal"],
    "ligue1": ["PSG", "Marseille", "Lyon", "Monaco", "Lille"],
    "seriea": ["Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio"],
}

def poisson_pmf(k: int, lam: float) -> float:
    # P(X=k) for Poisson(lam)
    return math.exp(-lam) * (lam**k) / math.factorial(k)

def match_probabilities(xg_home: float, xg_away: float, max_goals: int = 6):
    # Compute W/D/L by summing scoreline probabilities up to max_goals
    home_win = 0.0
    draw = 0.0
    away_win = 0.0

    score_probs = []
    for hg in range(0, max_goals + 1):
        for ag in range(0, max_goals + 1):
            p = poisson_pmf(hg, xg_home) * poisson_pmf(ag, xg_away)
            score_probs.append(((hg, ag), p))
            if hg > ag:
                home_win += p
            elif hg == ag:
                draw += p
            else:
                away_win += p

    # Normalize tiny rounding drift
    total = home_win + draw + away_win
    if total > 0:
        home_win /= total
        draw /= total
        away_win /= total

    score_probs.sort(key=lambda x: x[1], reverse=True)
    return home_win, draw, away_win, score_probs

def over_25_btts(score_probs):
    over25 = 0.0
    btts = 0.0
    for (hg, ag), p in score_probs:
        if hg + ag >= 3:
            over25 += p
        if hg >= 1 and ag >= 1:
            btts += p
    return over25, btts

def confidence_score(p_home: float, p_draw: float, p_away: float) -> int:
    # Simple confidence = how far the max probability is from 1/3
    m = max(p_home, p_draw, p_away)
    conf = int(round((m - (1/3)) * 150))  # scaled
    return max(0, min(conf, 100))

def generate_fixtures(teams: List[str], n_matches: int = 8):
    # Create random fixtures from teams
    fixtures = []
    used = set()
    for _ in range(n_matches):
        home, away = random.sample(teams, 2)
        key = tuple(sorted([home, away]))
        if key in used:
            continue
        used.add(key)
        fixtures.append((home, away))
    return fixtures

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug/routes")
def debug_routes():
    routes = []
    for r in app.routes:
        methods = sorted(list(getattr(r, "methods", []) or []))
        routes.append({"path": getattr(r, "path", ""), "name": getattr(r, "name", ""), "methods": methods})
    return {"routes": routes}

@app.get("/api/league/{code}/predictions")
def league_predictions(code: str):
    code = code.lower().strip()
    if code not in LEAGUES:
        raise HTTPException(status_code=404, detail=f"Unknown league code: {code}")

    teams = TEAMS[code]
    fixtures = generate_fixtures(teams, n_matches=8)

    rows: List[Dict[str, Any]] = []
    for (home, away) in fixtures:
        # Offline xG: small randomness so it works without APIs
        xg_home = round(random.uniform(0.8, 2.2), 2)
        xg_away = round(random.uniform(0.6, 2.0), 2)

        p_home, p_draw, p_away, score_probs = match_probabilities(xg_home, xg_away)
        top3 = score_probs[:3]
        most_likely = top3[0][0]

        over25, btts = over_25_btts(score_probs)
        conf = confidence_score(p_home, p_draw, p_away)

        rows.append({
            "date": "TBD",
            "home_team": home,
            "away_team": away,
            "xg_home": xg_home,
            "xg_away": xg_away,
            "p_home_win": round(p_home, 4),
            "p_draw": round(p_draw, 4),
            "p_away_win": round(p_away, 4),
            "most_likely_score": f"{most_likely[0]}-{most_likely[1]}",
            "top_3_scorelines": [f"{s[0][0]}-{s[0][1]} ({round(s[1], 4)})" for s in top3],
            "over_2_5": round(over25, 4),
            "btts": round(btts, 4),
            "confidence": conf,
        })

    return {
        "league_code": code,
        "league_name": LEAGUES[code],
        "predictions": rows,
    }

# Optional alias route
@app.get("/predictions/{code}")
def predictions_alias(code: str):
    return league_predictions(code)