"""
Analytics Service
==================
Provides backend data for the Interactive Analytics Dashboard.
Computes model performance metrics, load distributions, feature importance,
anomaly statistics, and historical trends — all from the trained models
and synthetic data (no database required).
"""

import numpy as np
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Generates analytics data for dashboard visualization."""

    async def get_accuracy_metrics(self, region: str) -> Dict[str, Any]:
        """
        Returns model performance metrics (MAE, RMSE, MAPE) for the region.
        Sources from the training config stored in features.json.
        """
        try:
            from app.ml.model_loader import model_loader
            metrics = model_loader.get_metrics()
            config = model_loader.get_config()

            return {
                "region": region,
                "model_version": config.get("version", "unknown"),
                "trained_at": config.get("trained_at", "unknown"),
                "short_term": metrics.get("short_term", {}),
                "long_term": metrics.get("long_term", {}),
                "interpretation": self._interpret_metrics(metrics),
            }
        except Exception as e:
            logger.error(f"Failed to get accuracy metrics: {e}")
            return {
                "region": region,
                "model_version": "unknown",
                "short_term": {"mae": 0, "rmse": 0, "mape": 0},
                "long_term": {"mae": 0, "rmse": 0, "mape": 0},
                "interpretation": "Metrics unavailable — model not yet trained.",
            }

    async def get_load_distribution(self, region: str) -> Dict[str, Any]:
        """
        Returns load distribution patterns by hour, day, and season.
        Uses the model to generate a typical week profile.
        """
        from app.services.prediction_service import prediction_service

        # Generate a 168h (1 week) forecast to analyze patterns
        forecast = await prediction_service.predict_horizon(region, "168h")
        points = forecast["points"]
        loads = [p["load_mw"] for p in points]

        # Hourly distribution (average by hour of day)
        hourly = {}
        for p in points:
            try:
                hour = int(p["ts"][11:13])
            except Exception:
                continue
            if hour not in hourly:
                hourly[hour] = []
            hourly[hour].append(p["load_mw"])

        hourly_avg = [
            {"hour": h, "avg_load_mw": round(np.mean(vals)), "min_mw": round(min(vals)), "max_mw": round(max(vals))}
            for h, vals in sorted(hourly.items())
        ]

        # Daily distribution
        daily = {}
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for i, p in enumerate(points):
            day_idx = (i // 24) % 7
            if day_idx not in daily:
                daily[day_idx] = []
            daily[day_idx].append(p["load_mw"])

        daily_avg = [
            {"day": day_names[d], "avg_load_mw": round(np.mean(vals))}
            for d, vals in sorted(daily.items())
        ]

        return {
            "region": region,
            "period": "1 week forecast",
            "statistics": {
                "mean_mw": round(np.mean(loads)),
                "median_mw": round(np.median(loads)),
                "std_mw": round(np.std(loads)),
                "min_mw": round(min(loads)),
                "max_mw": round(max(loads)),
                "range_mw": round(max(loads) - min(loads)),
            },
            "hourly_profile": hourly_avg,
            "daily_profile": daily_avg,
            "peak_hours": sorted(
                hourly_avg, key=lambda x: x["avg_load_mw"], reverse=True
            )[:5],
            "off_peak_hours": sorted(
                hourly_avg, key=lambda x: x["avg_load_mw"]
            )[:5],
        }

    async def get_feature_importance(self, region: str) -> Dict[str, Any]:
        """
        Returns feature importance rankings from the trained XGBoost model.
        Uses the built-in feature_importances_ attribute.
        """
        try:
            from app.ml.model_loader import model_loader
            config = model_loader.get_config()

            model = model_loader.get_short_term_model()
            feature_names = config.get("short_term_features", [])
            importances = model.feature_importances_

            # Pair and sort
            pairs = list(zip(feature_names, importances))
            pairs.sort(key=lambda x: x[1], reverse=True)

            ranked = [
                {
                    "rank": i + 1,
                    "feature": name,
                    "importance": round(float(imp), 4),
                    "importance_pct": round(float(imp) * 100, 2),
                    "category": self._categorize_feature(name),
                }
                for i, (name, imp) in enumerate(pairs)
            ]

            return {
                "region": region,
                "model": "short_term (XGBoost)",
                "total_features": len(ranked),
                "features": ranked,
                "top_5": ranked[:5],
                "category_summary": self._summarize_by_category(ranked),
            }
        except Exception as e:
            logger.error(f"Failed to get feature importance: {e}")
            return {
                "region": region,
                "model": "unknown",
                "features": [],
                "error": str(e),
            }

    async def get_trends(self, region: str) -> Dict[str, Any]:
        """
        Returns trend analysis comparing different forecast horizons
        and seasonal patterns.
        """
        from app.services.prediction_service import prediction_service

        # Run forecasts at multiple horizons
        horizons = ["6h", "24h", "48h", "168h"]
        trend_data = {}

        for h in horizons:
            forecast = await prediction_service.predict_horizon(region, h)
            loads = [p["load_mw"] for p in forecast["points"]]
            trend_data[h] = {
                "avg_mw": round(np.mean(loads)),
                "peak_mw": round(max(loads)),
                "trough_mw": round(min(loads)),
                "volatility": round(np.std(loads) / np.mean(loads) * 100, 2) if np.mean(loads) > 0 else 0,
            }

        # Trend direction
        short_avg = trend_data["6h"]["avg_mw"]
        long_avg = trend_data["168h"]["avg_mw"]
        if long_avg > short_avg * 1.05:
            trend_direction = "increasing"
        elif long_avg < short_avg * 0.95:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"

        return {
            "region": region,
            "trend_direction": trend_direction,
            "horizon_comparison": trend_data,
            "insight": self._generate_trend_insight(trend_data, trend_direction, region),
        }

    # --- Helper Methods ---

    def _interpret_metrics(self, metrics: Dict) -> str:
        """Generates human-readable interpretation of model metrics."""
        parts = []
        for model_type, m in metrics.items():
            mape = m.get("mape", 0)
            if mape < 3:
                quality = "excellent"
            elif mape < 5:
                quality = "good"
            elif mape < 10:
                quality = "acceptable"
            else:
                quality = "needs improvement"
            parts.append(
                f"{model_type.replace('_', ' ').title()} model: {quality} accuracy "
                f"(MAPE: {mape}%, MAE: {m.get('mae', 0)} MW)"
            )
        return ". ".join(parts) + "." if parts else "No metrics available."

    def _categorize_feature(self, name: str) -> str:
        """Categorizes a feature name into a broader category."""
        if name in ("temperature", "humidity", "wind_speed", "rainfall", "solar_radiation", "heat_index", "cdd", "temp_humidity_interaction"):
            return "weather"
        elif name in ("hour", "day_of_week", "month", "day_of_year", "is_weekend", "is_peak_hour"):
            return "temporal"
        elif name.startswith("is_"):
            return "events"
        elif name.startswith("load_lag") or name.startswith("rolling"):
            return "historical_load"
        return "other"

    def _summarize_by_category(self, ranked: List[Dict]) -> Dict[str, float]:
        """Summarizes importance by feature category."""
        category_totals = {}
        for r in ranked:
            cat = r["category"]
            category_totals[cat] = category_totals.get(cat, 0) + r["importance"]

        total = sum(category_totals.values())
        return {
            cat: round(val / total * 100, 1) if total > 0 else 0
            for cat, val in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        }

    def _generate_trend_insight(
        self, data: Dict, direction: str, region: str
    ) -> str:
        """Generates a narrative insight about load trends."""
        short = data["6h"]
        long = data["168h"]

        insight = f"The {region} region shows a {direction} demand trend. "
        insight += (
            f"Short-term (6h) average: {short['avg_mw']:,} MW with "
            f"peak at {short['peak_mw']:,} MW. "
        )
        insight += (
            f"Extended (7-day) outlook: {long['avg_mw']:,} MW average "
            f"with {long['volatility']}% volatility. "
        )

        if direction == "increasing":
            insight += "Consider proactive capacity planning and reserve preparation."
        elif direction == "decreasing":
            insight += "Opportunity to schedule maintenance on non-critical units."
        else:
            insight += "Normal operations can continue with standard reserve levels."

        return insight


analytics_service = AnalyticsService()
