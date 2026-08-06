import numpy as np
import pandas as pd
from typing import List, Dict, Any

# ── Feature columns must EXACTLY match what train.py uses ────────────────────
# Any mismatch between training and serving will cause wrong predictions.
FEATURE_COLS = [
    "hour", "day_of_week", "month", "is_weekend", "is_holiday",
    "temperature", "humidity",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos", "month_sin", "month_cos",
    "lag_1h", "lag_2h", "lag_3h", "lag_6h", "lag_12h",
    "lag_24h", "lag_48h", "lag_168h",
    "rolling_mean_6h", "rolling_mean_24h", "rolling_mean_168h",
    "rolling_std_6h",  "rolling_std_24h",  "rolling_std_168h",
]

# Indian public holidays (month, day)
INDIAN_HOLIDAYS = {
    (1, 26), (1, 1), (8, 15), (10, 2), (12, 25), (11, 1), (3, 25)
}


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds lag features and rolling statistics to a dataframe that already has
    base columns: timestamp, load_mw, temperature, humidity, is_holiday.

    Must remain identical to the logic in train.py to avoid train/serve skew.
    """
    df = df.sort_values("timestamp").copy()

    # Lag features
    for lag in [1, 2, 3, 6, 12, 24, 48, 168]:
        df[f"lag_{lag}h"] = df["load_mw"].shift(lag)

    # Rolling window statistics
    for window in [6, 24, 168]:
        df[f"rolling_mean_{window}h"] = df["load_mw"].shift(1).rolling(window).mean()
        df[f"rolling_std_{window}h"]  = df["load_mw"].shift(1).rolling(window).std()

    # Cyclic time encodings
    df["hour_sin"]  = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]  = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]   = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]   = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    return df


def build_inference_row(
    ts: "pd.Timestamp",
    temperature: float,
    humidity: float,
    is_holiday: int,
    recent_loads: List[float],   # ordered list of most recent load_mw values (newest last)
) -> pd.DataFrame:
    """
    Builds a single-row feature DataFrame for real-time inference.
    
    Args:
        ts:            The future timestamp we want to predict demand for.
        temperature:   Forecast temperature (°C) at that timestamp.
        humidity:      Forecast humidity (%) at that timestamp.
        is_holiday:    1 if public holiday, else 0.
        recent_loads:  At least 168 recent hourly MW readings (newest = last element).
    
    Returns:
        A single-row DataFrame with all FEATURE_COLS columns.
    """
    def _get_lag(n):
        """Get the load value n hours ago from recent_loads list."""
        idx = len(recent_loads) - n
        return float(recent_loads[idx]) if idx >= 0 else np.nan

    def _rolling_mean(window):
        slice_ = recent_loads[max(0, len(recent_loads) - window):]
        return float(np.mean(slice_)) if slice_ else np.nan

    def _rolling_std(window):
        slice_ = recent_loads[max(0, len(recent_loads) - window):]
        return float(np.std(slice_)) if len(slice_) > 1 else np.nan

    row = {
        "hour":        ts.hour,
        "day_of_week": ts.dayofweek,
        "month":       ts.month,
        "is_weekend":  int(ts.dayofweek >= 5),
        "is_holiday":  is_holiday,
        "temperature": temperature,
        "humidity":    humidity,
        "hour_sin":    np.sin(2 * np.pi * ts.hour / 24),
        "hour_cos":    np.cos(2 * np.pi * ts.hour / 24),
        "dow_sin":     np.sin(2 * np.pi * ts.dayofweek / 7),
        "dow_cos":     np.cos(2 * np.pi * ts.dayofweek / 7),
        "month_sin":   np.sin(2 * np.pi * ts.month / 12),
        "month_cos":   np.cos(2 * np.pi * ts.month / 12),
        "lag_1h":        _get_lag(1),
        "lag_2h":        _get_lag(2),
        "lag_3h":        _get_lag(3),
        "lag_6h":        _get_lag(6),
        "lag_12h":       _get_lag(12),
        "lag_24h":       _get_lag(24),
        "lag_48h":       _get_lag(48),
        "lag_168h":      _get_lag(168),
        "rolling_mean_6h":   _rolling_mean(6),
        "rolling_mean_24h":  _rolling_mean(24),
        "rolling_mean_168h": _rolling_mean(168),
        "rolling_std_6h":    _rolling_std(6),
        "rolling_std_24h":   _rolling_std(24),
        "rolling_std_168h":  _rolling_std(168),
    }

    return pd.DataFrame([row])[FEATURE_COLS]
