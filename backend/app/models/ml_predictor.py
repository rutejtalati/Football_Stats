"""
backend/app/models/ml_predictor.py
════════════════════════════════════════════════════════════════════════
Machine-learning prediction layer for StatinSite.

Overview
────────
This module trains, serialises, and serves an XGBoost multi-class
classifier that predicts match outcomes (home win / draw / away win)
from the structured features produced by feature_engineering.py.

It is designed as an *additional signal* that sits alongside the
existing Poisson/Elo/Monte-Carlo ensemble — it does NOT replace it.
The output probability triple can be plugged straight into
football_engine.ensemble_predict() as a new layer whenever you choose
to activate it.

Class encoding (matches target column in training CSV)
  0 = away win
  1 = draw
  2 = home win

Feature vector (FEATURE_COLUMNS, order is fixed and must not change
once a model file has been saved)
  elo_diff                   — signed Elo gap including home advantage
  attack_home                — home attack strength vs league average
  attack_away                — away attack strength vs league average
  defense_home               — home defence strength (lower = stronger)
  defense_away               — away defence strength (lower = stronger)
  form_home                  — raw points from last 5 (0–15)
  form_away                  — raw points from last 5 (0–15)
  league_position_difference — away_rank − home_rank (None → 0 fallback)
  home_advantage             — league home/away goals ratio

XGBoost dependency
──────────────────
The module imports xgboost at call time, not at module load, so the
server starts cleanly even when xgboost is not installed. A
HistGradientBoostingClassifier (sklearn) fallback is used automatically
when XGBoost is unavailable. The API — train_model(), load_model(),
predict_probabilities() — is identical for both backends.

Isotonic calibration is applied on a held-out 20 % split so that
predicted probabilities are well-calibrated (Brier-score minimised),
not just discriminative. This is important because these probabilities
are later blended into the ensemble.

File layout produced by train_model()
  <model_dir>/
      model.joblib       — serialised fitted pipeline
      meta.json          — training metadata (features, n_samples, metrics,
                           backend, timestamp, class encoding)
"""

from __future__ import annotations

import csv
import json
import logging
import math
import pathlib
import time
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# ── Fixed feature order ─────────────────────────────────────────────────────
# This list is the contract between feature_engineering.py and this module.
# It must never be reordered once a model file exists on disk, because the
# column positions are baked into the serialised tree structure.
FEATURE_COLUMNS: List[str] = [
    "elo_diff",
    "attack_home",
    "attack_away",
    "defense_home",
    "defense_away",
    "form_home",
    "form_away",
    "league_position_difference",
    "home_advantage",
]

# Class labels in XGBoost/sklearn order (index = encoded integer)
CLASS_LABELS: List[str] = ["away_win", "draw", "home_win"]  # 0, 1, 2

# Output key names (matching the spec)
RESULT_KEYS: List[str] = [
    "away_win_probability",   # class 0
    "draw_probability",       # class 1
    "home_win_probability",   # class 2
]

# Default feature fallback when a value is None (same neutral values as
# feature_engineering.py uses — 1.0 for strength ratios, 0 elsewhere)
_FEATURE_FALLBACKS: Dict[str, float] = {
    "elo_diff":                   0.0,
    "attack_home":                1.0,
    "attack_away":                1.0,
    "defense_home":               1.0,
    "defense_away":               1.0,
    "form_home":                  7.5,   # mid-range (15/2)
    "form_away":                  7.5,
    "league_position_difference": 0.0,
    "home_advantage":             1.25,  # typical top-5 league ratio
}

# Default model directory — caller can override via MODEL_DIR parameter
_DEFAULT_MODEL_DIR = pathlib.Path(__file__).parent / "saved_models"

# Minimum training samples required before we trust the model at all
_MIN_TRAIN_SAMPLES = 100


# ══════════════════════════════════════════════════════════════════════════════
# BACKEND DETECTION
# ══════════════════════════════════════════════════════════════════════════════

