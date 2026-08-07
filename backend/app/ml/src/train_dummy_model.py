"""
Train All Models for GridForecaster
====================================
Generates 1 year of realistic synthetic electricity demand data and trains:
  1. Short-term forecast model (1-6h horizon)
  2. Long-term forecast model (24h-168h horizon)
  3. Peak demand prediction model (daily peak MW)
  4. Peak hour classifier (which hour has the daily peak)
  5. Anomaly detection model (Isolation Forest on residuals)

Run: python app/ml/src/train_dummy_model.py
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# 1. SYNTHETIC DATA GENERATION (1 year, hourly, ~8760 records)
# ---------------------------------------------------------------------------

def generate_yearly_data():
    """
    Generates 1 year of realistic hourly electricity demand data for India's
    national grid. Includes weather, events, and temporal patterns.
    """
    np.random.seed(42)
    records = []
    base_time = datetime(2023, 1, 1)
    total_hours = 365 * 24  # 8760 hours

    # Indian holidays/festivals (day_of_year)
    holidays = [
        1,    # New Year
        26,   # Republic Day
        69,   # Holi (approx)
        105,  # Ram Navami
        135,  # Buddha Purnima
        227,  # Independence Day
        249,  # Janmashtami
        258,  # Ganesh Chaturthi
        281,  # Dussehra
        300,  # Diwali
        305,  # Diwali (day 2)
        359,  # Christmas
    ]
    
    # Cricket match days (IPL season April-May, ~40 matches)
    cricket_days = list(range(91, 152, 2))  # Every other day in Apr-May
    
    # Festival periods (multi-day high demand)
    festival_periods = [
        (298, 306),   # Diwali week
        (68, 70),     # Holi
        (255, 260),   # Ganesh Chaturthi
    ]

    for i in range(total_hours):
        ts = base_time + timedelta(hours=i)
        day_of_year = ts.timetuple().tm_yday
        month = ts.month
        hour = ts.hour
        dow = ts.weekday()
        is_weekend = 1 if dow >= 5 else 0

        # ---- WEATHER SIMULATION ----
        # Temperature: seasonal (hot summers, mild winters) + daily cycle
        seasonal_temp = 25.0 + 12.0 * np.sin((day_of_year - 100) / 365.0 * 2 * np.pi)
        daily_temp_cycle = 5.0 * np.sin((hour - 14) / 24.0 * 2 * np.pi)
        temperature = seasonal_temp + daily_temp_cycle + np.random.normal(0, 2.0)

        # Humidity: inversely correlated with temperature + monsoon season
        base_humidity = 55.0 - 0.5 * (temperature - 25.0)
        if 6 <= month <= 9:  # Monsoon
            base_humidity += 20.0
        humidity = np.clip(base_humidity + np.random.normal(0, 8.0), 20, 100)

        # Wind speed: varies by season
        wind_speed = 3.0 + 2.0 * np.sin((day_of_year - 60) / 365.0 * 2 * np.pi) + np.random.exponential(1.5)

        # Rainfall: monsoon-heavy, sporadic otherwise
        if 6 <= month <= 9:
            rainfall = np.random.exponential(3.0) if np.random.random() < 0.4 else 0.0
        else:
            rainfall = np.random.exponential(0.5) if np.random.random() < 0.1 else 0.0

        # Solar radiation: depends on cloud cover (rain), time of day, season
        if hour < 6 or hour > 18:
            solar_radiation = 0.0
        else:
            solar_peak = 900.0 + 100.0 * np.sin((day_of_year - 80) / 365.0 * 2 * np.pi)
            solar_hourly = solar_peak * np.sin((hour - 6) / 12.0 * np.pi)
            cloud_factor = 0.3 if rainfall > 1.0 else (0.7 if rainfall > 0 else 1.0)
            solar_radiation = max(0, solar_hourly * cloud_factor + np.random.normal(0, 30))

        # ---- EVENTS ----
        is_holiday = 1 if day_of_year in holidays else 0
        is_festival = 0
        for start, end in festival_periods:
            if start <= day_of_year <= end:
                is_festival = 1
                break
        is_sports_event = 1 if day_of_year in cricket_days and 18 <= hour <= 23 else 0
        is_political_event = 0  # Rare, add a few
        if day_of_year in [120, 121, 300]:  # Election days
            is_political_event = 1

        # ---- DERIVED FEATURES ----
        # Heat index (simplified)
        heat_index = temperature + 0.5 * (humidity - 40) * 0.1 if temperature > 27 else temperature
        
        # Cooling degree days (base 24°C for India)
        cdd = max(0, temperature - 24.0)
        
        # Is peak hour (6PM - 10PM)
        is_peak_hour = 1 if 18 <= hour <= 22 else 0

        # ---- TARGET: ELECTRICITY DEMAND (MW) ----
        # National grid base load
        base_load = 150000.0

        # Seasonal effect: summer = higher AC load
        seasonal_factor = 1.0 + 0.15 * np.sin((day_of_year - 100) / 365.0 * 2 * np.pi)

        # Daily pattern: morning ramp, evening peak, night trough
        if 0 <= hour < 5:
            hourly_factor = 0.70 + 0.02 * hour
        elif 5 <= hour < 9:
            hourly_factor = 0.80 + 0.05 * (hour - 5)
        elif 9 <= hour < 12:
            hourly_factor = 1.00 + 0.02 * (hour - 9)
        elif 12 <= hour < 14:
            hourly_factor = 1.05
        elif 14 <= hour < 18:
            hourly_factor = 1.02 + 0.02 * (hour - 14)
        elif 18 <= hour < 22:
            hourly_factor = 1.10 + 0.03 * (hour - 18)  # Peak
        else:
            hourly_factor = 1.10 - 0.10 * (hour - 22)

        # Temperature effect: AC load
        temp_effect = 1.0 + max(0, (temperature - 30)) * 0.008

        # Humidity makes AC work harder
        humidity_effect = 1.0 + max(0, (humidity - 70)) * 0.002

        # Weekend = lower industrial load
        weekend_effect = 0.88 if is_weekend else 1.0

        # Event effects
        holiday_effect = 0.82 if is_holiday else 1.0
        festival_effect = 1.12 if is_festival else 1.0
        sports_effect = 1.06 if is_sports_event else 1.0
        political_effect = 0.90 if is_political_event else 1.0

        # Rain reduces cooling demand slightly
        rain_effect = 1.0 - min(rainfall * 0.005, 0.05)

        # Wind helps cooling
        wind_effect = 1.0 - min(wind_speed * 0.002, 0.02)

        # Calculate final load
        load_mw = (base_load
                   * seasonal_factor
                   * hourly_factor
                   * temp_effect
                   * humidity_effect
                   * weekend_effect
                   * holiday_effect
                   * festival_effect
                   * sports_effect
                   * political_effect
                   * rain_effect
                   * wind_effect)

        # Add realistic noise
        load_mw += np.random.normal(0, 1500)

        # Inject anomalies (5% of data) for anomaly detection training
        is_anomaly = 0
        if np.random.random() < 0.02:
            # Sudden spike
            load_mw *= 1.25 + np.random.uniform(0, 0.15)
            is_anomaly = 1
        elif np.random.random() < 0.02:
            # Sudden drop
            load_mw *= 0.70 - np.random.uniform(0, 0.10)
            is_anomaly = 1
        elif np.random.random() < 0.01:
            # Gradual drift
            load_mw += np.random.normal(15000, 3000)
            is_anomaly = 1

        records.append({
            "timestamp": ts.isoformat(),
            "temperature": round(temperature, 2),
            "humidity": round(humidity, 2),
            "wind_speed": round(wind_speed, 2),
            "rainfall": round(rainfall, 2),
            "solar_radiation": round(solar_radiation, 2),
            "hour": hour,
            "day_of_week": dow,
            "month": month,
            "day_of_year": day_of_year,
            "is_weekend": is_weekend,
            "is_peak_hour": is_peak_hour,
            "is_holiday": is_holiday,
            "is_festival": is_festival,
            "is_sports_event": is_sports_event,
            "is_political_event": is_political_event,
            "heat_index": round(heat_index, 2),
            "cdd": round(cdd, 2),
            "target_load_mw": round(load_mw, 2),
            "is_anomaly": is_anomaly,
        })

    return records


# ---------------------------------------------------------------------------
# 2. FEATURE ENGINEERING (matches feature_pipeline.py)
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add lag and rolling features. Must mirror what feature_pipeline.py does.
    """
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    # Lag features (using target as the "historical load" during training)
    df["load_lag_1h"] = df["target_load_mw"].shift(1)
    df["load_lag_6h"] = df["target_load_mw"].shift(6)
    df["load_lag_24h"] = df["target_load_mw"].shift(24)
    df["load_lag_168h"] = df["target_load_mw"].shift(168)  # Same hour last week

    # Rolling statistics
    df["rolling_mean_24h"] = df["target_load_mw"].rolling(24, min_periods=1).mean()
    df["rolling_std_24h"] = df["target_load_mw"].rolling(24, min_periods=1).std().fillna(0)
    df["rolling_mean_168h"] = df["target_load_mw"].rolling(168, min_periods=1).mean()

    # Temperature-humidity interaction
    df["temp_humidity_interaction"] = df["temperature"] * df["humidity"] / 100.0

    # Drop rows with NaN from lagging (first 168 hours)
    df = df.dropna().reset_index(drop=True)

    return df


