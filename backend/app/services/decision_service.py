"""
Decision Support Service
=========================
Translates AI model outputs (forecast, peak risk, anomalies, weather) into
actionable recommendations for grid operators and decision makers.

Combines signals from:
  - Forecast Service (load predictions)
  - Peak Risk Service (capacity risk)
  - Anomaly Detector (unusual patterns)
  - Weather (environmental context)

Generates:
  - Prioritized action items
  - Executive summary
  - Confidence-weighted recommendations
  - Resource allocation suggestions
"""

import math
from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class DecisionService:
    """Generates operator-ready decision support from multiple AI signals."""

    async def get_decisions(self, region: str) -> Dict[str, Any]:
        """
        Compiles all available AI signals and generates a comprehensive
        decision support package.
        """
        from app.services.prediction_service import prediction_service
        from app.services.peak_risk_service import peak_risk_service
        from app.ml.anomaly_detector import anomaly_detector

        now = datetime.utcnow()

        # Gather signals
        forecast = await prediction_service.predict_horizon(region, "24h")
        peak_info = await prediction_service.get_peak(region)
        risk_assessment = await peak_risk_service.assess_risk(region, 48)

        # Run anomaly detection on forecast
        forecast_loads = [p["load_mw"] for p in forecast["points"]]
        forecast_times = [p["ts"] for p in forecast["points"]]
        anomaly_result = anomaly_detector.detect_anomalies(
            predictions=forecast_loads,
            timestamps=forecast_times,
            region=region,
        )

        # Build recommendations
        recommendations = self._compile_recommendations(
            forecast, peak_info, risk_assessment, anomaly_result, region
        )

        # Build executive summary
        summary = self._build_executive_summary(
            forecast, peak_info, risk_assessment, anomaly_result, region
        )

        # Resource allocation suggestions
        resources = self._suggest_resources(
            peak_info, risk_assessment, region
        )

        return {
            "region": region,
            "generated_at": now.isoformat() + "Z",
            "executive_summary": summary,
            "risk_level": risk_assessment["current_risk_level"],
            "peak_forecast": {
                "peak_load_mw": peak_info["peak_load_mw"],
                "peak_time": peak_info["peak_time"],
                "severity": peak_info["severity"],
                "utilization_pct": peak_info["utilization_pct"],
            },
            "anomaly_status": anomaly_result["status"],
            "anomaly_count": anomaly_result["anomalies_detected"],
            "recommendations": recommendations,
            "resource_allocation": resources,
            "model_confidence": {
                "forecast_model": forecast.get("model_version", "unknown"),
                "confidence_band": forecast.get("confidence_band", "unknown"),
            },
        }

    async def get_summary(self, region: str) -> Dict[str, Any]:
        """Returns a concise executive summary for dashboard display."""
        decisions = await self.get_decisions(region)
        return {
            "region": region,
            "executive_summary": decisions["executive_summary"],
            "risk_level": decisions["risk_level"],
            "top_recommendations": decisions["recommendations"][:3],
            "peak_forecast": decisions["peak_forecast"],
        }

    def _compile_recommendations(
        self,
        forecast: Dict,
        peak_info: Dict,
        risk: Dict,
        anomalies: Dict,
        region: str,
    ) -> List[Dict[str, Any]]:
        """Compiles and prioritizes recommendations from all signals."""
        recs = []

        # From peak risk service
        for r in risk.get("recommendations", []):
            recs.append(r)

        # From anomaly detection
        if anomalies["status"] == "alert":
            spike_count = sum(
                1 for a in anomalies["anomalies"] if a["anomaly_type"] == "spike"
            )
            if spike_count > 0:
                recs.append({
                    "priority": "high",
                    "action": "Investigate demand spikes",
                    "detail": f"{spike_count} demand spike(s) detected in the forecast. "
                              "Verify if these are driven by known events (festivals, "
                              "heatwave) or may indicate data quality issues.",
                    "confidence": 0.75,
                    "source": "anomaly_detector",
                })

            drop_count = sum(
                1 for a in anomalies["anomalies"] if a["anomaly_type"] == "drop"
            )
            if drop_count > 0:
                recs.append({
                    "priority": "medium",
                    "action": "Prepare for demand drops",
                    "detail": f"{drop_count} demand drop(s) predicted. "
                              "Consider reducing generation to avoid over-supply. "
                              "Coordinate with renewable generators for curtailment.",
                    "confidence": 0.72,
                    "source": "anomaly_detector",
                })

        # Weather-based recommendations
        avg_load = sum(p["load_mw"] for p in forecast["points"]) / len(forecast["points"])
        peak_load = peak_info["peak_load_mw"]
        ramp_rate = (peak_load - avg_load) / avg_load * 100 if avg_load > 0 else 0

        if ramp_rate > 25:
            recs.append({
                "priority": "medium",
                "action": "Prepare for steep demand ramp",
                "detail": f"Forecast shows a {ramp_rate:.0f}% ramp from average to peak. "
                          "Ensure fast-start generation units are ready for rapid dispatch. "
                          "Consider pre-loading thermal units for faster response.",
                "confidence": 0.80,
                "source": "forecast_analysis",
            })

        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recs.sort(key=lambda r: priority_order.get(r.get("priority", "low"), 4))

        return recs

    def _build_executive_summary(
        self,
        forecast: Dict,
        peak_info: Dict,
        risk: Dict,
        anomalies: Dict,
        region: str,
    ) -> str:
        """Builds a concise executive summary for quick operator briefing."""
        severity = peak_info["severity"]
        peak_load = peak_info["peak_load_mw"]
        peak_time = peak_info.get("peak_time", "unknown")
        risk_level = risk["current_risk_level"]
        anomaly_count = anomalies["anomalies_detected"]

        # Extract hour from peak_time
        try:
            peak_hour = peak_time[11:16]  # HH:MM
        except Exception:
            peak_hour = "unknown"

        summary_parts = [
            f"**{region.upper()} Region — Grid Status: {risk_level}**\n",
            f"Predicted peak demand: {peak_load:,} MW at {peak_hour} UTC "
            f"(Severity: {severity}, Utilization: {peak_info['utilization_pct']}%).",
        ]

        if risk["time_to_critical_hours"] is not None:
            summary_parts.append(
                f"⚠️ Time to critical capacity: {risk['time_to_critical_hours']:.0f} hours."
            )

        if anomaly_count > 0:
            summary_parts.append(
                f"🔍 {anomaly_count} anomaly(s) detected in the 24h forecast — {anomalies['summary']}"
            )
        else:
            summary_parts.append(
                "✅ No anomalies detected in the forecast period."
            )

        avg_load = sum(p["load_mw"] for p in forecast["points"]) / len(forecast["points"])
        summary_parts.append(
            f"\nAverage forecasted load: {avg_load:,.0f} MW over the next "
            f"{forecast.get('horizon', '24h')}."
        )

        return "\n".join(summary_parts)

    def _suggest_resources(
        self,
        peak_info: Dict,
        risk: Dict,
        region: str,
    ) -> Dict[str, Any]:
        """Suggests resource allocation based on risk level."""
        risk_level = risk["current_risk_level"]
        capacity = risk["grid_capacity_mw"]
        peak = peak_info["peak_load_mw"]

        if risk_level == "GREEN":
            return {
                "spinning_reserve_mw": round(capacity * 0.05),
                "standby_units": 0,
                "demand_response_needed": False,
                "inter_regional_import_mw": 0,
                "staffing_level": "normal",
            }
        elif risk_level == "YELLOW":
            return {
                "spinning_reserve_mw": round(capacity * 0.10),
                "standby_units": 2,
                "demand_response_needed": False,
                "inter_regional_import_mw": 0,
                "staffing_level": "elevated",
            }
        elif risk_level == "ORANGE":
            shortfall = max(0, peak - capacity * 0.90)
            return {
                "spinning_reserve_mw": round(capacity * 0.15),
                "standby_units": 4,
                "demand_response_needed": True,
                "demand_response_target_mw": round(shortfall * 0.5),
                "inter_regional_import_mw": round(shortfall * 0.3),
                "staffing_level": "full",
            }
        else:  # RED
            shortfall = max(0, peak - capacity * 0.95)
            return {
                "spinning_reserve_mw": round(capacity * 0.20),
                "standby_units": 6,
                "demand_response_needed": True,
                "demand_response_target_mw": round(shortfall * 0.4),
                "inter_regional_import_mw": round(shortfall * 0.3),
                "load_shedding_mw": round(shortfall * 0.3),
                "staffing_level": "emergency",
            }


decision_service = DecisionService()
