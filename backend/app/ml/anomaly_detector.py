"""
Anomaly Detector
=================
AI-based anomaly detection for electricity demand using:
  - Isolation Forest (trained on historical residuals)
  - Z-score based real-time detection
  - Classification into anomaly types: spike, drop, gradual_drift, oscillation

Works standalone without database — uses the trained Isolation Forest model
and statistical thresholds.
"""

import numpy as np
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """Detects anomalies in electricity demand predictions and actuals."""

    # Z-score thresholds for anomaly classification
    SPIKE_THRESHOLD = 2.5      # > 2.5σ above mean
    DROP_THRESHOLD = -2.5      # > 2.5σ below mean
    DRIFT_THRESHOLD = 1.5      # Sustained deviation
    OSCILLATION_THRESHOLD = 3  # Rapid swings in short window

    def detect_anomalies(
        self,
        predictions: List[float],
        actuals: Optional[List[float]] = None,
        timestamps: Optional[List[str]] = None,
        region: str = "national",
    ) -> Dict[str, Any]:
        """
        Runs anomaly detection on a series of predictions (and optionally actuals).

        If actuals are provided, detects anomalies in the residuals (actual - predicted).
        If only predictions are provided, detects anomalies in the prediction pattern itself.

        Returns:
            Dict with overall anomaly score, detected anomalies list, and summary.
        """
        try:
            from app.ml.model_loader import model_loader

            iso_model = model_loader.get_anomaly_model()
            values = np.array(actuals if actuals else predictions)
            preds = np.array(predictions)

            if actuals:
                residuals = values - preds
            else:
                # Use predictions directly — detect unusual patterns
                residuals = preds - np.mean(preds)

            anomalies = []
            anomaly_scores = []

            mean_val = np.mean(values)
            std_val = np.std(values) if np.std(values) > 0 else 1.0

            for i, val in enumerate(values):
                z_score = (val - mean_val) / std_val
                residual = float(residuals[i])

                # Classify anomaly type
                anomaly_type = None
                severity = "normal"
                score = 0.0

                if z_score > self.SPIKE_THRESHOLD:
                    anomaly_type = "spike"
                    score = min(1.0, (z_score - self.SPIKE_THRESHOLD) / 3.0 + 0.5)
                    severity = "high" if z_score > 3.5 else "medium"
                elif z_score < self.DROP_THRESHOLD:
                    anomaly_type = "drop"
                    score = min(1.0, (abs(z_score) - abs(self.DROP_THRESHOLD)) / 3.0 + 0.5)
                    severity = "high" if z_score < -3.5 else "medium"

                # Check for oscillation (rapid changes in short window)
                if i >= 2:
                    recent = values[max(0, i - 4) : i + 1]
                    if len(recent) >= 3:
                        diffs = np.diff(recent)
                        sign_changes = np.sum(np.diff(np.sign(diffs)) != 0)
                        if sign_changes >= self.OSCILLATION_THRESHOLD:
                            anomaly_type = "oscillation"
                            score = max(score, 0.6)
                            severity = "medium"

                # Check for gradual drift (sustained deviation)
                if i >= 24:
                    recent_mean = np.mean(values[i - 24 : i + 1])
                    drift_z = abs(recent_mean - mean_val) / std_val
                    if drift_z > self.DRIFT_THRESHOLD and anomaly_type is None:
                        anomaly_type = "gradual_drift"
                        score = min(1.0, (drift_z - self.DRIFT_THRESHOLD) / 2.0 + 0.3)
                        severity = "low"

                # Isolation Forest score (if model available)
                if iso_model is not None and anomaly_type is not None:
                    try:
                        iso_features = np.array([[
                            residual,
                            float(val),  # Use value as proxy for temperature context
                            i % 24,      # Hour-like index
                            0,           # is_weekend placeholder
                            std_val,     # rolling_std proxy
                        ]])
                        iso_score = -iso_model.score_samples(iso_features)[0]
                        # Isolation Forest scores > 0.5 indicate anomaly
                        score = max(score, min(1.0, iso_score))
                    except Exception:
                        pass  # Isolation forest feature mismatch, use Z-score only

                anomaly_scores.append(score)

                if anomaly_type is not None:
                    anomaly_entry = {
                        "index": i,
                        "value_mw": round(float(val)),
                        "anomaly_type": anomaly_type,
                        "severity": severity,
                        "anomaly_score": round(score, 3),
                        "z_score": round(z_score, 2),
                        "explanation": self._explain_anomaly(
                            anomaly_type, float(val), mean_val, z_score
                        ),
                    }
                    if timestamps and i < len(timestamps):
                        anomaly_entry["timestamp"] = timestamps[i]
                    anomalies.append(anomaly_entry)

            # Overall summary
            overall_score = float(np.mean(anomaly_scores)) if anomaly_scores else 0.0
            n_anomalies = len(anomalies)

            return {
                "region": region,
                "total_points": len(values),
                "anomalies_detected": n_anomalies,
                "anomaly_rate": round(n_anomalies / len(values) * 100, 1) if len(values) > 0 else 0,
                "overall_anomaly_score": round(overall_score, 3),
                "status": (
                    "clean" if n_anomalies == 0
                    else "warning" if n_anomalies <= 3
                    else "alert"
                ),
                "anomalies": anomalies,
                "summary": self._build_summary(anomalies, len(values)),
            }

        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return {
                "region": region,
                "total_points": 0,
                "anomalies_detected": 0,
                "anomaly_rate": 0,
                "overall_anomaly_score": 0,
                "status": "error",
                "anomalies": [],
                "summary": f"Anomaly detection unavailable: {str(e)}",
            }

    def _explain_anomaly(
        self, anomaly_type: str, value: float, mean: float, z_score: float
    ) -> str:
        """Generates a human-readable explanation for an anomaly."""
        delta_pct = round(((value - mean) / mean) * 100, 1) if mean > 0 else 0

        explanations = {
            "spike": (
                f"Demand spike detected at {round(value)} MW, "
                f"which is {abs(delta_pct)}% above the average ({round(mean)} MW). "
                f"Z-score: {z_score:.1f}. Possible causes: sudden temperature rise, "
                f"industrial surge, or grid event."
            ),
            "drop": (
                f"Demand drop detected at {round(value)} MW, "
                f"which is {abs(delta_pct)}% below the average ({round(mean)} MW). "
                f"Z-score: {z_score:.1f}. Possible causes: load shedding, "
                f"industrial shutdown, or transmission issue."
            ),
            "gradual_drift": (
                f"Sustained demand drift detected. Current: {round(value)} MW vs "
                f"expected average {round(mean)} MW ({delta_pct}% deviation). "
                f"This may indicate a gradual change in consumption patterns."
            ),
            "oscillation": (
                f"Rapid demand oscillation detected around {round(value)} MW. "
                f"Frequent load swings may indicate grid instability or "
                f"intermittent renewable generation issues."
            ),
        }
        return explanations.get(anomaly_type, f"Anomaly detected at {round(value)} MW")

    def _build_summary(self, anomalies: List[Dict], total: int) -> str:
        """Builds an executive summary of detected anomalies."""
        if not anomalies:
            return "No anomalies detected in the forecast period. System operating normally."

        type_counts = {}
        for a in anomalies:
            t = a["anomaly_type"]
            type_counts[t] = type_counts.get(t, 0) + 1

        parts = [f"{count} {atype}(s)" for atype, count in type_counts.items()]
        high_severity = sum(1 for a in anomalies if a["severity"] == "high")

        summary = f"Detected {len(anomalies)} anomalies in {total} data points: {', '.join(parts)}."
        if high_severity > 0:
            summary += f" {high_severity} HIGH severity anomalies require immediate attention."

        return summary


anomaly_detector = AnomalyDetector()
