"""
backend/app/routes/home_accountability.py
═════════════════════════════════════════
Truthful performance and accountability summaries for the homepage.
No hardcoded fallbacks — if data is unavailable, returns null/empty.

Import and call these from home.py's dashboard() gather.

Usage in home.py:
    from app.routes.home_accountability import performance_summary, accountability_summary

    # Inside dashboard() gather:
    results = await asyncio.gather(
        ...existing calls...,
        performance_summary(),
        accountability_summary(),
        return_exceptions=True,
    )
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


async def performance_summary() -> dict:
    """
    Computed model performance metrics using only verified predictions.
    No hardcoded values. Returns nulls when data is insufficient.

    Response shape:
    {
      "verified_count": 128,
      "pending_count": 14,
      "overall_accuracy": 67.2,
      "last_30_accuracy": 70.0,
      "average_confidence": 63,
      "brier_score": 0.612,
      "log_loss": 1.021,
      "rolling_accuracy": [
        {"window": "Last 10", "accuracy": 70, "count": 10},
        {"window": "Last 25", "accuracy": 68, "count": 25},
        {"window": "Last 50", "accuracy": 66, "count": 50}
      ],
      "confidence_bands": [
        {"bracket": "High (≥70)", "count": 42, "correct": 31, "accuracy": 73.8},
        {"bracket": "Medium (50-69)", "count": 51, "correct": 33, "accuracy": 64.7},
        {"bracket": "Low (<50)", "count": 35, "correct": 19, "accuracy": 54.3}
      ],
      "trend": [{"end_index": 20, "accuracy": 65.0}, ...],
      "outcome_accuracy": {"home": 72.1, "draw": 41.2, "away": 63.5}
    }
    """
    try:
        from app.routes.predictions import (
            model_performance,
            predictions_health,
            _verify_recent_results,
        )

        # Trigger verification of recent results
        try:
            await asyncio.wait_for(_verify_recent_results(), timeout=6.0)
        except asyncio.TimeoutError:
            pass

        # Get health stats for counts
        health = predictions_health()
        logged = health.get("logged", 0)
        verified_total = health.get("verified", 0)
        pending = health.get("pending", 0)

        if verified_total == 0:
            return {
                "verified_count": 0,
                "pending_count": pending,
                "overall_accuracy": None,
                "last_30_accuracy": None,
                "average_confidence": None,
                "brier_score": None,
                "log_loss": None,
                "rolling_accuracy": [],
                "confidence_bands": [],
                "trend": [],
                "outcome_accuracy": None,
                "insufficient": True,
                "message": "No verified predictions yet. Results are checked after matches finish.",
            }

        # Get full model performance data
        perf = await model_performance(league=None, window=500)

        overall_acc = perf.get("overall_accuracy")
        last_30_acc = perf.get("last_30_accuracy")
        brier = perf.get("brier_score")
        log_loss_v = perf.get("log_loss")
        assessed = perf.get("assessed", 0)
        correct = perf.get("correct", 0)
        trend = perf.get("trend", [])
        outcome_accuracy = perf.get("outcome_accuracy")
        conf_breakdown = perf.get("confidence_breakdown", [])

        # Compute average confidence from recent predictions
        recent = perf.get("recent_predictions", [])
        confs = [p.get("confidence", 0) for p in recent if p.get("confidence")]
        avg_conf = round(sum(confs) / len(confs)) if confs else None

        # Build rolling accuracy windows
        rolling_accuracy = []
        if assessed >= 10:
            # Compute from the verified predictions directly
            from app.routes.predictions import _fetch_all
            verified_pool = _fetch_all(limit=500, verified_only=True)

            for window_size, label in [(10, "Last 10"), (25, "Last 25"), (50, "Last 50")]:
                window_data = verified_pool[:window_size]
                if len(window_data) >= window_size:
                    w_correct = sum(1 for p in window_data if p.get("correct"))
                    rolling_accuracy.append({
                        "window": label,
                        "accuracy": round(w_correct / len(window_data) * 100, 1),
                        "count": len(window_data),
                    })

        return {
            "verified_count": verified_total,
            "pending_count": pending,
            "overall_accuracy": overall_acc,
            "last_30_accuracy": last_30_acc,
            "average_confidence": avg_conf,
            "brier_score": brier,
            "log_loss": log_loss_v,
            "rolling_accuracy": rolling_accuracy,
            "confidence_bands": conf_breakdown,  # [{bracket, count, correct, accuracy}]
            "trend": trend,  # [{end_index, accuracy}]
            "outcome_accuracy": outcome_accuracy,  # {home, draw, away}
            "assessed": assessed,   # top-level alias — matches accountability_summary shape
            "correct": correct,     # top-level alias
            "insufficient": assessed < 10,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.warning("performance_summary failed: %s", exc)
        return {
            "verified_count": 0,
            "pending_count": 0,
            "overall_accuracy": None,
            "rolling_accuracy": [],
            "confidence_bands": [],
            "trend": [],
            "insufficient": True,
            "error": str(exc),
        }


async def accountability_summary() -> dict:
    """
    Accountability summary using only verified prediction records.
    Hit rate is computed from verified results only — pending do not count.

    Response shape:
    {
      "verified_count": 48,
      "pending_count": 9,
      "hit_rate": 69,
      "high_confidence_hit_rate": 78,
      "recent_verified": [
        {
          "fixture_id": 123, "home": "Arsenal", "away": "Man City",
          "predicted_outcome": "home", "actual_outcome": "home",
          "score": "2-1", "confidence": 74, "confidence_label": "High",
          "correct": true, "league": "Premier League"
        }
      ]
    }
    """
    try:
        from app.routes.predictions import _fetch_all, predictions_health

        health = predictions_health()
        verified_total = health.get("verified", 0)
        pending_total = health.get("pending", 0)

        if verified_total == 0:
            return {
                "verified_count": 0,
                "pending_count": pending_total,
                "hit_rate": None,
                "high_confidence_hit_rate": None,
                "recent_verified": [],
                "insufficient": True,
            }

        # Fetch verified predictions (newest first)
        verified = _fetch_all(limit=200, verified_only=True)

        correct_count = sum(1 for p in verified if p.get("correct"))
        hit_rate = round(correct_count / len(verified) * 100, 1) if verified else None

        # High confidence hit rate
        high_conf = [p for p in verified if (p.get("confidence") or 0) >= 70]
        high_correct = sum(1 for p in high_conf if p.get("correct"))
        high_conf_hit = round(high_correct / len(high_conf) * 100, 1) if high_conf else None

        # Recent verified results (last 15)
        recent_verified = []
        for p in verified[:15]:
            conf_val = p.get("confidence") or 0
            conf_label = "High" if conf_val >= 70 else "Medium" if conf_val >= 55 else "Low"
            recent_verified.append({
                "fixture_id": p.get("fixture_id"),
                "home": p.get("home_team", ""),
                "away": p.get("away_team", ""),
                "predicted_outcome": (p.get("predicted_outcome") or "").capitalize(),
                "actual_outcome": (p.get("actual_outcome") or "").capitalize(),
                "score": (
                    f"{p['home_goals']}-{p['away_goals']}"
                    if p.get("home_goals") is not None else "—"
                ),
                "confidence": conf_val,
                "confidence_label": conf_label,
                "correct": p.get("correct"),
                "league": p.get("league", ""),
                "verified_at": p.get("verified_at", ""),
            })

        return {
            "verified_count": verified_total,
            "pending_count": pending_total,
            "hit_rate": hit_rate,
            "assessed": len(verified),
            "correct": correct_count,
            "high_confidence_hit_rate": high_conf_hit,
            "high_confidence_count": len(high_conf),
            "recent_verified": recent_verified,
            "insufficient": len(verified) < 5,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.warning("accountability_summary failed: %s", exc)
        return {
            "verified_count": 0,
            "pending_count": 0,
            "hit_rate": None,
            "recent_verified": [],
            "insufficient": True,
            "error": str(exc),
        }