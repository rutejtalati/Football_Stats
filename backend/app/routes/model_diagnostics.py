"""
backend/app/routes/model_diagnostics.py
════════════════════════════════════════════════════════════════════════
GET /api/model-diagnostics

Returns a comprehensive diagnostic snapshot of the trained ML prediction
model so engineers can evaluate which features are influencing outcomes
and whether the model is performing correctly.

Response sections
─────────────────
feature_importance
    • permutation_importances  — model-agnostic, computed at training time
      against held-out validation data (always available)
    • native_importances       — extracted directly from the model internals:
        XGBoost  → weight / gain / cover / total_gain via get_booster().get_score()
        HGB      → "none" (sklearn HGB has no native feature_importances_)
    • ranked                   — features sorted by permutation importance with
                                 rank, absolute value, and % of total

model_accuracy
    • overall accuracy on the validation split
    • per-class accuracy (away_win / draw / home_win)
    • n_val — number of validation samples used

model_log_loss
    • multi-class cross-entropy (base-e) on validation split
    • interpretation guide (floor values for reference)

confusion_matrix
    • raw counts  (3×3, rows = actual, cols = predicted)
    • row-normalised (shows recall per class; diagonal = per-class accuracy)
    • labels, description

model_info
    • backend, trained_at, n_train, hyperparameters, class encoding
    • model_path, meta_path

All metrics come from meta.json written at train_model() time — no
re-inference is performed at request time, keeping latency negligible.
The only live computation is loading meta.json from disk (cached for
TTL seconds).

Route registration
──────────────────
Add to main.py:
    try:
        from app.routes.model_diagnostics import router as diagnostics_router
        app.include_router(diagnostics_router)
    except ImportError:
        pass
"""

from __future__ import annotations

import json
import logging
import os
import pathlib
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(tags=["model_diagnostics"])

# ── Model directory — mirrors the default in ml_predictor.py ─────────────────
# Resolved once at import time; can be overridden via MODEL_DIR env var.
_DEFAULT_MODEL_DIR = pathlib.Path(
    os.getenv(
        "MODEL_DIR",
        str(pathlib.Path(__file__).parent.parent / "models" / "saved_models"),
    )
)

# ── Response cache (avoids repeated disk reads on every request) ──────────────
_CACHE: Dict[str, Any]   = {}
_CTIMES: Dict[str, float] = {}
_TTL = 300   # 5 minutes — meta.json only changes when model is retrained


def _cget(key: str) -> Optional[Any]:
    if key in _CACHE and time.monotonic() - _CTIMES.get(key, 0) < _TTL:
        return _CACHE[key]
    return None


def _cset(key: str, value: Any) -> None:
    _CACHE[key] = value
    _CTIMES[key] = time.monotonic()