def _get_classifier(
    n_estimators: int    = 400,
    max_depth:    int    = 4,
    learning_rate: float = 0.05,
    subsample:    float  = 0.8,
    colsample:    float  = 0.8,
    random_state: int    = 42,
    early_stopping_rounds: int = 30,
):
    """
    Return an XGBClassifier if xgboost is installed, otherwise a
    HistGradientBoostingClassifier with equivalent hyperparameters.
    Both expose the same .fit() / .predict_proba() interface.
    """
    try:
        from xgboost import XGBClassifier
        clf = XGBClassifier(
            n_estimators       = n_estimators,
            max_depth          = max_depth,
            learning_rate      = learning_rate,
            subsample          = subsample,
            colsample_bytree   = colsample,
            objective          = "multi:softprob",
            num_class          = 3,
            eval_metric        = "mlogloss",
            use_label_encoder  = False,
            early_stopping_rounds = early_stopping_rounds,
            random_state       = random_state,
            n_jobs             = -1,
            verbosity          = 0,
        )
        backend = "xgboost"
    except ImportError:
        from sklearn.ensemble import HistGradientBoostingClassifier
        # HistGBT supports native NaN handling and early stopping natively.
        # subsample has no direct equivalent; max_features approximates
        # colsample_bytree (column sub-sampling per split).
        clf = HistGradientBoostingClassifier(
            max_iter            = n_estimators,
            max_depth           = max_depth,
            learning_rate       = learning_rate,
            max_features        = subsample,   # closest HGB equivalent
            random_state        = random_state,
            early_stopping      = True,
            validation_fraction = 0.15,
            n_iter_no_change    = early_stopping_rounds,
            scoring             = "loss",
        )
        backend = "sklearn_histgbt"
    return clf, backend


# ══════════════════════════════════════════════════════════════════════════════
# DATA HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _load_csv(dataset_path: str | pathlib.Path) -> Tuple[np.ndarray, np.ndarray]:
    """
    Load a training CSV and return (X, y).

    Expected CSV format:
      header row with column names (in any order)
      one row per completed match
      numeric values; None / empty string treated as missing

    Required columns: all FEATURE_COLUMNS + "match_result"
    Optional extra columns are silently ignored.

    match_result encoding: 0 = away win, 1 = draw, 2 = home win
    Also accepts string values "away", "draw", "home" (case-insensitive).
    """
    path = pathlib.Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(f"Training dataset not found: {path}")

    _str_to_int = {"away": 0, "draw": 1, "home": 2,
                   "away_win": 0, "home_win": 2}

    rows_X: List[List[float]] = []
    rows_y: List[int] = []
    skipped = 0

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None:
            raise ValueError("CSV has no header row")

        missing_cols = [c for c in FEATURE_COLUMNS if c not in reader.fieldnames]
        if missing_cols:
            raise ValueError(
                f"CSV is missing required columns: {missing_cols}\n"
                f"Found columns: {list(reader.fieldnames)}"
            )
        if "match_result" not in reader.fieldnames:
            raise ValueError("CSV is missing required column: match_result")

        for lineno, row in enumerate(reader, start=2):
            # Parse target
            raw_y = (row.get("match_result") or "").strip().lower()
            if raw_y in _str_to_int:
                y_val = _str_to_int[raw_y]
            else:
                try:
                    y_val = int(float(raw_y))
                except (ValueError, TypeError):
                    skipped += 1
                    continue
            if y_val not in (0, 1, 2):
                skipped += 1
                continue

            # Parse features — replace empty/None with column fallback
            feat_row: List[float] = []
            bad = False
            for col in FEATURE_COLUMNS:
                raw_v = (row.get(col) or "").strip()
                if raw_v in ("", "None", "null", "NaN", "nan"):
                    feat_row.append(_FEATURE_FALLBACKS[col])
                else:
                    try:
                        feat_row.append(float(raw_v))
                    except ValueError:
                        feat_row.append(_FEATURE_FALLBACKS[col])
            if bad:
                skipped += 1
                continue

            rows_X.append(feat_row)
            rows_y.append(y_val)

    if skipped:
        logger.warning("Skipped %d malformed rows during CSV load", skipped)

    if len(rows_X) < _MIN_TRAIN_SAMPLES:
        raise ValueError(
            f"Dataset has only {len(rows_X)} usable rows "
            f"(minimum required: {_MIN_TRAIN_SAMPLES}). "
            "Collect more historical match data before training."
        )

    return np.array(rows_X, dtype=np.float32), np.array(rows_y, dtype=np.int32)


