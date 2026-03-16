# backend/app/routes/predictions.py
# Prediction accountability system — tracks model predictions vs actual results.
# GET /api/predictions/history
# GET /api/predictions/performance
# POST /api/predictions/record   (internal, called after a match completes)

import os, time, json, asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query, Body

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS: Dict[str, int] = {
    "epl": 39, "laliga": 140, "seriea": 135, "bundesliga": 78, "ligue1": 61,
}

def _headers():
    if not API_KEY: raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}

async def _get(path: str, params: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(f"{API_BASE}/{path.lstrip('/')}", headers=_headers(), params=params)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {}

# ── In-memory prediction store (survives restarts poorly, but good for demo)
# In production, replace with a SQLite or Postgres write.
_prediction_log: List[dict] = []
_log_max = 200  # keep last 200 predictions in memory

# ── Cache ─────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_ctimes: Dict[str, float] = {}
def _cget(k, ttl): return _cache[k] if k in _cache and time.monotonic()-_ctimes.get(k,0)<ttl else None
def _cset(k, v): _cache[k]=v; _ctimes[k]=time.monotonic()


def _outcome_label(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals: return "home"
    if away_goals > home_goals: return "away"
    return "draw"


def _outcome_symbol(predicted: str, actual: str) -> str:
    return "✓" if predicted == actual else "✗"


# ── Record a prediction (call from league_predictions in main.py) ──────────
def record_prediction(
    fixture_id: int,
    home_team:  str,
    away_team:  str,
    league:     str,
    predicted_outcome: str,
    confidence: int,
    xg_home:    float,
    xg_away:    float,
    p_home:     float,
    p_draw:     float,
    p_away:     float,
    fixture_date: str = "",
):
    """
    Idempotent — won't duplicate if the same fixture_id already logged.
    """
    global _prediction_log
    if any(p["fixture_id"] == fixture_id for p in _prediction_log):
        return
    entry = {
        "fixture_id":        fixture_id,
        "home_team":         home_team,
        "away_team":         away_team,
        "league":            league,
        "predicted_outcome": predicted_outcome,
        "confidence":        confidence,
        "xg_home":           xg_home,
        "xg_away":           xg_away,
        "p_home":            p_home,
        "p_draw":            p_draw,
        "p_away":            p_away,
        "fixture_date":      fixture_date,
        "recorded_at":       datetime.now(timezone.utc).isoformat(),
        # These are filled in by verify_recent_results
        "actual_outcome":    None,
        "home_goals":        None,
        "away_goals":        None,
        "correct":           None,
        "verified_at":       None,
    }
    _prediction_log.insert(0, entry)
    if len(_prediction_log) > _log_max:
        _prediction_log = _prediction_log[:_log_max]


async def _verify_fixture(fixture_id: int) -> Optional[dict]:
    """Fetch final score for a fixture from API-Football."""
    key = f"fix:{fixture_id}"
    hit = _cget(key, 3600)
    if hit: return hit
    data = await _get("/fixtures", {"id": fixture_id})
    resp = data.get("response", [])
    if not resp: return None
    fix   = resp[0]
    goals = fix.get("goals", {})
    status = fix.get("fixture", {}).get("status", {}).get("short", "")
    if status not in ("FT", "AET", "PEN"):
        return None  # match not finished
    result = {
        "home_goals": goals.get("home"),
        "away_goals": goals.get("away"),
        "status":     status,
    }
    _cset(key, result)
    return result


async def _verify_recent_results():
    """
    Background task: check unverified predictions from the last 14 days
    and fill in actual results.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    tasks = []
    indices = []
    for i, p in enumerate(_prediction_log):
        if p["correct"] is not None:
            continue
        if not p.get("fixture_id"):
            continue
        try:
            recorded = datetime.fromisoformat(p["recorded_at"])
            if recorded < cutoff:
                continue
        except Exception:
            continue
        tasks.append(_verify_fixture(p["fixture_id"]))
        indices.append(i)
    if not tasks:
        return
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for i, result in zip(indices, results):
        if not isinstance(result, dict):
            continue
        hg = result.get("home_goals")
        ag = result.get("away_goals")
        if hg is None or ag is None:
            continue
        actual = _outcome_label(hg, ag)
        _prediction_log[i].update({
            "actual_outcome": actual,
            "home_goals":     hg,
            "away_goals":     ag,
            "correct":        _prediction_log[i]["predicted_outcome"] == actual,
            "verified_at":    datetime.now(timezone.utc).isoformat(),
        })


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/history")
async def prediction_history(
    league: Optional[str] = Query(None),
    limit:  int           = Query(30, ge=1, le=100),
    verified_only: bool   = Query(False),
):
    """
    Returns the last N predictions with actual results where available.
    """
    # Refresh results in background
    try:
        await asyncio.wait_for(_verify_recent_results(), timeout=8.0)
    except asyncio.TimeoutError:
        pass

    pool = _prediction_log
    if league:
        pool = [p for p in pool if p.get("league","").lower() == league.lower()]
    if verified_only:
        pool = [p for p in pool if p.get("correct") is not None]

    formatted = []
    for p in pool[:limit]:
        entry = {**p}
        if p.get("correct") is not None:
            entry["symbol"] = _outcome_symbol(p["predicted_outcome"], p["actual_outcome"])
            entry["score"]  = f"{p['home_goals']}-{p['away_goals']}"
        else:
            entry["symbol"] = "⏳"
            entry["score"]  = "Pending"
        formatted.append(entry)

    return {
        "total":   len(formatted),
        "history": formatted,
    }


@router.get("/performance")
async def prediction_performance(
    league: Optional[str] = Query(None),
    window: int           = Query(30, ge=5, le=100, description="Last N verified predictions"),
):
    """
    Model accuracy, calibration, and confidence-vs-accuracy breakdown.
    """
    try:
        await asyncio.wait_for(_verify_recent_results(), timeout=8.0)
    except asyncio.TimeoutError:
        pass

    pool = [p for p in _prediction_log if p.get("correct") is not None]
    if league:
        pool = [p for p in pool if p.get("league","").lower() == league.lower()]
    pool = pool[:window]

    if not pool:
        return {
            "window":   window,
            "assessed": 0,
            "accuracy": None,
            "message":  "No verified predictions yet. Predictions are verified after matches finish.",
        }

    total    = len(pool)
    correct  = sum(1 for p in pool if p["correct"])
    accuracy = round(correct / total * 100, 1)

    # xG error
    xg_errors = [
        abs(p.get("xg_home", 0) - (p.get("home_goals") or 0)) +
        abs(p.get("xg_away", 0) - (p.get("away_goals") or 0))
        for p in pool
        if p.get("home_goals") is not None
    ]
    avg_xg_error = round(sum(xg_errors) / len(xg_errors), 3) if xg_errors else None

    # Outcome distribution
    outcome_counts: Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    correct_by_outcome: Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    for p in pool:
        oc = p.get("predicted_outcome", "home")
        outcome_counts[oc] = outcome_counts.get(oc, 0) + 1
        if p["correct"]:
            correct_by_outcome[oc] = correct_by_outcome.get(oc, 0) + 1

    outcome_accuracy = {
        k: round(correct_by_outcome[k] / max(outcome_counts[k], 1) * 100, 1)
        for k in outcome_counts
    }

    # Confidence brackets
    brackets = [
        {"label": "High (≥70)",   "min": 70, "max": 101},
        {"label": "Medium (50-69)","min": 50, "max": 70},
        {"label": "Low (<50)",    "min":  0, "max": 50},
    ]
    confidence_breakdown = []
    for b in brackets:
        subset = [p for p in pool if b["min"] <= p.get("confidence", 0) < b["max"]]
        if subset:
            ok = sum(1 for p in subset if p["correct"])
            confidence_breakdown.append({
                "bracket":   b["label"],
                "count":     len(subset),
                "correct":   ok,
                "accuracy":  round(ok / len(subset) * 100, 1),
            })

    return {
        "window":           window,
        "assessed":         total,
        "correct":          correct,
        "accuracy":         accuracy,
        "avg_xg_error":     avg_xg_error,
        "outcome_counts":     outcome_counts,
        "outcome_accuracy":   outcome_accuracy,
        "confidence_breakdown": confidence_breakdown,
        "generated_at":       datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health")
def predictions_health():
    logged = len(_prediction_log)
    verified = sum(1 for p in _prediction_log if p.get("correct") is not None)
    return {
        "logged":   logged,
        "verified": verified,
        "pending":  logged - verified,
    }