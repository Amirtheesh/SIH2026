"""
Peak Risk Alert Service
========================
Proactive alerting system that monitors predicted peak demand against
regional grid capacity thresholds.

Risk Levels:
  GREEN  — < 70% utilization (normal operations)
  YELLOW — 70-85% (elevated, prepare reserves)
  ORANGE — 85-95% (critical, activate demand response)
  RED    — > 95% (emergency, load shedding may be required)
"""

import math
from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Regional grid capacities (MW)
GRID_CAPACITY = {
    "northern": 65000,
    "southern": 55000,
    "western": 60000,
    "eastern": 30000,
    "national": 200000,
}


class PeakRiskService:
    """Evaluates peak risk across forecast horizons and generates alerts."""

    @staticmethod
    async def assess_risk(region: str, horizon_hours: int = 48) -> Dict[str, Any]:
        """
        Assesses peak risk for the next N hours by running the forecast
        and comparing each hour against capacity thresholds.

        Returns:
            Dict with risk timeline, peak risk details, and recommendations.
        """
        from app.services.prediction_service import prediction_service

        capacity = GRID_CAPACITY.get(region.lower(), 200000)
        forecast = await prediction_service.predict_horizon(region, f"{horizon_hours}h")

        risk_timeline = []
        peak_risk = {"level": "GREEN", "utilization": 0, "hour": None}
        time_to_critical = None

        for point in forecast["points"]:
            load = point["load_mw"]
            high = point["high"]  # Use upper confidence bound for risk
            utilization = high / capacity

            # Determine risk level
            if utilization >= 0.95:
                level = "RED"
            elif utilization >= 0.85:
                level = "ORANGE"
            elif utilization >= 0.70:
                level = "YELLOW"
            else:
                level = "GREEN"

            risk_entry = {
                "ts": point["ts"],
                "load_mw": load,
                "high_estimate_mw": high,
                "capacity_mw": capacity,
                "utilization_pct": round(utilization * 100, 1),
                "risk_level": level,
                "reserve_margin_mw": round(capacity - high),
            }
            risk_timeline.append(risk_entry)

            # Track highest risk
            risk_order = {"GREEN": 0, "YELLOW": 1, "ORANGE": 2, "RED": 3}
            if risk_order.get(level, 0) > risk_order.get(peak_risk["level"], 0):
                peak_risk = {
                    "level": level,
                    "utilization": round(utilization * 100, 1),
                    "hour": point["ts"],
                    "load_mw": high,
                }

            # Calculate time to critical (first ORANGE or RED)
            if time_to_critical is None and level in ("ORANGE", "RED"):
                try:
                    risk_time = datetime.fromisoformat(point["ts"].replace("Z", ""))
                    now = datetime.utcnow()
                    hours_until = (risk_time - now).total_seconds() / 3600
                    time_to_critical = round(max(0, hours_until), 1)
                except Exception:
                    pass

        # Count risk hours by level
        risk_counts = {}
        for r in risk_timeline:
            lvl = r["risk_level"]
            risk_counts[lvl] = risk_counts.get(lvl, 0) + 1

        # Generate recommendations based on peak risk
        recommendations = PeakRiskService._generate_recommendations(
            peak_risk["level"], time_to_critical, region
        )

        return {
            "region": region,
            "horizon_hours": horizon_hours,
            "grid_capacity_mw": capacity,
            "current_risk_level": risk_timeline[0]["risk_level"] if risk_timeline else "GREEN",
            "peak_risk": peak_risk,
            "time_to_critical_hours": time_to_critical,
            "risk_distribution": risk_counts,
            "recommendations": recommendations,
            "timeline": risk_timeline,
        }

    @staticmethod
    def _generate_recommendations(
        risk_level: str, time_to_critical: float | None, region: str
    ) -> List[Dict[str, Any]]:
        """Generates actionable recommendations based on risk assessment."""
        recs = []

        if risk_level == "GREEN":
            recs.append({
                "priority": "low",
                "action": "Continue normal operations",
                "detail": f"Grid utilization in {region} region is within safe limits. "
                          "No immediate action required.",
                "confidence": 0.95,
            })
        elif risk_level == "YELLOW":
            recs.append({
                "priority": "medium",
                "action": "Prepare spinning reserves",
                "detail": f"Elevated demand expected in {region} region. "
                          "Ensure spinning reserves are at 110% minimum capacity. "
                          "Alert backup generation units.",
                "confidence": 0.85,
            })
            recs.append({
                "priority": "medium",
                "action": "Monitor weather forecast",
                "detail": "Temperature-driven demand may increase. "
                          "Cross-reference with latest weather data for updated estimates.",
                "confidence": 0.80,
            })
        elif risk_level == "ORANGE":
            time_str = f"within {time_to_critical:.0f} hours" if time_to_critical else "soon"
            recs.append({
                "priority": "high",
                "action": "Activate peaking power units",
                "detail": f"Critical demand levels expected {time_str} in {region} region. "
                          "Activate gas turbine peaking units and consider importing power "
                          "from neighboring regions.",
                "confidence": 0.80,
            })
            recs.append({
                "priority": "high",
                "action": "Issue demand response signals",
                "detail": "Notify large industrial consumers to reduce discretionary load. "
                          "Activate automated demand response for enrolled facilities.",
                "confidence": 0.78,
            })
            recs.append({
                "priority": "medium",
                "action": "Pre-position maintenance crews",
                "detail": "High grid stress may cause equipment issues. "
                          "Ensure maintenance crews are on standby for rapid response.",
                "confidence": 0.75,
            })
        elif risk_level == "RED":
            recs.append({
                "priority": "critical",
                "action": "EMERGENCY: Prepare load shedding schedule",
                "detail": f"Grid capacity in {region} may be exceeded. "
                          "Activate emergency protocols. Prepare rotating load shedding "
                          "schedules for non-essential areas. Coordinate with SLDC/RLDC.",
                "confidence": 0.90,
            })
            recs.append({
                "priority": "critical",
                "action": "Maximize all generation sources",
                "detail": "Bring all available generation online including standby units. "
                          "Request emergency power from neighboring grids via inter-regional links.",
                "confidence": 0.88,
            })
            recs.append({
                "priority": "high",
                "action": "Issue public conservation appeal",
                "detail": "Request public cooperation in reducing electricity usage. "
                          "Coordinate with media for conservation messaging.",
                "confidence": 0.85,
            })

        return recs


peak_risk_service = PeakRiskService()
