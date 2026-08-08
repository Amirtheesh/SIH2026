"""
train.py — Grid Forecast AI Training Script
============================================
Generates 2 years of realistic Indian electricity demand data
and trains a multi-horizon XGBoost forecasting model.

Run this inside the Docker container:
    docker exec -it sih2026-api-1 python app/ml/train.py

Or locally (if Python env is set up):
    cd backend
    python app/ml/train.py
"""

import numpy as np
import pandas as pd
import joblib
import os
import json
from datetime import datetime, timedelta
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Base demand per region in MW (realistic India grid values)
REGION_BASE = {
    "northern": 55000,   # UP, Punjab, Haryana, Delhi, Rajasthan, HP, J&K
    "southern": 48000,   # Tamil Nadu, Karnataka, AP, Telangana, Kerala
    "western":  45000,   # Maharashtra, Gujarat, MP, Goa, Chhattisgarh
    "eastern":  22000,   # West Bengal, Odisha, Bihar, Jharkhand
    "national": 170000,  # All India combined
}

# Indian public holidays (month, day) — major ones that affect demand
INDIAN_HOLIDAYS = {
    (1, 26): "Republic Day",
    (1, 1):  "New Year",
    (8, 15): "Independence Day",
    (10, 2): "Gandhi Jayanti",
    (12, 25): "Christmas",
    (11, 1):  "Diwali approx",   # varies — simplified
    (3, 25):  "Holi approx",     # varies — simplified
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. SYNTHETIC DATA GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_synthetic_data(region: str, years: int = 2) -> pd.DataFrame:
    """
    Generates realistic hourly electricity demand data for a region.
    
    The data captures the following real-world patterns:
    - Diurnal (daily) curve: morning ramp-up, afternoon plateau, evening peak
    - Weekly cycle: weekdays higher than weekends
    - Seasonal cycle: summer (Apr–Jun) is highest due to cooling demand
    - Year-over-year growth: ~5% annual demand increase
    - Holiday effect: demand drops ~15–20% on public holidays
    - Weather correlation: demand increases with temperature (ACs)
    - Random noise: day-to-day variability
    """
    print(f"  Generating data for region: {region}...")
    
    base_load = REGION_BASE[region]
    
    # Generate 2-year hourly timestamps
    start_date = datetime(2023, 1, 1, 0, 0, 0)
    end_date   = start_date + timedelta(days=365 * years)
    timestamps = pd.date_range(start=start_date, end=end_date, freq="h")
    
    records = []
    
    for ts in timestamps:
        hour       = ts.hour
        dow        = ts.dayofweek     # 0=Mon … 6=Sun
        month      = ts.month
        day        = ts.day
        year_delta = (ts.year - 2023)  # for YoY growth
        
        # ── Diurnal pattern ──────────────────────────────────────────────────
        # Two peaks: ~9 AM (morning) and ~8 PM (evening)
        morning_peak = np.exp(-0.5 * ((hour - 9) / 2.5) ** 2)
        evening_peak = np.exp(-0.5 * ((hour - 20) / 2.0) ** 2)
        night_trough = 0.35 if (0 <= hour <= 5) else 0.0
        diurnal = 0.55 + 0.35 * (0.6 * evening_peak + 0.4 * morning_peak) - night_trough

        # ── Weekly pattern ───────────────────────────────────────────────────
        is_weekend = 1 if dow >= 5 else 0
        weekend_factor = 0.88 if is_weekend else 1.0

        # ── Seasonal pattern ─────────────────────────────────────────────────
        # Peaks: Summer (May/Jun) due to ACs; secondary peak: winter (Dec/Jan) for heating
        summer = np.exp(-0.5 * ((month - 5.5) / 1.8) ** 2)
        winter = np.exp(-0.5 * ((month - 12.5) / 1.5) ** 2) * 0.6
        seasonal = 0.85 + 0.25 * summer + 0.10 * winter

        # ── Holiday effect ───────────────────────────────────────────────────
        is_holiday = 1 if (month, day) in INDIAN_HOLIDAYS else 0
        holiday_factor = 0.82 if is_holiday else 1.0

        # ── YoY growth (5% per year) ─────────────────────────────────────────
        growth = 1.0 + (0.05 * year_delta)

        # ── Weather (synthetic correlated temperature) ────────────────────────
        # Temperature peaks in May-Jun (40°C) and is low in Dec-Jan (15°C)
        base_temp = 15 + 25 * np.sin((month - 1) / 12 * np.pi)
        temp_variation = np.random.normal(0, 3)
        temperature = base_temp + temp_variation
        # Each degree above 25°C adds ~2% to demand (cooling)
        temp_effect = max(0, (temperature - 25) * 0.02)

        # ── Humidity (synthetic) ─────────────────────────────────────────────
        humidity = 40 + 40 * np.sin((month - 3) / 12 * np.pi) + np.random.normal(0, 8)
        humidity = np.clip(humidity, 20, 95)

        # ── Noise ────────────────────────────────────────────────────────────
        noise = np.random.normal(0, 0.018)

        # ── Final demand ─────────────────────────────────────────────────────
        load_mw = base_load * diurnal * weekend_factor * seasonal * holiday_factor * growth * (1 + temp_effect) + (base_load * noise)
        load_mw = max(load_mw, base_load * 0.25)  # floor at 25% of base

        records.append({
            "timestamp":   ts,
            "region":      region,
            "load_mw":     round(load_mw, 2),
            "temperature": round(temperature, 1),
            "humidity":    round(humidity, 1),
            "hour":        hour,
            "day_of_week": dow,
            "month":       month,
            "is_weekend":  is_weekend,
            "is_holiday":  is_holiday,
        })

    df = pd.DataFrame(records)
    print(f"    Generated {len(df):,} hourly records.")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds lag features and rolling statistics.
    These are the key ML features that allow the model to learn temporal patterns.
    
    - Lag features: "what was the demand 24h ago?" 
    - Rolling features: "what was the average demand over the past 7 days?"
    """
    df = df.sort_values("timestamp").copy()

    # Lag features (how demand looked in the past)
    for lag in [1, 2, 3, 6, 12, 24, 48, 168]:
        df[f"lag_{lag}h"] = df["load_mw"].shift(lag)

    # Rolling window statistics
    for window in [6, 24, 168]:  # 6h, 1 day, 1 week
        df[f"rolling_mean_{window}h"] = df["load_mw"].shift(1).rolling(window).mean()
        df[f"rolling_std_{window}h"]  = df["load_mw"].shift(1).rolling(window).std()

    # Cyclic encoding of time features (avoids the "23 → 0" discontinuity problem)
    df["hour_sin"]  = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]  = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]   = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]   = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # Drop rows with NaN (from lag/rolling calculation at the start of the series)
    df = df.dropna()

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4. TRAINING
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_COLS = [
    "hour", "day_of_week", "month", "is_weekend", "is_holiday",
    "temperature", "humidity",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos", "month_sin", "month_cos",
    "lag_1h", "lag_2h", "lag_3h", "lag_6h", "lag_12h",
    "lag_24h", "lag_48h", "lag_168h",
    "rolling_mean_6h", "rolling_mean_24h", "rolling_mean_168h",
    "rolling_std_6h",  "rolling_std_24h",  "rolling_std_168h",
]

TARGET_COL = "load_mw"


def train_model(region: str, df: pd.DataFrame) -> dict:
    """Trains an XGBoost model for a specific region and saves it to disk."""
    print(f"\n  Training model for region: {region}...")

    df_feat = engineer_features(df)

    X = df_feat[FEATURE_COLS]
    y = df_feat[TARGET_COL]

    # Time-based train/test split (last 30 days = test set)
    split_idx = int(len(X) * 0.94)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        random_state=42,
        tree_method="hist",     # fast histogram method
        device="cpu",
        verbosity=0,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
    r2     = r2_score(y_test, y_pred)
    mape   = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

    metrics = {
        "region": region,
        "mae_mw":  round(mae, 1),
        "rmse_mw": round(rmse, 1),
        "r2":      round(r2, 4),
        "mape_pct": round(mape, 2),
        "train_samples": len(X_train),
        "test_samples":  len(X_test),
        "trained_at":    datetime.utcnow().isoformat() + "Z",
        "model_version": "xgboost_v1",
        "feature_cols": FEATURE_COLS,
    }

    print(f"    MAE:  {mae:,.0f} MW  |  RMSE: {rmse:,.0f} MW  |  R²: {r2:.4f}  |  MAPE: {mape:.2f}%")

    # Save model + metadata
    model_path   = os.path.join(OUTPUT_DIR, f"xgboost_{region}_v1.pkl")
    metrics_path = os.path.join(OUTPUT_DIR, f"metrics_{region}_v1.json")

    joblib.dump(model, model_path)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"    Model saved → {model_path}")

    return metrics


# ─────────────────────────────────────────────────────────────────────────────
# 5. MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Grid Forecast — XGBoost Training Script")
    print("=" * 60)

    all_metrics = {}

    for region in REGION_BASE.keys():
        print(f"\n[Region: {region.upper()}]")
        raw_df = generate_synthetic_data(region, years=2)
        metrics = train_model(region, raw_df)
        all_metrics[region] = metrics

    # Save combined metrics summary
    summary_path = os.path.join(OUTPUT_DIR, "training_summary.json")
    with open(summary_path, "w") as f:
        json.dump(all_metrics, f, indent=2)

    print("\n" + "=" * 60)
    print("  Training complete! Summary:")
    print("=" * 60)
    for region, m in all_metrics.items():
        print(f"  {region:10s}  MAE: {m['mae_mw']:>8,.0f} MW  MAPE: {m['mape_pct']:>5.2f}%  R²: {m['r2']:.4f}")

    print(f"\n  Models saved to: {OUTPUT_DIR}")
    print("=" * 60)
