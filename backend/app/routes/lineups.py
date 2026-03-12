# ═════════════════════════════════════════════════════
# routes/lineups.py
# FastAPI endpoint: /api/match-lineup/{fixture_id}
# ═════════════════════════════════════════════════════

import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.lineup_engine import (
    predict_lineup,
    normalise_official_lineup,
    _api,
    _fetch_injuries,
    _team_recent_form,
)

router = APIRouter()

API_KEY       = os.getenv("API_FOOTBALL_KEY", "")
CURRENT_SEASON = 2025

# Minutes before kickoff at which official lineups are typically released
LINEUP_ANNOUNCE_WINDOW_MINUTES = 60


# ─────────────────────────────────────────────
# Helper: determine lineup mode
# ─────────────────────────────────────────────

def _lineup_mode(kickoff_iso: Optional[str], has_official: bool) -> str:
    """
    Returns "official" or "predicted".
    Official if: API returned lineups OR kickoff is within announcement window.
    """
    if has_official:
        return "official"
    if not kickoff_iso:
        return "predicted"
    try:
        kickoff = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
        now     = datetime.now(timezone.utc)
        delta   = (kickoff - now).total_seconds() / 60
        if delta <= LINEUP_ANNOUNCE_WINDOW_MINUTES:
            return "official"  # should have been announced
    except Exception:
        pass
    return "predicted"


# ─────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────

@router.get("/api/match-lineup/{fixture_id}")
async def get_match_lineup(fixture_id: int):
    """
    Returns lineup data for a fixture.

    Response shape:
    {
        "mode": "predicted" | "official",
        "announced_at": str | null,
        "home": { team_id, team_name, logo, formation, coach,
                  starting_xi, bench, injuries, doubts, recent_form },
        "away": { ... }
    }
    """
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not set")

    # ── 1. Fetch core fixture ─────────────────
    async def get_fixture():
        data = await _api("/fixtures", {"id": fixture_id}, API_KEY)
        resp = data.get("response", [])
        return resp[0] if resp else {}

    # ── 2. Fetch official lineups ─────────────
    async def get_official_lineups():
        data = await _api("/fixtures/lineups", {"fixture": fixture_id}, API_KEY)
        return data.get("response", [])

    fixture, official_lineups_raw = await asyncio.gather(
        get_fixture(), get_official_lineups()
    )

    if not fixture:
        raise HTTPException(404, "Fixture not found")

    fix      = fixture.get("fixture", {})
    teams    = fixture.get("teams",   {})
    league   = fixture.get("league",  {})

    home_team    = teams.get("home", {})
    away_team    = teams.get("away", {})
    home_team_id = home_team.get("id")
    away_team_id = away_team.get("id")
    league_id    = league.get("id")
    season       = league.get("season") or CURRENT_SEASON
    kickoff      = fix.get("date")

    has_official = len(official_lineups_raw) >= 2
    mode         = _lineup_mode(kickoff, has_official)

    # ── Official path ─────────────────────────
    if mode == "official":
        # Fetch injuries for both teams in parallel (best-effort)
        async def home_inj():
            return await _fetch_injuries(home_team_id, season, API_KEY)

        async def away_inj():
            return await _fetch_injuries(away_team_id, season, API_KEY)

        async def home_form():
            return await _team_recent_form(home_team_id, season, API_KEY)

        async def away_form():
            return await _team_recent_form(away_team_id, season, API_KEY)

        (home_injured, home_doubtful), (away_injured, away_doubtful), \
        home_recent, away_recent = await asyncio.gather(
            home_inj(), away_inj(), home_form(), away_form()
        )

        # Map official lineups to home/away
        home_raw = next(
            (l for l in official_lineups_raw if l.get("team", {}).get("id") == home_team_id),
            official_lineups_raw[0] if official_lineups_raw else {}
        )
        away_raw = next(
            (l for l in official_lineups_raw if l.get("team", {}).get("id") == away_team_id),
            official_lineups_raw[1] if len(official_lineups_raw) > 1 else {}
        )

        home_data = normalise_official_lineup(home_raw, home_injured, home_doubtful)
        away_data = normalise_official_lineup(away_raw, away_injured, away_doubtful)

        home_data["recent_form"] = home_recent
        away_data["recent_form"] = away_recent

        return {
            "mode":         "official",
            "announced_at": kickoff,
            "home":         home_data,
            "away":         away_data,
        }

    # ── Predicted path ────────────────────────
    # Try to get coach info from squads endpoint
    async def get_home_coach():
        try:
            data = await _api("/coachs", {"team": home_team_id}, API_KEY)
            resp = data.get("response", [])
            if resp:
                c = resp[0]
                return c.get("name", ""), c.get("photo", "")
        except Exception:
            pass
        return "", ""

    async def get_away_coach():
        try:
            data = await _api("/coachs", {"team": away_team_id}, API_KEY)
            resp = data.get("response", [])
            if resp:
                c = resp[0]
                return c.get("name", ""), c.get("photo", "")
        except Exception:
            pass
        return "", ""

    (home_coach_name, home_coach_photo), (away_coach_name, away_coach_photo) = \
        await asyncio.gather(get_home_coach(), get_away_coach())

    # Build predicted lineups in parallel
    home_pred_task = predict_lineup(
        team_id    = home_team_id,
        league_id  = league_id,
        season     = season,
        api_key    = API_KEY,
        coach      = home_coach_name,
        coach_photo = home_coach_photo,
        team_name  = home_team.get("name", ""),
        team_logo  = home_team.get("logo", ""),
    )
    away_pred_task = predict_lineup(
        team_id    = away_team_id,
        league_id  = league_id,
        season     = season,
        api_key    = API_KEY,
        coach      = away_coach_name,
        coach_photo = away_coach_photo,
        team_name  = away_team.get("name", ""),
        team_logo  = away_team.get("logo", ""),
    )

    home_data, away_data = await asyncio.gather(home_pred_task, away_pred_task)

    return {
        "mode":         "predicted",
        "announced_at": None,
        "home":         home_data,
        "away":         away_data,
    }