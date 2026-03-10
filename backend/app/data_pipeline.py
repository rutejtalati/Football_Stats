import requests
import os

API_KEY = os.getenv("API_FOOTBALL_KEY")

BASE_URL = "https://v3.football.api-sports.io"

headers = {
    "x-apisports-key": API_KEY
}


def get_fixtures(league_id, season=2025):

    params = {
        "league": league_id,
        "season": season
    }

    r = requests.get(
        f"{BASE_URL}/fixtures",
        headers=headers,
        params=params
    )

    return r.json()


def get_team_stats(team_id, league, season):

    params = {
        "team": team_id,
        "league": league,
        "season": season
    }

    r = requests.get(
        f"{BASE_URL}/teams/statistics",
        headers=headers,
        params=params
    )

    return r.json()