def _features_to_vector(features: Dict[str, Any]) -> np.ndarray:
    """
    Convert a raw feature dict (as returned by feature_engineering
    extract_match_features()["raw"]) to a 1×9 numpy array in the
    canonical FEATURE_COLUMNS order.

    Accepts both the flat raw dict and the nested {"raw": {...}} shape.
    None values are replaced with the column's documented fallback.
    """
    # Support both the flat dict and the nested shape from extract_match_features
    if "raw" in features and isinstance(features["raw"], dict):
        src = features["raw"]
    else:
        src = features

    row: List[float] = []
    for col in FEATURE_COLUMNS:
        val = src.get(col)
        if val is None:
            row.append(_FEATURE_FALLBACKS[col])
        else:
            try:
                row.append(float(val))
            except (TypeError, ValueError):
                row.append(_FEATURE_FALLBACKS[col])
    return np.array([row], dtype=np.float32)


def _compute_metrics(
    clf_calibrated: Any,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Dict[str, float]:
    """
    Compute log-loss, accuracy, per-class accuracy, and confusion matrix
    on a held-out validation split.

    The confusion matrix is stored in meta.json at training time so the
    diagnostics endpoint can retrieve it without reloading the dataset.
    Rows = actual outcome, columns = predicted outcome.
    Labels: 0 = away_win, 1 = draw, 2 = home_win.
    """
    from sklearn.metrics import log_loss, accuracy_score, confusion_matrix

    proba = clf_calibrated.predict_proba(X_val)
    preds = np.argmax(proba, axis=1)
    ll    = log_loss(y_val, proba)
    acc   = accuracy_score(y_val, preds)

    per_class: Dict[str, float] = {}
    for i, label in enumerate(CLASS_LABELS):
        mask = y_val == i
        if mask.sum() > 0:
            per_class[label] = round(float(accuracy_score(y_val[mask], preds[mask])), 4)

    # ── Confusion matrix ──────────────────────────────────────────────
    # Raw counts and row-normalised version (recall per class on the diagonal)
    cm_raw = confusion_matrix(y_val, preds, labels=[0, 1, 2])

    row_sums = cm_raw.sum(axis=1, keepdims=True).astype(float)
    row_sums[row_sums == 0] = 1.0           # avoid div-by-zero for unseen classes
    cm_norm  = np.round(cm_raw.astype(float) / row_sums, 4)

    confusion = {
        "labels":              CLASS_LABELS,   # ["away_win", "draw", "home_win"]
        "matrix":              cm_raw.tolist(),
        "matrix_normalised":   cm_norm.tolist(),
        "description":         (
            "Rows = actual outcome, columns = predicted outcome. "
            "Normalised matrix shows recall per class (row sums to 1)."
        ),
    }

    return {
        "log_loss":       round(float(ll),  4),
        "accuracy":       round(float(acc), 4),
        "per_class":      per_class,
        "n_val":          int(len(y_val)),
        "confusion_matrix": confusion,
    }


def _compute_feature_importances(
    clf_calibrated: Any,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Dict[str, float]:
    """
    Compute permutation importances on the validation set.
    Works with any fitted estimator — XGBClassifier, HistGBT, or a
    CalibratedClassifierCV wrapping either.
    """
    from sklearn.inspection import permutation_importance

    r = permutation_importance(
        clf_calibrated, X_val, y_val,
        n_repeats    = 10,
        random_state = 42,
        scoring      = "accuracy",
        n_jobs       = -1,
    )
    return {
        col: round(float(imp), 5)
        for col, imp in zip(FEATURE_COLUMNS, r.importances_mean)
    }


def _unwrap_base_estimator(clf_outer: Any) -> Any:
    """
    Navigate the CalibratedClassifierCV → _CalibratedClassifier →
    FrozenEstimator wrapper chain to reach the actual fitted estimator
    (XGBClassifier or HistGradientBoostingClassifier).
    """
    inner = clf_outer
    # CalibratedClassifierCV.calibrated_classifiers_[0]
    if hasattr(inner, "calibrated_classifiers_") and inner.calibrated_classifiers_:
        inner = inner.calibrated_classifiers_[0]
    # _CalibratedClassifier.estimator
    if hasattr(inner, "estimator"):
        inner = inner.estimator
    # FrozenEstimator.estimator  (sklearn >= 1.2)
    if hasattr(inner, "estimator") and type(inner).__name__ == "FrozenEstimator":
        inner = inner.estimator
    return inner


def get_native_feature_importances(clf: Any) -> Dict[str, Any]:
    """
    Extract native feature importances directly from the fitted estimator.

    Returns a dict with:
      "method"       — how the importances were obtained
      "ranked"       — features sorted by importance descending, each with
                       {"feature", "importance", "rank", "pct_of_total"}
      "by_type"      — for XGBoost: {"weight", "gain", "cover", "total_gain"}
                       each normalised to sum=1 across features
      "raw"          — un-normalised values keyed by feature name
      "backend"      — "xgboost" | "sklearn_histgbt" | "unknown"
      "notes"        — human-readable explanation of the importance type

    For XGBoost the primary ranking uses *gain* (average information gain
    per split), which is the most discriminative metric for tree ensembles.
    Weight (split frequency) and cover (average sample coverage) are also
    returned for completeness.

    For HistGradientBoostingClassifier, sklearn does not expose a native
    feature_importances_ attribute, so this function returns an empty dict
    for by_type and directs the caller to use permutation importances
    (stored in meta.json) instead.
    """
    base = _unwrap_base_estimator(clf)
    backend = type(base).__name__

    # ── XGBoost path ─────────────────────────────────────────────────
    if hasattr(base, "get_booster"):
        booster    = base.get_booster()
        # XGBoost names features f0..fN when trained on a numpy array
        feat_map   = {f"f{i}": col for i, col in enumerate(FEATURE_COLUMNS)}

        by_type: Dict[str, Dict[str, float]] = {}
        raw_gain: Dict[str, float]           = {}

        for imp_type in ("weight", "gain", "cover", "total_gain"):
            try:
                raw = booster.get_score(importance_type=imp_type)
            except Exception:
                raw = {}
            # Remap f0..fN → column names; fill 0.0 for features never split on
            mapped: Dict[str, float] = {}
            for col in FEATURE_COLUMNS:
                fi  = f"f{FEATURE_COLUMNS.index(col)}"
                mapped[col] = float(raw.get(fi, 0.0))

            # Normalise so values sum to 1 (makes cross-type comparison valid)
            total = sum(mapped.values()) or 1.0
            by_type[imp_type] = {
                col: round(v / total, 6) for col, v in mapped.items()
            }

            if imp_type == "gain":
                raw_gain = {col: round(v, 4) for col, v in mapped.items()}

        # Primary ranking by gain (normalised)
        primary = by_type.get("gain", {})
        ranked  = _rank_importances(primary)

        return {
            "method":  "xgboost_native_gain",
            "backend": "xgboost",
            "ranked":  ranked,
            "by_type": by_type,
            "raw":     raw_gain,
            "notes": (
                "XGBoost native importances. "
                "'gain' = average information gain per split (primary ranking). "
                "'weight' = number of times a feature is used to split. "
                "'cover' = average number of samples affected per split. "
                "All values normalised to sum=1 within each type."
            ),
        }

    # ── sklearn feature_importances_ path (e.g. RandomForest, GBT) ──
    if hasattr(base, "feature_importances_") and base.feature_importances_ is not None:
        raw = {
            col: round(float(v), 6)
            for col, v in zip(FEATURE_COLUMNS, base.feature_importances_)
        }
        ranked = _rank_importances(raw)
        return {
            "method":  "sklearn_native_impurity",
            "backend": backend,
            "ranked":  ranked,
            "by_type": {"impurity_decrease": raw},
            "raw":     raw,
            "notes": (
                "sklearn native mean decrease in impurity. "
                "Values are already normalised to sum=1."
            ),
        }

    # ── Fallback: no native importances available ─────────────────────
    return {
        "method":  "none",
        "backend": backend,
        "ranked":  [],
        "by_type": {},
        "raw":     {},
        "notes": (
            f"{backend} does not expose native feature importances. "
            "Use the permutation_importances field (from training metadata) instead."
        ),
    }


def _rank_importances(imp_dict: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Sort a {feature: importance} dict into a ranked list with metadata.
    Each entry: {feature, importance, rank, pct_of_total}.
    """
    total = sum(imp_dict.values()) or 1.0
    ranked = sorted(imp_dict.items(), key=lambda kv: -kv[1])
    return [
        {
            "feature":     col,
            "importance":  round(val, 6),
            "rank":        i + 1,
            "pct_of_total": round(val / total * 100, 2),
        }
        for i, (col, val) in enumerate(ranked)
    ]


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

def train_model(
    dataset_path:  str | pathlib.Path,
    model_dir:     str | pathlib.Path = _DEFAULT_MODEL_DIR,
    # Hyperparameters — overridable without touching the file
    n_estimators:  int   = 400,
    max_depth:     int   = 4,
    learning_rate: float = 0.05,
    subsample:     float = 0.80,
    colsample:     float = 0.80,
    val_fraction:  float = 0.20,
    random_state:  int   = 42,
    early_stopping_rounds: int = 30,
) -> Dict[str, Any]:
    """
    Train and save the ML model from a CSV dataset.

    Parameters
    ──────────
    dataset_path : path to CSV file with historical match data
    model_dir    : directory where model.joblib and meta.json are written
    n_estimators : max number of boosting rounds (XGBoost) / iterations (HGB)
    max_depth    : tree depth
    learning_rate: shrinkage
    subsample    : row sampling ratio per tree
    colsample    : column sampling ratio per tree (XGBoost only)
    val_fraction : fraction of data held out for calibration + evaluation
    random_state : reproducibility seed
    early_stopping_rounds: stop if validation loss doesn't improve

    Returns
    ───────
    Training summary dict — same content written to meta.json
    {
      "backend":       "xgboost" | "sklearn_histgbt",
      "n_train":       int,
      "n_val":         int,
      "features":      [...],
      "class_labels":  [...],
      "metrics":       {"log_loss": ..., "accuracy": ..., ...},
      "feature_importances": {...},
      "hyperparameters": {...},
      "trained_at":    ISO timestamp,
      "model_path":    str,
    }
    """
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.model_selection import train_test_split

    model_dir = pathlib.Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    # ── Load data ──────────────────────────────────────────────────────
    logger.info("Loading dataset: %s", dataset_path)
    X, y = _load_csv(dataset_path)
    logger.info("Dataset shape: X=%s  y=%s  class_counts=%s",
                X.shape, y.shape, dict(zip(*np.unique(y, return_counts=True))))

    # ── Train / validation split (stratified to preserve class balance) ─
    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size    = val_fraction,
        stratify     = y,
        random_state = random_state,
    )

    # ── Build and fit base estimator ───────────────────────────────────
    clf_base, backend = _get_classifier(
        n_estimators           = n_estimators,
        max_depth              = max_depth,
        learning_rate          = learning_rate,
        subsample              = subsample,
        colsample              = colsample,
        random_state           = random_state,
        early_stopping_rounds  = early_stopping_rounds,
    )
    logger.info("Training with backend: %s", backend)

    if backend == "xgboost":
        # XGBoost accepts eval_set for early stopping
        clf_base.fit(
            X_train, y_train,
            eval_set              = [(X_val, y_val)],
            verbose               = False,
        )
    else:
        # HistGBT uses internal early stopping configured at init time
        clf_base.fit(X_train, y_train)

    # ── Isotonic calibration on held-out validation split ─────────────
    # sklearn >= 1.2 uses FrozenEstimator to signal a pre-fitted estimator.
    # Older versions used the (now-removed) cv='prefit' string.
    # Both ensure calibration is fitted on X_val only — never leaks into
    # tree training.
    try:
        from sklearn.calibration import FrozenEstimator
        clf_calibrated = CalibratedClassifierCV(
            FrozenEstimator(clf_base), method="isotonic", cv=3,
        )
    except ImportError:
        # sklearn < 1.2 fallback
        clf_calibrated = CalibratedClassifierCV(clf_base, method="isotonic", cv="prefit")
    clf_calibrated.fit(X_val, y_val)

    # ── Evaluate ───────────────────────────────────────────────────────
    metrics     = _compute_metrics(clf_calibrated, X_val, y_val)
    importances = _compute_feature_importances(clf_calibrated, X_val, y_val)

    logger.info(
        "Validation metrics — log_loss=%.4f  accuracy=%.4f",
        metrics["log_loss"], metrics["accuracy"],
    )

    # ── Serialize ─────────────────────────────────────────────────────
    model_path = model_dir / "model.joblib"
    joblib.dump(clf_calibrated, model_path, compress=3)

    hparams = {
        "n_estimators": n_estimators,
        "max_depth":    max_depth,
        "learning_rate": learning_rate,
        "subsample":    subsample,
        "colsample":    colsample,
        "val_fraction": val_fraction,
        "random_state": random_state,
        "early_stopping_rounds": early_stopping_rounds,
    }

    meta = {
        "backend":             backend,
        "n_train":             int(len(y_train)),
        "n_val":               int(len(y_val)),
        "features":            FEATURE_COLUMNS,
        "class_labels":        CLASS_LABELS,
        "class_encoding":      {label: i for i, label in enumerate(CLASS_LABELS)},
        "metrics":             metrics,
        "feature_importances": importances,
        "hyperparameters":     hparams,
        "trained_at":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_path":          str(model_path),
    }

    meta_path = model_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2))

    logger.info("Model saved → %s", model_path)
    return meta


def load_model(
    model_dir: str | pathlib.Path = _DEFAULT_MODEL_DIR,
) -> Tuple[Any, Dict[str, Any]]:
    """
    Load a previously trained model from disk.

    Returns
    ───────
    (fitted_pipeline, meta_dict)

    The fitted_pipeline exposes .predict_proba(X) → shape (n, 3).
    meta_dict is the content of meta.json written by train_model().

    Raises
    ──────
    FileNotFoundError if model.joblib or meta.json do not exist.
    ValueError if the saved feature list does not match FEATURE_COLUMNS
    (prevents silently using a model trained on a different feature set).
    """
    model_dir  = pathlib.Path(model_dir)
    model_path = model_dir / "model.joblib"
    meta_path  = model_dir / "meta.json"

    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model found at {model_path}.\n"
            "Run train_model(dataset_path) to create one."
        )
    if not meta_path.exists():
        raise FileNotFoundError(
            f"Model metadata not found at {meta_path}.\n"
            "The model file may be corrupt — retrain with train_model()."
        )

    clf  = joblib.load(model_path)
    meta = json.loads(meta_path.read_text())

    # Guard: feature list must match exactly — wrong order → wrong predictions
    saved_features = meta.get("features", [])
    if saved_features != FEATURE_COLUMNS:
        raise ValueError(
            f"Saved model was trained on features {saved_features}\n"
            f"but this code expects {FEATURE_COLUMNS}.\n"
            "Retrain the model with the current feature set."
        )

    logger.debug(
        "Model loaded: backend=%s  trained=%s  val_accuracy=%.4f",
        meta.get("backend"), meta.get("trained_at"),
        meta.get("metrics", {}).get("accuracy", 0),
    )
    return clf, meta


def predict_probabilities(
    features: Dict[str, Any],
    model_dir: str | pathlib.Path = _DEFAULT_MODEL_DIR,
    clf: Any = None,
) -> Dict[str, float]:
    """
    Predict match outcome probabilities from a feature dict.

    Parameters
    ──────────
    features  : raw feature dict from feature_engineering.extract_match_features()
                Accepts both the nested {"raw": {...}} shape and a flat dict.
    model_dir : directory containing model.joblib + meta.json.
                Ignored if clf is supplied directly.
    clf       : pre-loaded model (from load_model()) — pass this to avoid
                repeated disk reads in a hot prediction path.

    Returns
    ───────
    {
      "home_win_probability": float,   # P(home win)  — class 2
      "draw_probability":     float,   # P(draw)      — class 1
      "away_win_probability": float,   # P(away win)  — class 0
      "predicted_outcome":    str,     # "home" | "draw" | "away"
      "ml_confidence":        float,   # max probability, 0-1
      "model_available":      True,
    }

    On error (model not trained, feature coercion failure):
    {
      "home_win_probability": None,
      "draw_probability":     None,
      "away_win_probability": None,
      "predicted_outcome":    None,
      "ml_confidence":        None,
      "model_available":      False,
      "error":                str,
    }
    """
    # ── Load model if not pre-supplied ───────────────────────────────
    if clf is None:
        try:
            clf, _ = load_model(model_dir)
        except FileNotFoundError as exc:
            return {
                "home_win_probability": None,
                "draw_probability":     None,
                "away_win_probability": None,
                "predicted_outcome":    None,
                "ml_confidence":        None,
                "model_available":      False,
                "error":                str(exc),
            }

    # ── Build feature vector ─────────────────────────────────────────
    try:
        X = _features_to_vector(features)
    except Exception as exc:
        return {
            "home_win_probability": None,
            "draw_probability":     None,
            "away_win_probability": None,
            "predicted_outcome":    None,
            "ml_confidence":        None,
            "model_available":      False,
            "error":                f"Feature coercion failed: {exc}",
        }

    # ── Predict ──────────────────────────────────────────────────────
    try:
        proba = clf.predict_proba(X)[0]   # shape (3,) — [away, draw, home]
    except Exception as exc:
        return {
            "home_win_probability": None,
            "draw_probability":     None,
            "away_win_probability": None,
            "predicted_outcome":    None,
            "ml_confidence":        None,
            "model_available":      False,
            "error":                f"Model inference failed: {exc}",
        }

    # proba[0] = away win (class 0)
    # proba[1] = draw     (class 1)
    # proba[2] = home win (class 2)
    p_away = float(proba[0])
    p_draw = float(proba[1])
    p_home = float(proba[2])

    max_p = max(p_home, p_draw, p_away)
    if max_p == p_home:
        outcome = "home"
    elif max_p == p_draw:
        outcome = "draw"
    else:
        outcome = "away"

    return {
        "home_win_probability": round(p_home, 4),
        "draw_probability":     round(p_draw, 4),
        "away_win_probability": round(p_away, 4),
        "predicted_outcome":    outcome,
        "ml_confidence":        round(max_p, 4),
        "model_available":      True,
    }


def cross_validate(
    dataset_path: str | pathlib.Path,
    n_splits:     int   = 5,
    n_estimators: int   = 400,
    max_depth:    int   = 4,
    learning_rate: float = 0.05,
    random_state: int   = 42,
) -> Dict[str, Any]:
    """
    Run k-fold cross-validation and return aggregate metrics.

    Useful for comparing hyperparameter choices before committing to a
    full train_model() run. Does not save any files.

    Returns
    ───────
    {
      "mean_log_loss":  float,
      "std_log_loss":   float,
      "mean_accuracy":  float,
      "std_accuracy":   float,
      "n_splits":       int,
      "n_samples":      int,
      "backend":        str,
    }
    """
    from sklearn.model_selection import StratifiedKFold, cross_validate as skl_cv

    X, y = _load_csv(dataset_path)
    clf_base, backend = _get_classifier(
        n_estimators  = n_estimators,
        max_depth     = max_depth,
        learning_rate = learning_rate,
        random_state  = random_state,
    )
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
    results = skl_cv(
        clf_base, X, y,
        cv      = cv,
        scoring = ["neg_log_loss", "accuracy"],
        n_jobs  = -1,
    )
    ll_scores  = -results["test_neg_log_loss"]
    acc_scores = results["test_accuracy"]
    return {
        "mean_log_loss":  round(float(ll_scores.mean()),  4),
        "std_log_loss":   round(float(ll_scores.std()),   4),
        "mean_accuracy":  round(float(acc_scores.mean()), 4),
        "std_accuracy":   round(float(acc_scores.std()),  4),
        "n_splits":       n_splits,
        "n_samples":      int(len(y)),
        "backend":        backend,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SYNTHETIC DATASET GENERATOR  (development / CI use only)
# ══════════════════════════════════════════════════════════════════════════════

def generate_synthetic_dataset(
    n_samples:   int  = 1000,
    output_path: str | pathlib.Path = "/tmp/synthetic_matches.csv",
    random_state: int = 42,
) -> pathlib.Path:
    """
    Generate a physically plausible synthetic training dataset.

    This is for local development, CI pipelines, and unit tests when
    real historical data is not yet available. It is NOT a substitute
    for training on real match data — the XGBoost model trained on
    synthetic data should never be deployed.

    The data generating process mirrors the Poisson model used in
    football_engine: Elo difference and attack/defence strengths drive
    expected goals, which are Poisson-sampled, and the scoreline
    determines the match result label.

    All feature distributions are calibrated to realistic top-5-league
    ranges (checked against the _SCALE_RANGES in feature_engineering).
    """
    rng = np.random.default_rng(random_state)
    path = pathlib.Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    rows: List[Dict[str, Any]] = []
    for _ in range(n_samples):
        # ── Sample a realistic fixture ────────────────────────────────
        elo_diff    = float(rng.normal(0, 140))            # signed, centred at 0
        elo_diff    = float(np.clip(elo_diff, -400, 400))

        # Attack/defence strengths around 1.0 with realistic spread
        att_home    = float(np.clip(rng.lognormal(0.0, 0.28), 0.35, 2.40))
        att_away    = float(np.clip(rng.lognormal(0.0, 0.28), 0.35, 2.40))
        def_home    = float(np.clip(rng.lognormal(0.0, 0.28), 0.35, 2.40))
        def_away    = float(np.clip(rng.lognormal(0.0, 0.28), 0.35, 2.40))

        form_home   = float(rng.integers(0, 16))          # 0–15 raw points
        form_away   = float(rng.integers(0, 16))
        pos_diff    = float(rng.integers(-19, 20))        # away_rank − home_rank
        home_adv    = float(np.clip(rng.normal(1.24, 0.06), 1.05, 1.45))

        # ── Simulate expected goals (simplified Dixon-Coles) ──────────
        league_avg_h = 1.54; league_avg_a = 1.24
        xg_home = league_avg_h * att_home * def_away
        xg_away = league_avg_a * att_away * def_home

        # Elo blending (mirrors football_engine.build_xg_from_team_stats)
        elo_adj  = float(np.clip(elo_diff / 1500.0, -0.20, 0.20))
        xg_home *= (1.0 - 0.20 + 0.20 * (1.0 + elo_adj))
        xg_away *= (1.0 - 0.20 + 0.20 * (1.0 - elo_adj))
        xg_home  = float(np.clip(xg_home, 0.25, 3.80))
        xg_away  = float(np.clip(xg_away, 0.15, 3.20))

        # ── Poisson sample goals → determine result ───────────────────
        goals_home = int(rng.poisson(xg_home))
        goals_away = int(rng.poisson(xg_away))

        if goals_home > goals_away:
            result = 2   # home win
        elif goals_home < goals_away:
            result = 0   # away win
        else:
            result = 1   # draw

        rows.append({
            "elo_diff":                   round(elo_diff, 2),
            "attack_home":                round(att_home, 4),
            "attack_away":                round(att_away, 4),
            "defense_home":               round(def_home, 4),
            "defense_away":               round(def_away, 4),
            "form_home":                  form_home,
            "form_away":                  form_away,
            "league_position_difference": pos_diff,
            "home_advantage":             round(home_adv, 4),
            "match_result":               result,
        })

    fieldnames = FEATURE_COLUMNS + ["match_result"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    logger.info("Generated synthetic dataset: %s  (%d rows)", path, n_samples)
    return path


# ══════════════════════════════════════════════════════════════════════════════
# INTEGRATION GUIDE  (non-executing — kept as living documentation)
# ══════════════════════════════════════════════════════════════════════════════
#
# How to add the ML layer to predict_match() in football_engine.py
# ─────────────────────────────────────────────────────────────────
#
#   from app.models.feature_engineering import extract_match_features
#   from app.models.ml_predictor import predict_probabilities, load_model
#
#   # At module level (loaded once, reused per request):
#   _ML_CLF = None
#   def _get_ml_clf():
#       global _ML_CLF
#       if _ML_CLF is None:
#           try:
#               _ML_CLF, _ = load_model()
#           except FileNotFoundError:
#               pass   # model not yet trained — ensemble falls back silently
#       return _ML_CLF
#
#   # Inside predict_match(), after Step 1 (xG) and before Step 8 (ensemble):
#
#   # ── Step N: ML signal ─────────────────────────────────────────────
#   ML_ENSEMBLE_WEIGHT = 0.10   # initial conservative weight
#
#   features = extract_match_features(
#       home_stats=home_stats, away_stats=away_stats,
#       league_avg=league_avg, elo=elo,
#       home_team=home_team, away_team=away_team,
#   )
#   ml_result = predict_probabilities(features, clf=_get_ml_clf())
#
#   if ml_result["model_available"]:
#       ml_p_home = ml_result["home_win_probability"]
#       ml_p_draw = ml_result["draw_probability"]
#       ml_p_away = ml_result["away_win_probability"]
#       # Reduce Poisson weight to make room, then call ensemble_predict()
#       # with the new ml_weight parameter (to be added to ensemble_predict)
#   else:
#       ml_p_home = ml_p_draw = ml_p_away = 1/3  # neutral — no effect
#       ML_ENSEMBLE_WEIGHT = 0.0
#
#   # The return dict gains one new key:
#   return {
#       ...,                     # all existing keys unchanged
#       "ml_prediction": ml_result,   # new — non-breaking addition
#   }
#
# Training workflow
# ─────────────────
#
#   # 1. Build a CSV from completed fixtures in your database:
#   #    Columns: elo_diff, attack_home, attack_away, defense_home,
#   #             defense_away, form_home, form_away,
#   #             league_position_difference, home_advantage, match_result
#
#   # 2. Train:
#   from app.models.ml_predictor import train_model
#   meta = train_model("data/historical_matches.csv")
#   print(meta["metrics"])   # log_loss, accuracy, per-class breakdown
#
#   # 3. Evaluate hyperparameters with cross-validation first:
#   from app.models.ml_predictor import cross_validate
#   cv = cross_validate("data/historical_matches.csv", n_splits=5)
#   print(cv)
#
#   # 4. The model is automatically loaded by predict_probabilities() on
#   #    first call after training.