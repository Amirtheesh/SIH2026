import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

class PredictionService:
    @staticmethod
    async def predict_horizon(region: str, horizon: str = "24h") -> Dict[str, Any]:
        """
        Mock implementation of the prediction service for the hackathon.
        In production, this would:
        1. Fetch historical load + weather + events from DB/Redis.
        2. Format using ml/feature_pipeline.py.
        3. Run inference via ml_loader.get_model().
        4. Return scaled results.
        """
        # Parse horizon (e.g., '24h' -> 24 data points)
        hours = 24
        if horizon.endswith('h'):
            hours = int(horizon[:-1])
            
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
            # Create a realistic-looking diurnal load curve using sin wave
            # Peak around hour 19 (7 PM)
            hour_factor = math.sin((ts.hour - 7) / 24.0 * math.pi * 2) 
            
            # Add some noise
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
