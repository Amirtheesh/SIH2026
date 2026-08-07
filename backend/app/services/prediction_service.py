"""
Prediction Service
===================
Core business logic for all AI-powered forecasting features:
  1. Multi-horizon demand forecasting (1h to 168h)
  2. Peak demand prediction with severity classification
  3. Weather-aware inference
  4. Event-aware inference
  5. Scenario-based what-if analysis (real model inference)
"""

import math
import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# Regional grid capacity limits (MW) — used for peak risk assessment
GRID_CAPACITY = {
    "northern": 65000,
    "southern": 55000,
    "western": 60000,
    "eastern": 30000,
    "national": 200000,
}

# Regional base load scaling factors (relative to national)
REGION_SCALE = {
    "northern": 0.27,
    "southern": 0.20,
    "western": 0.25,
    "eastern": 0.12,
    "national": 1.00,
}


class PredictionService:
    """
    Unified prediction service that uses trained XGBoost models for inference.
    Falls back to synthetic estimates if models are unavailable.
    """

    # --- 1. MULTI-HORIZON FORECASTING ---

    @staticmethod
    async def predict_horizon(
        region: str,
        horizon: str = "24h",
        weather_override: Optional[Dict[str, float]] = None,
        event_override: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """
        Predicts electricity demand over a given horizon using the trained model.

        Args:
            region: Grid region (northern, southern, western, eastern, national)
            horizon: Forecast horizon string e.g. '1h', '6h', '24h', '48h', '168h'
            weather_override: Optional weather values to inject (for what-if analysis)
            event_override: Optional event flags to inject (for what-if analysis)

        Returns:
            Dict with region, horizon metadata, and hourly forecast points.
        """
        hours = 24
        if horizon.endswith("h"):
            hours = int(horizon[:-1])

        scale = REGION_SCALE.get(region.lower(), 1.0)

        try:
            from app.ml.model_loader import model_loader
            from app.ml.feature_pipeline import create_features, SHORT_TERM_FEATURES, LONG_TERM_FEATURES

            # Select model based on horizon
            model = model_loader.get_model_for_horizon(hours)
            feature_cols = (
                SHORT_TERM_FEATURES if hours <= 6 else LONG_TERM_FEATURES
            )

            now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

            # Build raw input records for each hour in the horizon
            raw_data = []
            for i in range(hours):
                ts = now + timedelta(hours=i)
                record: Dict[str, Any] = {
                    "timestamp": ts.isoformat() + "Z",
                }

                # Inject weather (simulated or override)
                if weather_override:
                    record.update(weather_override)
                else:
                    # Simulate realistic weather based on time
                    day_of_year = ts.timetuple().tm_yday
                    hour = ts.hour
                    seasonal_temp = 25.0 + 12.0 * math.sin(
                        (day_of_year - 100) / 365.0 * 2 * math.pi
                    )
                    daily_temp = 5.0 * math.sin((hour - 14) / 24.0 * 2 * math.pi)
                    record["temperature"] = round(seasonal_temp + daily_temp, 2)
                    record["humidity"] = round(
                        55.0 - 0.5 * (record["temperature"] - 25.0), 2
                    )
                    record["wind_speed"] = 4.0
                    record["rainfall"] = 0.0

                # Inject events (override or defaults)
                if event_override:
                    record.update(event_override)

                raw_data.append(record)

            # Generate simulated historical loads for lag features
            # Use a simple pattern based on current time
            historical_loads = []
            for i in range(168):  # 1 week of history
                past_ts = now - timedelta(hours=(168 - i))
                hour_val = past_ts.hour
                # Approximate load pattern
                base = 150000.0 * scale
                if 0 <= hour_val < 5:
                    factor = 0.72
                elif 5 <= hour_val < 9:
                    factor = 0.85
                elif 9 <= hour_val < 18:
                    factor = 1.03
                elif 18 <= hour_val < 22:
                    factor = 1.15
                else:
                    factor = 0.95
                historical_loads.append(base * factor + np.random.normal(0, 500))

            # Run feature pipeline
            features_df = create_features(raw_data, historical_loads=historical_loads)

            # Select columns and run inference
            inference_df = features_df[feature_cols].copy()
            predictions = model.predict(inference_df)

            # Scale predictions to region
            predictions = predictions * scale

            # Confidence band width depends on horizon
            if hours <= 6:
                band_pct = 0.05
            elif hours <= 24:
                band_pct = 0.08
            elif hours <= 48:
                band_pct = 0.12
            else:
                band_pct = 0.15

            points = []
            for i in range(hours):
                load_mw = float(predictions[i])
                high_mw = load_mw * (1 + band_pct)
                low_mw = load_mw * (1 - band_pct)

                points.append({
                    "ts": raw_data[i]["timestamp"],
                    "load_mw": round(load_mw),
                    "low": round(low_mw),
                    "high": round(high_mw),
                })

            return {
                "region": region,
                "horizon": horizon,
                "model_version": model_loader.get_config().get("version", "v2"),
                "confidence_band": f"±{int(band_pct * 100)}%",
                "points": points,
            }

        except Exception as e:
            logger.error(f"Model inference failed, falling back to synthetic: {e}")
            return PredictionService._fallback_forecast(region, hours)

    # --- 2. PEAK DEMAND PREDICTION ---

    @staticmethod
    async def get_peak(region: str) -> Dict[str, Any]:
        """
        Predicts the daily peak demand, the hour it occurs, and a severity
        classification based on regional grid capacity.
        """
        scale = REGION_SCALE.get(region.lower(), 1.0)
        capacity = GRID_CAPACITY.get(region.lower(), 200000)

        try:
            from app.ml.model_loader import model_loader

            peak_model = model_loader.get_peak_model()
            peak_hour_model = model_loader.get_peak_hour_model()
            peak_features = model_loader.get_peak_features()

            if peak_model is None:
                raise RuntimeError("Peak model not loaded")

            now = datetime.utcnow()
            day_of_year = now.timetuple().tm_yday

            # Build daily aggregate features for peak prediction
            seasonal_temp = 25.0 + 12.0 * math.sin(
                (day_of_year - 100) / 365.0 * 2 * math.pi
            )
            daily_features = {
                "avg_temperature": seasonal_temp,
                "max_temperature": seasonal_temp + 5.0,
                "avg_humidity": 55.0 - 0.5 * (seasonal_temp - 25.0),
                "avg_wind_speed": 4.0,
                "total_rainfall": 0.0,
                "avg_solar": 500.0,
                "day_of_week": now.weekday(),
                "month": now.month,
                "is_weekend": 1 if now.weekday() >= 5 else 0,
                "is_holiday": 0,
                "is_festival": 0,
                "is_sports_event": 0,
                "avg_cdd": max(0, seasonal_temp - 24.0),
                "max_cdd": max(0, seasonal_temp + 5.0 - 24.0),
                "prev_day_avg_load": 150000.0 * scale,
            }

            # Ensure feature order matches training
            feature_df = pd.DataFrame([daily_features])
            # Only use columns that exist in peak_features
            available_cols = [c for c in peak_features if c in feature_df.columns]
            if not available_cols:
                raise RuntimeError("Peak feature columns mismatch")
            feature_df = feature_df[available_cols]

            peak_load = float(peak_model.predict(feature_df)[0]) * scale
            
            if peak_hour_model is not None:
                peak_hour = int(round(float(peak_hour_model.predict(feature_df)[0])))
                peak_hour = max(0, min(23, peak_hour))
            else:
                peak_hour = 20  # Default

            # Severity classification
            utilization = peak_load / capacity
            if utilization < 0.70:
                severity = "NORMAL"
            elif utilization < 0.85:
                severity = "ELEVATED"
            elif utilization < 0.95:
                severity = "CRITICAL"
            else:
                severity = "EMERGENCY"

            reserve_margin = capacity - peak_load

            peak_time = now.replace(hour=peak_hour, minute=0, second=0, microsecond=0)
            if peak_time < now:
                peak_time += timedelta(days=1)

            return {
                "region": region,
                "peak_time": peak_time.isoformat() + "Z",
                "peak_hour": peak_hour,
                "peak_load_mw": round(peak_load),
                "grid_capacity_mw": capacity,
                "utilization_pct": round(utilization * 100, 1),
                "reserve_margin_mw": round(reserve_margin),
                "severity": severity,
            }

        except Exception as e:
            logger.error(f"Peak prediction failed, using fallback: {e}")
            # Fallback
            forecast = await PredictionService.predict_horizon(region, "24h")
            peak_point = max(forecast["points"], key=lambda p: p["load_mw"])
            peak_load = peak_point["load_mw"]
            utilization = peak_load / capacity

            return {
                "region": region,
                "peak_time": peak_point["ts"],
                "peak_hour": int(peak_point["ts"][11:13]),
                "peak_load_mw": peak_load,
                "grid_capacity_mw": capacity,
                "utilization_pct": round(utilization * 100, 1),
                "reserve_margin_mw": round(capacity - peak_load),
                "severity": "NORMAL" if utilization < 0.70 else (
                    "ELEVATED" if utilization < 0.85 else (
                        "CRITICAL" if utilization < 0.95 else "EMERGENCY"
                    )
                ),
            }

    # --- 3. SCENARIO-BASED WHAT-IF ANALYSIS ---

    @staticmethod
    async def simulate_what_if(region: str, params: dict) -> dict:
        """
        Runs actual model inference with user-specified parameter overrides,
        then compares against a baseline forecast.

        Supported params:
            temperature_offset: float (°C delta)
            humidity_offset: float (% delta)
            wind_speed: float (m/s)
            rainfall: float (mm/h)
            is_holiday: bool
            is_festival: bool
            is_sports_event: bool
            scenario_name: str (preset name like 'heatwave', 'cold_wave', etc.)
            duration_hours: int (how far to simulate)
        """
        # Resolve scenario presets
        scenario = params.get("scenario_name", "custom")
        presets = {
            "heatwave": {"temperature_offset": 5.0, "humidity_offset": -10.0},
            "cold_wave": {"temperature_offset": -8.0, "humidity_offset": 10.0},
            "monsoon": {"rainfall": 15.0, "humidity_offset": 25.0, "wind_speed": 12.0},
            "major_holiday": {"is_holiday": True},
            "festival": {"is_holiday": True, "is_festival": True},
            "cricket_final": {"is_sports_event": True},
            "industrial_shutdown": {"is_holiday": True},
        }
        if scenario in presets:
            for k, v in presets[scenario].items():
                params.setdefault(k, v)

        duration = params.get("duration_hours", 24)
        horizon = f"{duration}h"

        # Build weather override
        temp_offset = params.get("temperature_offset", 0.0)
        humidity_offset = params.get("humidity_offset", 0.0)

        weather_override = {}
        if temp_offset != 0 or humidity_offset != 0:
            # We'll compute base weather per-hour in predict_horizon,
            # so we pass offsets via a marker and handle in the loop
            now = datetime.utcnow()
            day_of_year = now.timetuple().tm_yday
            base_temp = 25.0 + 12.0 * math.sin((day_of_year - 100) / 365.0 * 2 * math.pi)
            weather_override["temperature"] = round(base_temp + temp_offset, 2)
            weather_override["humidity"] = round(
                max(10, min(100, 55.0 - 0.5 * (base_temp - 25.0) + humidity_offset)), 2
            )

        if "wind_speed" in params:
            weather_override["wind_speed"] = params["wind_speed"]
        if "rainfall" in params:
            weather_override["rainfall"] = params["rainfall"]

        # Build event override
        event_override = {}
        for key in ["is_holiday", "is_festival", "is_sports_event", "is_political_event"]:
            if key in params:
                event_override[key] = 1 if params[key] else 0

        # Run baseline forecast (no overrides)
        baseline = await PredictionService.predict_horizon(region, horizon)

        # Run scenario forecast (with overrides)
        scenario_result = await PredictionService.predict_horizon(
            region, horizon,
            weather_override=weather_override if weather_override else None,
            event_override=event_override if event_override else None,
        )

        # Compare
        baseline_peak = max(p["load_mw"] for p in baseline["points"])
        scenario_peak = max(p["load_mw"] for p in scenario_result["points"])

        baseline_avg = sum(p["load_mw"] for p in baseline["points"]) / len(baseline["points"])
        scenario_avg = sum(p["load_mw"] for p in scenario_result["points"]) / len(scenario_result["points"])

        delta_peak = scenario_peak - baseline_peak
        delta_avg = scenario_avg - baseline_avg

        # Build hourly comparison
        comparison_points = []
        for b, s in zip(baseline["points"], scenario_result["points"]):
            comparison_points.append({
                "ts": b["ts"],
                "baseline_mw": b["load_mw"],
                "scenario_mw": s["load_mw"],
                "delta_mw": s["load_mw"] - b["load_mw"],
            })

        return {
            "scenario_name": scenario,
            "region": region,
            "duration_hours": duration,
            "original_peak_mw": baseline_peak,
            "new_peak_mw": scenario_peak,
            "delta_mw": delta_peak,
            "delta_percentage": round(
                ((scenario_peak - baseline_peak) / baseline_peak) * 100, 2
            ) if baseline_peak > 0 else 0,
            "avg_baseline_mw": round(baseline_avg),
            "avg_scenario_mw": round(scenario_avg),
            "comparison": comparison_points,
        }

    # --- FALLBACK (synthetic) ---

    @staticmethod
    def _fallback_forecast(region: str, hours: int) -> Dict[str, Any]:
        """Generates synthetic forecast when models are unavailable."""
        base_load_map = {
            "northern": 40000,
            "southern": 25000,
            "western": 35000,
            "eastern": 18000,
            "national": 150000,
        }

        base_load = base_load_map.get(region.lower(), 50000)
        points = []
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

        for i in range(hours):
            ts = now + timedelta(hours=i)
            hour_factor = math.sin((ts.hour - 7) / 24.0 * math.pi * 2)
            noise = (hash(str(ts)) % 1000) / 1000.0
            load = base_load + (base_load * 0.2 * hour_factor) + (
                base_load * 0.02 * noise
            )

            points.append({
                "ts": ts.isoformat() + "Z",
                "load_mw": round(load),
                "low": round(load * 0.92),
                "high": round(load * 1.08),
            })

        return {
            "region": region,
            "horizon": f"{hours}h",
            "model_version": "fallback",
            "confidence_band": "±8%",
            "points": points,
        }


prediction_service = PredictionService()