# ══════════════════════════════════════════════════════════════════════════════
# IMPORTANCE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _rank_importances(imp_dict: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Sort {feature: importance} into a ranked list with metadata.
    Each entry: {feature, importance, rank, pct_of_total}.
    """
    total = sum(imp_dict.values()) or 1.0
    ranked = sorted(imp_dict.items(), key=lambda kv: -kv[1])
    return [
        {
            "feature":      col,
            "importance":   round(float(val), 6),
            "rank":         i + 1,
            "pct_of_total": round(float(val) / total * 100, 2),
        }
        for i, (col, val) in enumerate(ranked)
    ]


def _native_importances_from_clf(clf: Any, feature_columns: List[str]) -> Dict[str, Any]:
    """
    Extract native feature importances from the live model object.
    Falls back gracefully when the model is unavailable or doesn't
    support native importances (e.g. HistGradientBoostingClassifier).

    This is the only part of the diagnostics that requires the model
    to be loaded into memory — all other metrics come from meta.json.
    """
    if clf is None:
        return {
            "method":  "unavailable",
            "backend": "unknown",
            "ranked":  [],
            "by_type": {},
            "raw":     {},
            "notes":   "Model not loaded — native importances unavailable.",
        }

    try:
        from app.models.ml_predictor import get_native_feature_importances
        return get_native_feature_importances(clf)
    except Exception as exc:
        logger.debug("Native importance extraction failed: %s", exc)
        return {
            "method":  "error",
            "backend": "unknown",
            "ranked":  [],
            "by_type": {},
            "raw":     {},
            "notes":   f"Native importance extraction failed: {exc}",
        }


# ══════════════════════════════════════════════════════════════════════════════
# META LOADER
# ══════════════════════════════════════════════════════════════════════════════

def _load_meta(model_dir: pathlib.Path) -> Dict[str, Any]:
    """
    Load meta.json from disk.  Raises FileNotFoundError when the model
    has not been trained yet so the endpoint can return a clear message.
    """
    meta_path = model_dir / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError(
            f"Model metadata not found at {meta_path}. "
            "Train a model first with app.models.ml_predictor.train_model()."
        )
    return json.loads(meta_path.read_text(encoding="utf-8"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFUSION MATRIX BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_confusion_matrix_section(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build the confusion_matrix response section from stored metrics.

    meta.json stores the full 3×3 matrix (added to _compute_metrics in
    ml_predictor.py).  For models trained before that change, we
    synthesise a diagonal approximation from per_class accuracy so the
    endpoint always returns a valid structure.
    """
    stored_cm = metrics.get("confusion_matrix")
    if stored_cm and stored_cm.get("matrix"):
        # Return exactly what was computed at training time
        return stored_cm

    # ── Fallback: synthesise diagonal from per_class accuracy ─────────
    # This is an approximation — off-diagonal values are not available
    # without the raw validation predictions.
    per_class = metrics.get("per_class", {})
    labels    = ["away_win", "draw", "home_win"]
    n_val     = metrics.get("n_val", 0)

    # Rough class-count estimate (assume balanced validation set)
    n_per_class = max(n_val // 3, 1)

    matrix = []
    for actual_label in labels:
        acc    = per_class.get(actual_label, 0.0)
        n_act  = n_per_class
        n_corr = round(acc * n_act)
        n_wrong = n_act - n_corr
        row = [0, 0, 0]
        ai  = labels.index(actual_label)
        row[ai] = n_corr
        # Distribute errors across other classes roughly
        other_indices = [i for i in range(3) if i != ai]
        if n_wrong > 0 and other_indices:
            row[other_indices[0]] = n_wrong // 2
            row[other_indices[1]] = n_wrong - n_wrong // 2
        matrix.append(row)

    # Normalised (diagonal = per_class accuracy)
    matrix_norm = []
    for row in matrix:
        total = sum(row) or 1
        matrix_norm.append([round(v / total, 4) for v in row])

    return {
        "labels":            labels,
        "matrix":            matrix,
        "matrix_normalised": matrix_norm,
        "description": (
            "Rows = actual outcome, columns = predicted outcome. "
            "Normalised matrix shows recall per class. "
            "(Note: matrix is approximated from per-class accuracy — "
            "retrain the model to store the exact confusion matrix.)"
        ),
        "is_approximated": True,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/api/model-diagnostics")
async def model_diagnostics(
    model_dir: str = Query(
        default="",
        description=(
            "Path to the model directory containing model.joblib + meta.json. "
            "Defaults to the value of the MODEL_DIR environment variable, "
            "or the standard saved_models path relative to this file."
        ),
    ),
    include_native: bool = Query(
        default=True,
        description=(
            "Whether to load the model into memory to extract native "
            "XGBoost feature importances. Set to false to return only "
            "the cached permutation importances from meta.json (faster)."
        ),
    ),
):
    """
    Model diagnostics — feature importance, accuracy, log-loss, confusion matrix.

    All metrics are sourced from meta.json written at train_model() time,
    so this endpoint adds negligible latency.  Native XGBoost importances
    (weight / gain / cover) require loading the model file and are fetched
    only when include_native=true (the default).

    Returns 503 with a descriptive message when no trained model exists.
    """
    resolved_dir = pathlib.Path(model_dir) if model_dir else _DEFAULT_MODEL_DIR
    cache_key    = f"diagnostics:{resolved_dir}:{include_native}"

    hit = _cget(cache_key)
    if hit is not None:
        return hit

    # ── Load metadata ─────────────────────────────────────────────────
    try:
        meta = _load_meta(resolved_dir)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "error":   "model_not_trained",
                "message": str(exc),
                "hint": (
                    "Train a model first:\n"
                    "  from app.models.ml_predictor import train_model\n"
                    "  train_model('path/to/historical_matches.csv')"
                ),
            },
        )

    metrics          = meta.get("metrics", {})
    feature_columns  = meta.get("features", [])

    # ── Permutation importances (always available from meta) ──────────
    perm_raw  = meta.get("feature_importances", {})
    perm_ranked = _rank_importances(perm_raw)

    # ── Native importances (optional — requires model load) ───────────
    native: Dict[str, Any] = {}
    if include_native:
        clf = None
        try:
            from app.models.ml_predictor import load_model
            clf, _ = load_model(resolved_dir)
        except Exception as exc:
            logger.debug("Could not load model for native importances: %s", exc)

        native = _native_importances_from_clf(clf, feature_columns)
    else:
        native = {
            "method":  "skipped",
            "backend": meta.get("backend", "unknown"),
            "ranked":  [],
            "by_type": {},
            "raw":     {},
            "notes":   "include_native=false — use permutation_importances instead.",
        }

    # ── Confusion matrix ──────────────────────────────────────────────
    confusion = _build_confusion_matrix_section(metrics)

    # ── Feature descriptions (human-readable context per feature) ────
    FEATURE_DESCRIPTIONS: Dict[str, str] = {
        "elo_diff": (
            "Signed Elo rating difference (home − away, including home advantage offset). "
            "Positive = home team is stronger."
        ),
        "attack_home": (
            "Home team attack strength = home goals scored per game ÷ league average. "
            ">1.0 means above-average attack at home."
        ),
        "attack_away": (
            "Away team attack strength = away goals scored per game ÷ league average. "
            ">1.0 means above-average attack on the road."
        ),
        "defense_home": (
            "Home team defence strength = home goals conceded per game ÷ league average. "
            "<1.0 means below-average (stronger) defence at home."
        ),
        "defense_away": (
            "Away team defence strength = away goals conceded per game ÷ league average. "
            "<1.0 means below-average (stronger) defence on the road."
        ),
        "form_home": (
            "Home team recent form: raw points from last 5 matches (W=3, D=1, L=0). "
            "Range 0–15; higher = better form."
        ),
        "form_away": (
            "Away team recent form: raw points from last 5 matches. Range 0–15."
        ),
        "league_position_difference": (
            "Away team league rank − home team league rank. "
            "Positive = home team is higher in the table."
        ),
        "home_advantage": (
            "League-level home advantage ratio = avg home goals ÷ avg away goals. "
            "Typically 1.20–1.35 in top-5 leagues."
        ),
    }

    # ── Interpretation thresholds ─────────────────────────────────────
    accuracy    = metrics.get("accuracy")
    log_loss_v  = metrics.get("log_loss")

    accuracy_interpretation = None
    if accuracy is not None:
        if accuracy >= 0.60:
            accuracy_interpretation = "Strong — well above the naive baseline (~0.47 for top-5 leagues)"
        elif accuracy >= 0.52:
            accuracy_interpretation = "Solid — above naive baseline"
        elif accuracy >= 0.47:
            accuracy_interpretation = "Near baseline — model is not adding much signal"
        else:
            accuracy_interpretation = "Below baseline — investigate data quality or overfitting"

    log_loss_interpretation = None
    if log_loss_v is not None:
        if log_loss_v <= 0.95:
            log_loss_interpretation = "Excellent — well-calibrated probabilities"
        elif log_loss_v <= 1.00:
            log_loss_interpretation = "Good"
        elif log_loss_v <= 1.05:
            log_loss_interpretation = "Acceptable"
        elif log_loss_v <= 1.10:
            log_loss_interpretation = "Marginal — near uniform-distribution baseline (ln 3 ≈ 1.099)"
        else:
            log_loss_interpretation = "Poor — probabilities are worse than uniform"

    # ── Assemble response ─────────────────────────────────────────────
    response: Dict[str, Any] = {

        # ── Feature importance ────────────────────────────────────────
        "feature_importance": {
            "permutation_importances": {
                "ranked":      perm_ranked,
                "raw":         perm_raw,
                "method":      "permutation",
                "description": (
                    "Model-agnostic permutation importance computed on the held-out "
                    "validation set at training time. "
                    "Value = mean accuracy drop when this feature is randomly shuffled. "
                    "Works for both XGBoost and sklearn backends."
                ),
            },
            "native_importances": native,
            "feature_descriptions": {
                col: {
                    "description":    FEATURE_DESCRIPTIONS.get(col, ""),
                    "permutation_importance": perm_raw.get(col),
                    "permutation_rank": next(
                        (e["rank"] for e in perm_ranked if e["feature"] == col), None
                    ),
                }
                for col in feature_columns
            },
        },

        # ── Accuracy ──────────────────────────────────────────────────
        "model_accuracy": {
            "overall":          accuracy,
            "overall_pct":      round(accuracy * 100, 2) if accuracy is not None else None,
            "per_class":        metrics.get("per_class", {}),
            "n_val":            metrics.get("n_val"),
            "n_train":          meta.get("n_train"),
            "interpretation":   accuracy_interpretation,
            "naive_baseline":   0.47,
            "naive_baseline_note": (
                "A coin-flip model that always predicts the modal outcome "
                "(home win, ~47 % base rate in top-5 leagues) sets the floor."
            ),
        },

        # ── Log-loss ──────────────────────────────────────────────────
        "model_log_loss": {
            "value":          log_loss_v,
            "interpretation": log_loss_interpretation,
            "reference": {
                "perfect":      0.0,
                "excellent":    0.95,
                "uniform_dist": round(1.0986, 4),   # −ln(1/3)
                "note": (
                    "Multi-class cross-entropy (base-e). "
                    "Lower is better. "
                    "A uniform distribution (1/3 each class) scores ln(3) ≈ 1.099."
                ),
            },
        },

        # ── Confusion matrix ──────────────────────────────────────────
        "confusion_matrix": confusion,

        # ── Model info ────────────────────────────────────────────────
        "model_info": {
            "backend":          meta.get("backend"),
            "trained_at":       meta.get("trained_at"),
            "n_train":          meta.get("n_train"),
            "n_val":            meta.get("n_val"),
            "feature_count":    len(feature_columns),
            "features":         feature_columns,
            "class_labels":     meta.get("class_labels"),
            "class_encoding":   meta.get("class_encoding"),
            "hyperparameters":  meta.get("hyperparameters"),
            "model_path":       meta.get("model_path"),
            "meta_path":        str(resolved_dir / "meta.json"),
        },

        # ── Meta ──────────────────────────────────────────────────────
        "_meta": {
            "model_dir":      str(resolved_dir),
            "cache_ttl_s":    _TTL,
            "generated_at":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    }

    _cset(cache_key, response)
    return response