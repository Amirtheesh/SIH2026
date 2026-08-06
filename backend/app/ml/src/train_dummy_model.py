import os
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from datetime import datetime, timedelta

def generate_dummy_data():
    """Generates synthetic data matching the expected feature pipeline"""
    records = []
    base_time = datetime(2023, 1, 1)
    
    for i in range(24 * 30): # 30 days of data
        ts = base_time + timedelta(hours=i)
        
        # Features
        temperature = 25.0 + 10 * np.sin((ts.hour - 12) / 24.0 * 2 * np.pi) + np.random.normal(0, 2)
        humidity = 60.0 + 20 * np.cos((ts.hour - 12) / 24.0 * 2 * np.pi) + np.random.normal(0, 5)
        
        # Base load pattern
        base_load = 50000 
        hour_factor = np.sin((ts.hour - 7) / 24.0 * 2 * np.pi)
        
        # Calculate target label
        load_mw = base_load + (base_load * 0.2 * hour_factor) + (temperature * 100) + np.random.normal(0, 1000)
        
        records.append({
            "timestamp": ts.isoformat(),
            "temperature": temperature,
            "humidity": humidity,
            "target_load_mw": load_mw
        })
    return records

def train_and_save():
    # 1. Use the real feature pipeline logic
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))
    from app.ml.feature_pipeline import create_features
    
    data = generate_dummy_data()
    
    # 2. Extract features and target
    df = create_features(data)
    
    # Expected output of create_features has: hour, day_of_week, is_weekend, temperature, humidity
    # But since we generated a target_load_mw, we need to extract it
    targets = pd.DataFrame(data)['target_load_mw']
    
    # Drop timestamp or other non-numeric strings
    if 'timestamp' in df.columns:
        df = df.drop(columns=['timestamp'])
    if 'target_load_mw' in df.columns:
        df = df.drop(columns=['target_load_mw'])
    
    # Save the exact feature order so we know what the model expects
    feature_columns = df.columns.tolist()
    print("Training with features:", feature_columns)
    
    # 3. Train dummy XGBoost point forecast
    model = xgb.XGBRegressor(n_estimators=50, max_depth=4, random_state=42)
    model.fit(df, targets)
    
    # 4. Save to disk
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models'))
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, 'xgboost_v1.pkl')
    joblib.dump(model, model_path)
    
    # Create an upper-bound (peak/quantile) dummy model (e.g., predicting higher loads)
    model_peak = xgb.XGBRegressor(n_estimators=50, max_depth=4, random_state=42)
    model_peak.fit(df, targets * 1.05) # Dummy hack: train it on 5% higher data to represent high band
    
    peak_path = os.path.join(models_dir, 'xgboost_v1_peak.pkl')
    joblib.dump(model_peak, peak_path)

    print(f"Models successfully saved to {models_dir}")
    print(f"- {model_path}")
    print(f"- {peak_path}")
    
    # Save config
    config_path = os.path.join(models_dir, 'features.json')
    import json
    with open(config_path, 'w') as f:
        json.dump(feature_columns, f)

if __name__ == "__main__":
    train_and_save()