# ---------------------------------------------------------------------------
# 3. TRAINING
# ---------------------------------------------------------------------------

FEATURE_COLUMNS = [
    "temperature", "humidity", "wind_speed", "rainfall", "solar_radiation",
    "hour", "day_of_week", "month", "day_of_year",
    "is_weekend", "is_peak_hour",
    "is_holiday", "is_festival", "is_sports_event", "is_political_event",
    "heat_index", "cdd",
    "load_lag_1h", "load_lag_6h", "load_lag_24h", "load_lag_168h",
    "rolling_mean_24h", "rolling_std_24h", "rolling_mean_168h",
    "temp_humidity_interaction",
]


def train_and_save():
    print("=" * 60)
    print("GridForecaster — Training All Models")
    print("=" * 60)

    # Generate data
    print("\n[1/6] Generating 1 year of synthetic data...")
    raw_data = generate_yearly_data()
    df = pd.DataFrame(raw_data)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    print(f"      Generated {len(df)} hourly records")

    # Engineer features
    print("[2/6] Engineering features (lags, rolling stats, interactions)...")
    df = engineer_features(df)
    print(f"      Feature matrix shape: {df.shape}")

    # Prepare features and targets
    X = df[FEATURE_COLUMNS]
    y = df["target_load_mw"]
    anomaly_labels = df["is_anomaly"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
    os.makedirs(models_dir, exist_ok=True)

    # ---- Model 1: Short-term forecast (1-6h) ----
    print("\n[3/6] Training SHORT-TERM forecast model (1-6h horizon)...")
    model_short = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=0
    )
    model_short.fit(X_train, y_train)
    
    preds_short = model_short.predict(X_test)
    mae_short = mean_absolute_error(y_test, preds_short)
    rmse_short = np.sqrt(mean_squared_error(y_test, preds_short))
    mape_short = np.mean(np.abs((y_test - preds_short) / y_test)) * 100
    print(f"      MAE:  {mae_short:.0f} MW")
    print(f"      RMSE: {rmse_short:.0f} MW")
    print(f"      MAPE: {mape_short:.2f}%")

    short_path = os.path.join(models_dir, "xgboost_short_term.pkl")
    joblib.dump(model_short, short_path)

    # ---- Model 2: Long-term forecast (24-168h) ----
    print("\n[4/6] Training LONG-TERM forecast model (24-168h horizon)...")
    # For long-term, reduce reliance on recent lags (they won't be available)
    # Use features that are more "plannable" - temporal, weather forecast, events
    long_term_features = [c for c in FEATURE_COLUMNS if c not in ["load_lag_1h", "load_lag_6h"]]
    
    model_long = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.7,
        random_state=42,
        verbosity=0
    )
    model_long.fit(X_train[long_term_features], y_train)

    preds_long = model_long.predict(X_test[long_term_features])
    mae_long = mean_absolute_error(y_test, preds_long)
    rmse_long = np.sqrt(mean_squared_error(y_test, preds_long))
    mape_long = np.mean(np.abs((y_test - preds_long) / y_test)) * 100
    print(f"      MAE:  {mae_long:.0f} MW")
    print(f"      RMSE: {rmse_long:.0f} MW")
    print(f"      MAPE: {mape_long:.2f}%")

    long_path = os.path.join(models_dir, "xgboost_long_term.pkl")
    joblib.dump(model_long, long_path)

    # ---- Model 3: Peak demand prediction ----
    print("\n[5/6] Training PEAK DEMAND model...")
    # Create daily-peak labels
    df["date"] = df["timestamp"].dt.date
    daily_peaks = df.groupby("date").agg(
        peak_load=("target_load_mw", "max"),
        peak_hour=("target_load_mw", lambda x: df.loc[x.idxmax(), "hour"])
    ).reset_index()

    # For peak model, use daily aggregate features
    daily_features = df.groupby("date").agg(
        avg_temperature=("temperature", "mean"),
        max_temperature=("temperature", "max"),
        avg_humidity=("humidity", "mean"),
        avg_wind_speed=("wind_speed", "mean"),
        total_rainfall=("rainfall", "sum"),
        avg_solar=("solar_radiation", "mean"),
        day_of_week=("day_of_week", "first"),
        month=("month", "first"),
        is_weekend=("is_weekend", "first"),
        is_holiday=("is_holiday", "max"),
        is_festival=("is_festival", "max"),
        is_sports_event=("is_sports_event", "max"),
        avg_cdd=("cdd", "mean"),
        max_cdd=("cdd", "max"),
        prev_day_avg_load=("rolling_mean_24h", "last"),
    ).reset_index()

    daily_merged = daily_features.merge(daily_peaks, on="date")
    
    peak_feature_cols = [c for c in daily_merged.columns if c not in ["date", "peak_load", "peak_hour"]]

    model_peak = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.05,
        random_state=42,
        verbosity=0
    )
    model_peak.fit(daily_merged[peak_feature_cols], daily_merged["peak_load"])

    # Peak hour classifier
    model_peak_hour = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
        verbosity=0
    )
    model_peak_hour.fit(daily_merged[peak_feature_cols], daily_merged["peak_hour"])

    peak_path = os.path.join(models_dir, "xgboost_peak.pkl")
    peak_hour_path = os.path.join(models_dir, "xgboost_peak_hour.pkl")
    joblib.dump(model_peak, peak_path)
    joblib.dump(model_peak_hour, peak_hour_path)
    print(f"      Peak model saved")
    print(f"      Peak hour model saved")

    # ---- Model 4: Anomaly detection (Isolation Forest) ----
    print("\n[6/6] Training ANOMALY DETECTION model (Isolation Forest)...")
    # Train on residuals from the short-term model
    all_preds = model_short.predict(X)
    residuals = (y.values - all_preds).reshape(-1, 1)

    # Also include the raw features for context
    anomaly_features = np.column_stack([
        residuals,
        X["temperature"].values,
        X["hour"].values,
        X["is_weekend"].values,
        X["rolling_std_24h"].values,
    ])

    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.05,  # Expect ~5% anomalies
        random_state=42,
        verbose=0
    )
    iso_forest.fit(anomaly_features)

    iso_path = os.path.join(models_dir, "isolation_forest.pkl")
    joblib.dump(iso_forest, iso_path)
    print(f"      Isolation Forest saved")

    # ---- Save feature configuration ----
    config = {
        "short_term_features": FEATURE_COLUMNS,
        "long_term_features": long_term_features,
        "peak_features": peak_feature_cols,
        "anomaly_context_features": ["residual", "temperature", "hour", "is_weekend", "rolling_std_24h"],
        "version": "v2",
        "trained_at": datetime.utcnow().isoformat(),
        "metrics": {
            "short_term": {"mae": round(mae_short, 2), "rmse": round(rmse_short, 2), "mape": round(mape_short, 2)},
            "long_term": {"mae": round(mae_long, 2), "rmse": round(rmse_long, 2), "mape": round(mape_long, 2)},
        }
    }
    config_path = os.path.join(models_dir, "features.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    # Also keep the old model names as symlinks/copies for backward compat
    joblib.dump(model_short, os.path.join(models_dir, "xgboost_v1.pkl"))
    joblib.dump(model_peak, os.path.join(models_dir, "xgboost_v1_peak.pkl"))

    print("\n" + "=" * 60)
    print("ALL MODELS TRAINED SUCCESSFULLY")
    print("=" * 60)
    print(f"\nModels saved to: {models_dir}")
    print(f"  - xgboost_short_term.pkl  (1-6h forecast)")
    print(f"  - xgboost_long_term.pkl   (24-168h forecast)")
    print(f"  - xgboost_peak.pkl        (daily peak prediction)")
    print(f"  - xgboost_peak_hour.pkl   (peak hour prediction)")
    print(f"  - isolation_forest.pkl    (anomaly detection)")
    print(f"  - features.json           (feature config & metrics)")
    print(f"  - xgboost_v1.pkl          (backward compat)")
    print(f"  - xgboost_v1_peak.pkl     (backward compat)")


if __name__ == "__main__":
    train_and_save()
