import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.ml.model_loader import model_loader, REGION_BASE_FALLBACK
from app.ml.feature_pipeline import build_inference_row, INDIAN_HOLIDAYS

# ── Constants ──────────────────────────────────────────────────────────────────

# Supported forecast horizons
HORIZON_HOURS = {
    "24h":  24,
    "48h":  48,
    "72h":  72,
    "168h": 168,   # 7 days
    "7d":   168,
}

# Typical temperature for each region by month (for fallback when weather API unavailable)
REGION_TEMP_PROFILE = {
    "northern": [15, 18, 24, 32, 38, 40, 36, 34, 30, 25, 18, 14],
    "southern": [26, 28, 30, 33, 35, 30, 28, 28, 28, 27, 25, 24],
    "western":  [22, 24, 27, 32, 36, 33, 29, 28, 29, 28, 24, 21],
    "eastern":  [18, 21, 27, 32, 35, 33, 30, 30, 29, 26, 21, 17],
    "national": [20, 22, 27, 32, 37, 35, 31, 30, 29, 26, 21, 17],
}


def _get_typical_temp(region: str, month: int) -> float:
    profile = REGION_TEMP_PROFILE.get(region.lower(), REGION_TEMP_PROFILE["national"])
    return float(profile[month - 1])


def _is_holiday(ts: pd.Timestamp) -> int:
    return 1 if (ts.month, ts.day) in INDIAN_HOLIDAYS else 0


def _generate_seed_loads(region: str, reference_ts: datetime, n_hours: int = 200) -> List[float]:
    """
    Generate a realistic sequence of past load values to seed the lag features.
    
    In production this would query the database. For now, we generate
    synthetic values using the trained model's base load profile.
    """
    base = REGION_BASE_FALLBACK.get(region.lower(), 50000)
    loads = []
    for i in range(n_hours, 0, -1):
        past_ts = reference_ts - timedelta(hours=i)
        hour = past_ts.hour
        month = past_ts.month
        dow = past_ts.weekday()

        # Diurnal pattern (same as training data generator)
        morning = math.exp(-0.5 * ((hour - 9) / 2.5) ** 2)
        evening = math.exp(-0.5 * ((hour - 20) / 2.0) ** 2)
        night_trough = 0.35 if (0 <= hour <= 5) else 0.0
        diurnal = 0.55 + 0.35 * (0.6 * evening + 0.4 * morning) - night_trough

        # Seasonal
        summer = math.exp(-0.5 * ((month - 5.5) / 1.8) ** 2)
        seasonal = 0.85 + 0.25 * summer

        # Weekend
        weekend = 0.88 if dow >= 5 else 1.0

        # Small noise
        noise = (hash(str(past_ts)) % 200 - 100) / 10000.0

        load = base * diurnal * seasonal * weekend * (1 + noise)
        loads.append(max(load, base * 0.25))

    return loads


class PredictionService:

    @staticmethod
    async def predict_horizon(
        region: str,
        horizon: str = "24h",
        temperature_override: float = None,
        humidity_override:    float = None,
        is_holiday_override:  int   = None,
    ) -> Dict[str, Any]:
        """
        Runs multi-horizon electricity demand forecasting using the trained XGBoost model.
        
        Supports horizons: 24h, 48h, 72h, 168h (7 days).
        
        Returns one data point per hour with:
          - ts:       ISO timestamp
          - load_mw:  predicted demand in megawatts
          - low:      lower confidence bound (95%)
          - high:     upper confidence bound (95%)
        """
        region = region.lower()
        hours = HORIZON_HOURS.get(horizon, 24)

        # Get training metrics to set confidence band width
        metrics = model_loader.get_metrics(region)
        mape = metrics["mape_pct"] / 100.0 if metrics else 0.05
        ci_width = max(mape, 0.03)   # at least ±3%

        # Seed with realistic past loads (needed for lag features)
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        seed_loads = _generate_seed_loads(region, now, n_hours=200)

        points = []
        rolling_loads = list(seed_loads)   # grows as we predict each hour

        for i in range(hours):
            ts = pd.Timestamp(now + timedelta(hours=i + 1))

            # Weather — use override if provided, else use typical value for this month
            temperature = temperature_override if temperature_override is not None \
                          else _get_typical_temp(region, ts.month)
            humidity    = humidity_override if humidity_override is not None else 60.0
            is_hol      = is_holiday_override if is_holiday_override is not None \
                          else _is_holiday(ts)

            # Build feature row
            X = build_inference_row(
                ts=ts,
                temperature=temperature,
                humidity=humidity,
                is_holiday=is_hol,
                recent_loads=rolling_loads,
            )

            # Run model prediction
            pred = model_loader.predict(region, X)
            load_mw = float(pred[0])
            load_mw = max(load_mw, REGION_BASE_FALLBACK[region] * 0.20)

            # Append the predicted value to rolling_loads for next step's lags
            rolling_loads.append(load_mw)

            points.append({
                "ts":      ts.isoformat() + "Z",
                "load_mw": round(load_mw),
                "low":     round(load_mw * (1 - ci_width)),
                "high":    round(load_mw * (1 + ci_width)),
                "is_model_prediction": model_loader.is_trained(region),
            })

        return {
            "region":   region,
            "horizon":  horizon,
            "hours":    hours,
            "model_trained": model_loader.is_trained(region),
            "model_metrics": metrics,
            "points":   points,
        }

    @staticmethod
    async def get_peak(region: str, horizon: str = "24h") -> Dict[str, Any]:
        """Returns the predicted peak demand time and value within the forecast horizon."""
        forecast = await PredictionService.predict_horizon(region, horizon)
        peak_point = max(forecast["points"], key=lambda p: p["load_mw"])
        return {
            "region":        region,
            "horizon":       horizon,
            "peak_time":     peak_point["ts"],
            "peak_load_mw":  peak_point["load_mw"],
            "low":           peak_point["low"],
            "high":          peak_point["high"],
            "model_trained": forecast["model_trained"],
        }

    @staticmethod
    async def simulate_what_if(region: str, params: dict) -> dict:
        """
        Scenario forecasting — reruns prediction with user-specified parameter overrides.
        Returns original vs modified peak demand comparison.
        """
        temp_offset = params.get("temperature_offset", 0.0)
        is_holiday  = params.get("is_holiday", False)

        # Original forecast (no overrides)
        original_forecast = await PredictionService.predict_horizon(region, "24h")
        original_peak_pt  = max(original_forecast["points"], key=lambda p: p["load_mw"])
        original_peak     = original_peak_pt["load_mw"]

        # Modified forecast with overrides
        # Get the typical temperature for the region this month and apply offset
        now = datetime.utcnow()
        typical_temp = _get_typical_temp(region, now.month)
        new_temp = typical_temp + temp_offset

        modified_forecast = await PredictionService.predict_horizon(
            region,
            "24h",
            temperature_override=new_temp,
            humidity_override=None,
            is_holiday_override=1 if is_holiday else 0,
        )
        modified_peak_pt = max(modified_forecast["points"], key=lambda p: p["load_mw"])
        new_peak = modified_peak_pt["load_mw"]

        delta = new_peak - original_peak

        return {
            "region":              region,
            "original_peak_mw":   original_peak,
            "new_peak_mw":        new_peak,
            "delta_mw":           round(delta),
            "delta_percentage":   round((delta / original_peak) * 100, 2),
            "parameters_applied": {
                "temperature_offset": temp_offset,
                "is_holiday": is_holiday,
            },
            "model_trained": original_forecast["model_trained"],
        }


prediction_service = PredictionService()
