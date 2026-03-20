# backend/app/routes/predictions.py
# ═══════════════════════════════════════════════════════════════════════════════
# Prediction accountability system — v2
#
# Storage
# ───────
# SQLite database (predictions.db) located next to this file, or at the path
# set by the PREDICTIONS_DB environment variable.  Falls back to an in-memory
# list when the DB cannot be opened (e.g. read-only filesystem) so the server
# always starts cleanly.
#
# Existing endpoints (unchanged — no frontend breakage)
# ─────────────────────────────────────────────────────
#   GET /api/predictions/history
#   GET /api/predictions/performance
#   GET /api/predictions/health
#
# New endpoint
# ────────────
#   GET /api/model-performance
#       overall_accuracy, log_loss (multi-class), brier_score (multi-class),
#       last_30_accuracy, recent_predictions[30], calibration_curve, trend
#
# Internal API (called from main.py — signature unchanged)
# ─────────────────────────────────────────────────────────
#   record_prediction(fixture_id, home_team, away_team, league,
#                     predicted_outcome, confidence, xg_home, xg_away,
#                     p_home, p_draw, p_away, fixture_date="")
# ═══════════════════════════════════════════════════════════════════════════════

import math
import os
import pathlib
import sqlite3
import threading
import time
import asyncio
import logging

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

API_KEY  = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"
SEASON   = int(os.getenv("CURRENT_SEASON", "2025"))

LEAGUE_IDS: Dict[str, int] = {
    "epl": 39, "laliga": 140, "seriea": 135, "bundesliga": 78, "ligue1": 61,
}


# ══════════════════════════════════════════════════════════════════════════════
# DATABASE LAYER
# ══════════════════════════════════════════════════════════════════════════════

# Resolve DB path: env var → sibling of this file → /tmp fallback
_DB_ENV  = os.getenv("PREDICTIONS_DB", "")
if not _DB_ENV:
    # Try app dir first; fall back to /tmp (survives Render restarts better)
    _app_path = pathlib.Path(__file__).parent / "predictions.db"
    try:
        _app_path.parent.mkdir(parents=True, exist_ok=True)
        _app_path.touch(exist_ok=True)
        _DB_PATH = _app_path
    except OSError:
        _DB_PATH = pathlib.Path("/tmp/predictions.db")
else:
    _DB_PATH = pathlib.Path(_DB_ENV)

# Module-level SQLite connection (check_same_thread=False) guarded by a lock.
# A single connection is safe here because FastAPI runs in one process and
# all DB writes are short-lived, synchronous, and protected by the lock.
_db_lock: threading.Lock = threading.Lock()
_db_conn: Optional[sqlite3.Connection] = None
_db_available: bool = False

# In-memory fallback — used when SQLite cannot be opened
_prediction_log: List[dict] = []
_log_max = 500


def _get_conn() -> Optional[sqlite3.Connection]:
    """Return the module-level connection, initialising it on first call."""
    global _db_conn, _db_available
    if _db_conn is not None:
        return _db_conn
    try:
        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")   # faster concurrent reads
        conn.execute("PRAGMA foreign_keys=ON")
        _create_schema(conn)
        _db_conn = conn
        _db_available = True
        logger.info("Predictions DB opened at %s", _DB_PATH)
    except Exception as exc:
        logger.warning(
            "Predictions DB unavailable (%s) — using in-memory fallback.", exc
        )
        _db_available = False
    return _db_conn


