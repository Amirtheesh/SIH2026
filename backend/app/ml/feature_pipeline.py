"""
Feature Pipeline
================
Transforms raw data (weather, temporal, events, historical load) into a
standardized feature matrix for XGBoost inference and training.

This is the SINGLE SOURCE OF TRUTH for feature engineering.
Both training (train_dummy_model.py) and inference (prediction_service.py)
must use this pipeline to avoid train/serve skew.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional


def create_features(
    data: List[Dict[str, Any]],
    historical_loads: Optional[List[float]] = None,
) -> pd.DataFrame:
    """
    Transforms raw JSON records into a feature matrix.

    Args:
        data: List of dicts with at minimum 'timestamp'. Can include:
              temperature, humidity, wind_speed, rainfall, solar_radiation,
              is_holiday, is_festival, is_sports_event, is_political_event,
              target_load_mw (only during training)
        historical_loads: Optional list of recent historical load values (MW)
                         used to compute lag features during inference.
                         Should be at least 168 values (1 week hourly).

    Returns:
        DataFrame with all features needed for model inference.
    """
    df = pd.DataFrame(data)
    if df.empty:
        return df

    # ---- Temporal Features ----
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)
    df["is_peak_hour"] = df["hour"].apply(lambda h: 1 if 18 <= h <= 22 else 0)

    # ---- Weather Features (with sensible defaults) ----
    if "temperature" not in df.columns:
        df["temperature"] = 30.0  # Default for India
    if "humidity" not in df.columns:
        df["humidity"] = 60.0
    if "wind_speed" not in df.columns:
        df["wind_speed"] = 4.0
    if "rainfall" not in df.columns:
        df["rainfall"] = 0.0
    if "solar_radiation" not in df.columns:
        # Estimate from hour
        df["solar_radiation"] = df["hour"].apply(
            lambda h: max(0, 800 * np.sin((h - 6) / 12.0 * np.pi)) if 6 <= h <= 18 else 0.0
        )

    # ---- Derived Weather Features ----
    df["heat_index"] = df.apply(
        lambda row: row["temperature"] + 0.5 * (row["humidity"] - 40) * 0.1
        if row["temperature"] > 27 else row["temperature"],
        axis=1,
    )
    df["cdd"] = (df["temperature"] - 24.0).clip(lower=0)
    df["temp_humidity_interaction"] = df["temperature"] * df["humidity"] / 100.0

    # ---- Event Features (default to no event) ----
    for col in ["is_holiday", "is_festival", "is_sports_event", "is_political_event"]:
        if col not in df.columns:
            df[col] = 0

    # ---- Lag Features ----
    if "target_load_mw" in df.columns:
        # Training mode: compute from target
        df["load_lag_1h"] = df["target_load_mw"].shift(1)
        df["load_lag_6h"] = df["target_load_mw"].shift(6)
        df["load_lag_24h"] = df["target_load_mw"].shift(24)
        df["load_lag_168h"] = df["target_load_mw"].shift(168)
        df["rolling_mean_24h"] = df["target_load_mw"].rolling(24, min_periods=1).mean()
        df["rolling_std_24h"] = df["target_load_mw"].rolling(24, min_periods=1).std().fillna(0)
        df["rolling_mean_168h"] = df["target_load_mw"].rolling(168, min_periods=1).mean()
    elif historical_loads is not None and len(historical_loads) > 0:
        # Inference mode: use provided historical loads
        hist = list(historical_loads)
        n = len(df)

        # Build a combined series: historical + placeholder for future
        # We use the last known load repeated forward as a rough proxy
        last_load = hist[-1] if hist else 150000.0
        combined = hist + [last_load] * n

        lag_1h = []
        lag_6h = []
        lag_24h = []
        lag_168h = []
        roll_24h = []
        roll_std_24h = []
        roll_168h = []

        hist_len = len(hist)
        for i in range(n):
            idx = hist_len + i  # Position in combined series

            # Lag features look backward from current position
            lag_1h.append(combined[idx - 1] if idx >= 1 else last_load)
            lag_6h.append(combined[idx - 6] if idx >= 6 else last_load)
            lag_24h.append(combined[idx - 24] if idx >= 24 else last_load)
            lag_168h.append(combined[idx - 168] if idx >= 168 else last_load)

            # Rolling features over historical window
            window_start = max(0, idx - 24)
            window = combined[window_start:idx] if idx > 0 else [last_load]
            roll_24h.append(np.mean(window))
            roll_std_24h.append(np.std(window) if len(window) > 1 else 0.0)

            window_start_168 = max(0, idx - 168)
            window_168 = combined[window_start_168:idx] if idx > 0 else [last_load]
            roll_168h.append(np.mean(window_168))

        df["load_lag_1h"] = lag_1h
        df["load_lag_6h"] = lag_6h
        df["load_lag_24h"] = lag_24h
        df["load_lag_168h"] = lag_168h
        df["rolling_mean_24h"] = roll_24h
        df["rolling_std_24h"] = roll_std_24h
        df["rolling_mean_168h"] = roll_168h
    else:
        # No historical data available — use reasonable defaults
        default_load = 150000.0
        df["load_lag_1h"] = default_load
        df["load_lag_6h"] = default_load
        df["load_lag_24h"] = default_load
        df["load_lag_168h"] = default_load
        df["rolling_mean_24h"] = default_load
        df["rolling_std_24h"] = 2000.0
        df["rolling_mean_168h"] = default_load

    return df


# Canonical feature column order — must match training
SHORT_TERM_FEATURES = [
    "temperature", "humidity", "wind_speed", "rainfall", "solar_radiation",
    "hour", "day_of_week", "month", "day_of_year",
    "is_weekend", "is_peak_hour",
    "is_holiday", "is_festival", "is_sports_event", "is_political_event",
    "heat_index", "cdd",
    "load_lag_1h", "load_lag_6h", "load_lag_24h", "load_lag_168h",
    "rolling_mean_24h", "rolling_std_24h", "rolling_mean_168h",
    "temp_humidity_interaction",
]

LONG_TERM_FEATURES = [
    c for c in SHORT_TERM_FEATURES if c not in ["load_lag_1h", "load_lag_6h"]
]
