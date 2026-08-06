import pandas as pd
from typing import List, Dict, Any

def create_features(data: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Transforms raw JSON records from weather, historical_load, and events 
    into a standardized feature matrix for XGBoost inference/training.
    This is the single source of truth for feature engineering to avoid train/serve skew.
    """
    df = pd.DataFrame(data)
    if df.empty:
        return df
        
    # Example minimal feature engineering logic
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    
    # Fill missing weather defaults
    if 'temperature' not in df.columns:
        df['temperature'] = 25.0
    if 'humidity' not in df.columns:
        df['humidity'] = 60.0
        
    return df