def _create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS predictions (
            fixture_id          INTEGER PRIMARY KEY,
            home_team           TEXT    NOT NULL,
            away_team           TEXT    NOT NULL,
            league              TEXT    NOT NULL DEFAULT '',
            predicted_outcome   TEXT    NOT NULL,
            predicted_home_win  REAL    NOT NULL DEFAULT 0,
            predicted_draw      REAL    NOT NULL DEFAULT 0,
            predicted_away_win  REAL    NOT NULL DEFAULT 0,
            confidence          INTEGER NOT NULL DEFAULT 50,
            xg_home             REAL,
            xg_away             REAL,
            fixture_date        TEXT    DEFAULT '',
            recorded_at         TEXT    NOT NULL,
            actual_outcome      TEXT,
            home_goals          INTEGER,
            away_goals          INTEGER,
            correct             INTEGER,      -- 1=correct, 0=wrong, NULL=pending
            verified_at         TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_recorded_at ON predictions(recorded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_league       ON predictions(league);
        CREATE INDEX IF NOT EXISTS idx_correct      ON predictions(correct);
    """)
    conn.commit()


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Normalise correct: SQLite stores 0/1/NULL, we want bool/None
    if d.get("correct") is not None:
        d["correct"] = bool(d["correct"])
    return d


# ══════════════════════════════════════════════════════════════════════════════
# HTTP / CACHE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _headers():
    if not API_KEY:
        raise HTTPException(500, "API_FOOTBALL_KEY not set")
    return {"x-apisports-key": API_KEY}


async def _http_get(path: str, params: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(
                f"{API_BASE}/{path.lstrip('/')}",
                headers=_headers(), params=params,
            )
            r.raise_for_status()
            return r.json()
    except Exception:
        return {}


_cache: Dict[str, Any]   = {}
_ctimes: Dict[str, float] = {}


def _cget(k: str, ttl: float) -> Optional[Any]:
    return _cache[k] if k in _cache and time.monotonic() - _ctimes.get(k, 0) < ttl else None


def _cset(k: str, v: Any) -> None:
    _cache[k] = v
    _ctimes[k] = time.monotonic()


# ══════════════════════════════════════════════════════════════════════════════
# SHARED HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _outcome_label(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "home"
    if away_goals > home_goals:
        return "away"
    return "draw"


def _outcome_symbol(predicted: str, actual: str) -> str:
    return "✓" if predicted == actual else "✗"


# ══════════════════════════════════════════════════════════════════════════════
# PROBABILISTIC SCORING METRICS
# ══════════════════════════════════════════════════════════════════════════════

def _log_loss(predictions: List[dict], eps: float = 1e-12) -> Optional[float]:
    """
    Multi-class log-loss (base-e natural log).
    Only uses the probability assigned to the *actual* outcome.

    Perfect model → 0.0.  Uniform (1/3 each) → ln(3) ≈ 1.099.
    A decent football model achieves 0.95–1.05.
    """
    scored = [
        p for p in predictions
        if p.get("correct") is not None
        and p.get("actual_outcome") is not None
    ]
    if not scored:
        return None
    total = 0.0
    for p in scored:
        actual = p["actual_outcome"]
        if   actual == "home": prob = p.get("predicted_home_win") or eps
        elif actual == "draw": prob = p.get("predicted_draw")     or eps
        else:                  prob = p.get("predicted_away_win") or eps
        total += math.log(max(float(prob), eps))
    return round(-total / len(scored), 4)


def _brier_score(predictions: List[dict]) -> Optional[float]:
    """
    Multi-class Brier score.
    BS = (1/N) × Σ_i Σ_k (p_ik − o_ik)²

    Perfect model → 0.0.  Uniform (1/3 each) → 2/3 ≈ 0.667.
    A typical football model achieves 0.58–0.66.
    """
    scored = [
        p for p in predictions
        if p.get("correct") is not None
        and p.get("actual_outcome") is not None
    ]
    if not scored:
        return None
    total = 0.0
    for p in scored:
        actual  = p["actual_outcome"]
        p_home  = float(p.get("predicted_home_win") or 0)
        p_draw  = float(p.get("predicted_draw")     or 0)
        p_away  = float(p.get("predicted_away_win") or 0)
        o_home  = 1.0 if actual == "home" else 0.0
        o_draw  = 1.0 if actual == "draw" else 0.0
        o_away  = 1.0 if actual == "away" else 0.0
        total  += (p_home - o_home) ** 2 + (p_draw - o_draw) ** 2 + (p_away - o_away) ** 2
    return round(total / len(scored), 4)


def _calibration_curve(predictions: List[dict], n_buckets: int = 10) -> List[dict]:
    """
    Calibration curve: for each probability bucket, compare the model's
    predicted confidence against the actual win rate in that bucket.

    Uses the probability assigned to the *predicted* outcome so that the
    curve shows "when the model said X% confident, it was actually right Y%".

    Returns only buckets that have at least one observation.
    """
    buckets: List[dict] = [
        {
            "label":           f"{i*10}–{(i+1)*10}%",
            "min":             i / n_buckets,
            "max":             (i + 1) / n_buckets,
            "n":               0,
            "predicted_avg":   0.0,
            "actual_rate":     None,
        }
        for i in range(n_buckets)
    ]
    correct_counts = [0] * n_buckets

    for p in predictions:
        if p.get("correct") is None:
            continue
        outcome = p.get("predicted_outcome") or p.get("predicted_outcome")
        if   outcome == "home": prob = float(p.get("predicted_home_win") or 0)
        elif outcome == "draw": prob = float(p.get("predicted_draw")     or 0)
        else:                   prob = float(p.get("predicted_away_win") or 0)

        idx = min(int(prob * n_buckets), n_buckets - 1)
        buckets[idx]["n"]             += 1
        buckets[idx]["predicted_avg"] += prob
        if p.get("correct"):
            correct_counts[idx] += 1

    result = []
    for i, b in enumerate(buckets):
        if b["n"] == 0:
            continue
        b["predicted_avg"] = round(b["predicted_avg"] / b["n"], 3)
        b["actual_rate"]   = round(correct_counts[i]  / b["n"], 3)
        result.append(b)

    return result


def _rolling_accuracy_trend(predictions: List[dict], window: int = 10) -> List[dict]:
    """
    Rolling window accuracy for a sparkline trend chart.
    Returns up to the last 20 data points (each covering `window` matches).
    Newest observation is last.
    """
    verified = [p for p in predictions if p.get("correct") is not None]
    if len(verified) < window:
        return []
    points = []
    for i in range(len(verified) - window + 1):
        chunk = verified[i: i + window]
        acc   = round(sum(1 for p in chunk if p["correct"]) / window * 100, 1)
        points.append({
            "end_index": i + window,
            "accuracy":  acc,
        })
    return points[-20:]


# ══════════════════════════════════════════════════════════════════════════════
# WRITE: record_prediction
# ══════════════════════════════════════════════════════════════════════════════

def record_prediction(
    fixture_id:        int,
    home_team:         str,
    away_team:         str,
    league:            str,
    predicted_outcome: str,
    confidence:        int,
    xg_home:           float,
    xg_away:           float,
    p_home:            float,
    p_draw:            float,
    p_away:            float,
    fixture_date:      str = "",
) -> None:
    """
    Idempotent — silently skips if fixture_id already stored.
    Writes to SQLite when available, falls back to the in-memory list.

    Signature is unchanged from v1 so existing call sites in main.py
    require no modifications.
    """
    recorded_at = datetime.now(timezone.utc).isoformat()

    conn = _get_conn()
    if conn is not None and _db_available:
        try:
            with _db_lock:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO predictions (
                        fixture_id, home_team, away_team, league,
                        predicted_outcome,
                        predicted_home_win, predicted_draw, predicted_away_win,
                        confidence, xg_home, xg_away, fixture_date, recorded_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        fixture_id, home_team, away_team, league,
                        predicted_outcome,
                        round(float(p_home), 4),
                        round(float(p_draw), 4),
                        round(float(p_away), 4),
                        int(confidence),
                        round(float(xg_home), 3) if xg_home else None,
                        round(float(xg_away), 3) if xg_away else None,
                        fixture_date,
                        recorded_at,
                    ),
                )
                conn.commit()
            return
        except Exception as exc:
            logger.warning("DB write failed for fixture %s: %s", fixture_id, exc)
            # Fall through to in-memory

    # ── In-memory fallback ────────────────────────────────────────────
    global _prediction_log
    if any(p["fixture_id"] == fixture_id for p in _prediction_log):
        return
    entry = {
        "fixture_id":         fixture_id,
        "home_team":          home_team,
        "away_team":          away_team,
        "league":             league,
        "predicted_outcome":  predicted_outcome,
        "predicted_home_win": round(float(p_home), 4),
        "predicted_draw":     round(float(p_draw), 4),
        "predicted_away_win": round(float(p_away), 4),
        "confidence":         int(confidence),
        "xg_home":            round(float(xg_home), 3) if xg_home else None,
        "xg_away":            round(float(xg_away), 3) if xg_away else None,
        "fixture_date":       fixture_date,
        "recorded_at":        recorded_at,
        "actual_outcome":     None,
        "home_goals":         None,
        "away_goals":         None,
        "correct":            None,
        "verified_at":        None,
    }
    _prediction_log.insert(0, entry)
    if len(_prediction_log) > _log_max:
        _prediction_log = _prediction_log[:_log_max]


# ══════════════════════════════════════════════════════════════════════════════
# RESULT VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════

async def _verify_fixture(fixture_id: int) -> Optional[dict]:
    """Fetch final score from API-Football. Returns None if match unfinished."""
    key = f"fix:{fixture_id}"
    hit = _cget(key, 3600)
    if hit:
        return hit
    data  = await _http_get("/fixtures", {"id": fixture_id})
    resp  = data.get("response", [])
    if not resp:
        return None
    fix    = resp[0]
    goals  = fix.get("goals", {})
    status = fix.get("fixture", {}).get("status", {}).get("short", "")
    if status not in ("FT", "AET", "PEN"):
        return None
    result = {
        "home_goals": goals.get("home"),
        "away_goals": goals.get("away"),
        "status":     status,
    }
    _cset(key, result)
    return result


async def _verify_recent_results() -> None:
    """
    Background task: fill in actual results for unverified predictions
    from the last 14 days.  Writes back to SQLite or in-memory list.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)

    # ── Fetch unverified IDs ──────────────────────────────────────────
    conn = _get_conn()
    if conn is not None and _db_available:
        with _db_lock:
            rows = conn.execute(
                """
                SELECT fixture_id, recorded_at FROM predictions
                WHERE correct IS NULL
                  AND fixture_id IS NOT NULL
                  AND recorded_at >= ?
                ORDER BY recorded_at DESC
                LIMIT 50
                """,
                (cutoff.isoformat(),),
            ).fetchall()
        pending = [dict(r) for r in rows]
    else:
        pending = [
            {"fixture_id": p["fixture_id"], "recorded_at": p.get("recorded_at", "")}
            for p in _prediction_log
            if p.get("correct") is None and p.get("fixture_id")
        ]

    if not pending:
        return

    tasks   = [_verify_fixture(p["fixture_id"]) for p in pending]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for pending_row, result in zip(pending, results):
        if not isinstance(result, dict):
            continue
        hg = result.get("home_goals")
        ag = result.get("away_goals")
        if hg is None or ag is None:
            continue
        actual     = _outcome_label(int(hg), int(ag))
        verified_at = datetime.now(timezone.utc).isoformat()
        fid         = pending_row["fixture_id"]

        if conn is not None and _db_available:
            # Read the stored predicted_outcome to compute correct
            with _db_lock:
                stored = conn.execute(
                    "SELECT predicted_outcome FROM predictions WHERE fixture_id=?", (fid,)
                ).fetchone()
                if stored is None:
                    continue
                correct = 1 if stored["predicted_outcome"] == actual else 0
                conn.execute(
                    """
                    UPDATE predictions
                    SET actual_outcome=?, home_goals=?, away_goals=?,
                        correct=?, verified_at=?
                    WHERE fixture_id=?
                    """,
                    (actual, int(hg), int(ag), correct, verified_at, fid),
                )
                conn.commit()
        else:
            for i, p in enumerate(_prediction_log):
                if p["fixture_id"] == fid:
                    _prediction_log[i].update({
                        "actual_outcome": actual,
                        "home_goals":     int(hg),
                        "away_goals":     int(ag),
                        "correct":        p["predicted_outcome"] == actual,
                        "verified_at":    verified_at,
                    })
                    break


# ══════════════════════════════════════════════════════════════════════════════
# READ: fetch helpers
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_all(
    league: Optional[str] = None,
    limit:  int           = 500,
    verified_only: bool   = False,
) -> List[dict]:
    """Return predictions newest-first from SQLite (or in-memory fallback)."""
    conn = _get_conn()
    if conn is not None and _db_available:
        clauses = ["1=1"]
        params: list = []
        if league:
            clauses.append("LOWER(league) = LOWER(?)")
            params.append(league)
        if verified_only:
            clauses.append("correct IS NOT NULL")
        params.append(limit)
        with _db_lock:
            rows = conn.execute(
                f"SELECT * FROM predictions WHERE {' AND '.join(clauses)} "
                f"ORDER BY recorded_at DESC LIMIT ?",
                params,
            ).fetchall()
        return [_row_to_dict(r) for r in rows]

    # In-memory fallback
    pool = _prediction_log
    if league:
        pool = [p for p in pool if p.get("league", "").lower() == league.lower()]
    if verified_only:
        pool = [p for p in pool if p.get("correct") is not None]
    return pool[:limit]


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING ENDPOINTS  (signatures and response shapes preserved)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/history")
async def prediction_history(
    league:        Optional[str] = Query(None),
    limit:         int           = Query(30, ge=1, le=100),
    verified_only: bool          = Query(False),
):
    """Returns the last N predictions with actual results where available."""
    try:
        await asyncio.wait_for(_verify_recent_results(), timeout=8.0)
    except asyncio.TimeoutError:
        pass

    pool = _fetch_all(league=league, limit=limit, verified_only=verified_only)
    formatted = []
    for p in pool:
        entry = dict(p)
        if p.get("correct") is not None:
            entry["symbol"] = _outcome_symbol(p["predicted_outcome"], p["actual_outcome"])
            entry["score"]  = f"{p['home_goals']}-{p['away_goals']}"
        else:
            entry["symbol"] = "⏳"
            entry["score"]  = "Pending"
        formatted.append(entry)

    return {"total": len(formatted), "history": formatted}


@router.get("/performance")
async def prediction_performance(
    league: Optional[str] = Query(None),
    window: int           = Query(30, ge=5, le=100, description="Last N verified predictions"),
):
    """Model accuracy, calibration, and confidence-vs-accuracy breakdown."""
    try:
        await asyncio.wait_for(_verify_recent_results(), timeout=8.0)
    except asyncio.TimeoutError:
        pass

    pool = _fetch_all(league=league, limit=window, verified_only=True)
    if not pool:
        return {
            "window":   window,
            "assessed": 0,
            "accuracy": None,
            "message":  "No verified predictions yet. Predictions are verified after matches finish.",
        }

    total   = len(pool)
    correct = sum(1 for p in pool if p.get("correct"))
    accuracy = round(correct / total * 100, 1)

    xg_errors = [
        abs(float(p.get("xg_home") or 0) - float(p.get("home_goals") or 0)) +
        abs(float(p.get("xg_away") or 0) - float(p.get("away_goals") or 0))
        for p in pool if p.get("home_goals") is not None
    ]
    avg_xg_error = round(sum(xg_errors) / len(xg_errors), 3) if xg_errors else None

    outcome_counts:    Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    correct_by_outcome: Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    for p in pool:
        oc = p.get("predicted_outcome", "home")
        outcome_counts[oc]     = outcome_counts.get(oc, 0) + 1
        if p.get("correct"):
            correct_by_outcome[oc] = correct_by_outcome.get(oc, 0) + 1

    outcome_accuracy = {
        k: round(correct_by_outcome[k] / max(outcome_counts[k], 1) * 100, 1)
        for k in outcome_counts
    }

    brackets = [
        {"label": "High (≥70)",    "min": 70, "max": 101},
        {"label": "Medium (50-69)","min": 50, "max": 70},
        {"label": "Low (<50)",     "min":  0, "max": 50},
    ]
    confidence_breakdown = []
    for b in brackets:
        subset = [p for p in pool if b["min"] <= int(p.get("confidence") or 0) < b["max"]]
        if subset:
            ok = sum(1 for p in subset if p.get("correct"))
            confidence_breakdown.append({
                "bracket":  b["label"],
                "count":    len(subset),
                "correct":  ok,
                "accuracy": round(ok / len(subset) * 100, 1),
            })

    return {
        "window":               window,
        "assessed":             total,
        "correct":              correct,
        "accuracy":             accuracy,
        "avg_xg_error":         avg_xg_error,
        "outcome_counts":       outcome_counts,
        "outcome_accuracy":     outcome_accuracy,
        "confidence_breakdown": confidence_breakdown,
        "generated_at":         datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health")
def predictions_health():
    conn = _get_conn()
    if conn is not None and _db_available:
        with _db_lock:
            row = conn.execute(
                "SELECT COUNT(*) as total, "
                "SUM(CASE WHEN correct IS NOT NULL THEN 1 ELSE 0 END) as verified "
                "FROM predictions"
            ).fetchone()
        logged   = row["total"]   or 0
        verified = row["verified"] or 0
    else:
        logged   = len(_prediction_log)
        verified = sum(1 for p in _prediction_log if p.get("correct") is not None)

    return {
        "logged":       logged,
        "verified":     verified,
        "pending":      logged - verified,
        "storage":      "sqlite" if _db_available else "memory",
        "db_path":      str(_DB_PATH) if _db_available else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
# NEW ENDPOINT — GET /api/model-performance
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/model-performance", tags=["predictions"])
async def model_performance(
    league: Optional[str] = Query(None,  description="Filter by league name"),
    window: int           = Query(200,   ge=10, le=1000,
                                  description="Max verified predictions to score against"),
):
    """
    Comprehensive model performance dashboard.

    Returns overall probabilistic scoring metrics (log-loss, Brier score),
    accuracy figures, a calibration curve, a rolling accuracy trend, and
    the last 30 verified predictions in a shape ready for a results table.

    Probabilistic metrics
    ─────────────────────
    log_loss    — cross-entropy loss (lower is better; uniform = ln(3) ≈ 1.099)
    brier_score — mean squared error of probability vector (0 = perfect; 0.667 = uniform)

    Both metrics use the full three-class probability vector stored at
    prediction time, not just the predicted label — they reward well-
    calibrated probabilities, not just correct picks.
    """
    try:
        await asyncio.wait_for(_verify_recent_results(), timeout=8.0)
    except asyncio.TimeoutError:
        pass

    # ── Fetch verified pool (scored against metrics) ──────────────────
    verified = _fetch_all(league=league, limit=window, verified_only=True)

    # ── Fetch last 30 regardless of verification state (for the table) ─
    recent_all = _fetch_all(league=league, limit=30, verified_only=False)

    if not verified:
        return {
            "overall_accuracy":  None,
            "log_loss":          None,
            "brier_score":       None,
            "last_30_accuracy":  None,
            "assessed":          0,
            "recent_predictions": [],
            "calibration_curve": [],
            "trend":             [],
            "storage":           "sqlite" if _db_available else "memory",
            "message": (
                "No verified predictions yet. "
                "Predictions are verified automatically after matches finish."
            ),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── Overall metrics ───────────────────────────────────────────────
    total   = len(verified)
    correct = sum(1 for p in verified if p.get("correct"))

    overall_accuracy = round(correct / total * 100, 1)
    ll               = _log_loss(verified)
    bs               = _brier_score(verified)

    # ── Last-30 accuracy (from the verified pool, newest 30) ──────────
    last_30 = verified[:30]
    last_30_correct  = sum(1 for p in last_30 if p.get("correct"))
    last_30_accuracy = (
        round(last_30_correct / len(last_30) * 100, 1) if last_30 else None
    )

    # ── Per-outcome breakdown ─────────────────────────────────────────
    outcome_counts:    Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    correct_by_outcome: Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
    for p in verified:
        oc = p.get("predicted_outcome") or "home"
        outcome_counts[oc]     = outcome_counts.get(oc, 0) + 1
        if p.get("correct"):
            correct_by_outcome[oc] = correct_by_outcome.get(oc, 0) + 1

    outcome_accuracy = {
        k: round(correct_by_outcome[k] / max(outcome_counts[k], 1) * 100, 1)
        for k in outcome_counts
    }

    # ── Calibration curve ─────────────────────────────────────────────
    calibration = _calibration_curve(verified)

    # ── Rolling accuracy trend ────────────────────────────────────────
    trend = _rolling_accuracy_trend(verified, window=10)

    # ── Last 30 predictions for the results table ─────────────────────
    recent_predictions = []
    for p in recent_all:
        verified_flag = p.get("correct") is not None
        entry = {
            # Required spec fields
            "fixture_id":          p["fixture_id"],
            "home_team":           p["home_team"],
            "away_team":           p["away_team"],
            "league":              p.get("league", ""),
            "predicted_home_win":  p.get("predicted_home_win"),
            "predicted_draw":      p.get("predicted_draw"),
            "predicted_away_win":  p.get("predicted_away_win"),
            "predicted_outcome":   p.get("predicted_outcome"),
            "actual_result":       p.get("actual_outcome"),      # None if pending
            "correct":             p.get("correct"),              # None if pending
            "confidence":          p.get("confidence"),
            "timestamp":           p.get("recorded_at"),
            # Extra context for dashboard display
            "fixture_date":        p.get("fixture_date", ""),
            "xg_home":             p.get("xg_home"),
            "xg_away":             p.get("xg_away"),
            "score":               (
                f"{p['home_goals']}-{p['away_goals']}"
                if verified_flag else "Pending"
            ),
            "symbol":              (
                _outcome_symbol(p["predicted_outcome"], p["actual_outcome"])
                if verified_flag else "⏳"
            ),
        }
        recent_predictions.append(entry)

    return {
        # ── Headline metrics ──────────────────────────────────────────
        "overall_accuracy":  overall_accuracy,   # % correct over full window
        "log_loss":          ll,                  # multi-class cross-entropy
        "brier_score":       bs,                  # multi-class Brier
        "last_30_accuracy":  last_30_accuracy,    # rolling accuracy, last 30

        # ── Counts ───────────────────────────────────────────────────
        "assessed":          total,
        "correct":           correct,
        "window":            window,

        # ── Per-outcome breakdown ─────────────────────────────────────
        "outcome_counts":   outcome_counts,
        "outcome_accuracy": outcome_accuracy,

        # ── Last 30 predictions (table data) ─────────────────────────
        "recent_predictions": recent_predictions,

        # ── Chart data ───────────────────────────────────────────────
        "calibration_curve": calibration,
        "trend":             trend,

        # ── Meta ─────────────────────────────────────────────────────
        "storage":      "sqlite" if _db_available else "memory",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Convenience alias so the new endpoint is also reachable at the
#    top-level path (without the /api/predictions prefix) ─────────────
from fastapi import APIRouter as _AR
_perf_router = _AR(tags=["predictions"])

@_perf_router.get("/api/model-performance")
async def model_performance_alias(
    league: Optional[str] = Query(None),
    window: int           = Query(200, ge=10, le=1000),
):
    """Alias for /api/predictions/model-performance."""
    return await model_performance(league=league, window=window)