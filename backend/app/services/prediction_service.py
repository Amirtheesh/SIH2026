import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

class PredictionService:
    @staticmethod
    async def predict_horizon(region: str, horizon: str = "24h") -> Dict[str, Any]:
        """
        Uses trained XGBoost model to predict future load. Falls back to mock if model is unavailable.
        """
        hours = 24
        if horizon.endswith('h'):
            hours = int(horizon[:-1])

        # Attempt to use real model
        try:
            from app.ml.model_loader import model_loader
            from app.ml.feature_pipeline import create_features
            import pandas as pd
            import numpy as np
            import logging
            
            logger = logging.getLogger(__name__)
            
            model = model_loader.get_model()
            peak_model = model_loader.get_peak_model()
            
            now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            
            # Generate raw input records for the horizon
            raw_data = []
            for i in range(hours):
                ts = now + timedelta(hours=i)
                # In production, fetch weather for this ts. For now, we omit it to let the pipeline use defaults.
                raw_data.append({
                    "timestamp": ts.isoformat() + "Z"
                })
                
            # Convert to feature matrix
            features_df = create_features(raw_data)
            
            # If feature_pipeline outputs a timestamp column, drop it before inference
            inference_df = features_df.copy()
            if 'timestamp' in inference_df.columns:
                inference_df = inference_df.drop(columns=['timestamp'])
                
            # Inference
            predictions = model.predict(inference_df)
            if peak_model:
                peak_preds = peak_model.predict(inference_df)
            else:
                peak_preds = predictions * 1.05 # Mock high band
                
            points = []
            for i in range(hours):
                load_mw = float(predictions[i])
                high_mw = float(peak_preds[i])
                low_mw = load_mw * 0.95
                
                points.append({
                    "ts": raw_data[i]["timestamp"],
                    "load_mw": round(load_mw),
                    "low": round(low_mw),
                    "high": round(high_mw)
                })
                
            return {
                "region": region,
                "points": points
            }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Real model inference failed, falling back to mock: {e}")
            
            # Fallback mock logic
            base_load_map = {
                "northern": 40000,
                "southern": 25000,
                "western": 35000,
                "eastern": 18000,
                "national": 150000
            }
            
            base_load = base_load_map.get(region.lower(), 50000)
            
            points = []
            now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            
            for i in range(hours):
                ts = now + timedelta(hours=i)
                hour_factor = math.sin((ts.hour - 7) / 24.0 * math.pi * 2) 
                noise = (hash(str(ts)) % 1000) / 1000.0
                load = base_load + (base_load * 0.2 * hour_factor) + (base_load * 0.02 * noise)
                
                points.append({
                    "ts": ts.isoformat() + "Z",
                    "load_mw": round(load),
                    "low": round(load * 0.95),
                    "high": round(load * 1.05)
                })
                
            return {
                "region": region,
                "points": points
            }
    
    @staticmethod
    async def get_peak(region: str) -> Dict[str, Any]:
        forecast = await PredictionService.predict_horizon(region, "24h")
        
        peak_point = max(forecast["points"], key=lambda p: p["load_mw"])
        return {
            "peak_time": peak_point["ts"],
            "peak_load_mw": peak_point["load_mw"]
        }

    @staticmethod
    async def simulate_what_if(region: str, params: dict) -> dict:
        original = await PredictionService.get_peak(region)
        original_peak = original["peak_load_mw"]
        
        # Simplified simulation logic
        # 1 degree temp offset = ~3% load increase
        # Holiday = -15% load decrease
        
        temp_delta = params.get("temperature_offset", 0.0)
        is_holiday = params.get("is_holiday", False)
        
        new_peak = original_peak * (1 + (temp_delta * 0.03))
        if is_holiday:
            new_peak *= 0.85
            
        new_peak = round(new_peak)
        
        return {
            "original_peak_mw": original_peak,
            "new_peak_mw": new_peak,
            "delta_mw": new_peak - original_peak,
            "delta_percentage": round(((new_peak - original_peak) / original_peak) * 100, 2)
        }

prediction_service = PredictionService()
