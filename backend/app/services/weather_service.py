import httpx
import json
import redis.asyncio as redis
import random
from datetime import datetime
from typing import Dict, Any
from app.core.config import settings

class WeatherService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.api_key = settings.OPENWEATHER_API_KEY
        
        # Region to coordinates mapping (lat, lon)
        self.coords = {
            "northern": (28.6139, 77.2090), # Delhi
            "southern": (12.9716, 77.5946), # Bangalore
            "western": (19.0760, 72.8777),  # Mumbai
            "eastern": (22.5726, 88.3639),  # Kolkata
            "national": (20.5937, 78.9629)  # India center
        }

    def _get_mock_data(self, region_key: str) -> Dict[str, Any]:
        """Generates realistic mock data based on hour and region profile."""
        hour = datetime.now().hour
        # Diurnal temp variation profile
        base_temp = {"northern": 32.0, "southern": 28.0, "western": 30.0, "eastern": 29.0, "national": 29.5}.get(region_key, 25.0)
        temp_factor = -5.0 if hour < 6 or hour > 20 else (2.0 if 10 <= hour <= 16 else 0.0)
        
        return {
            "temperature": base_temp + temp_factor + random.uniform(-1.5, 1.5),
            "humidity": 70.0 if hour > 18 else 50.0,
            "rainfall": 0.0,
            "wind_speed": 3.5,
            "solar_radiation": 900.0 if 8 <= hour <= 17 else 0.0,
            "aqi": 150.0 if region_key == "northern" else 85.0
        }

    async def get_current_weather(self, region: str) -> Dict[str, Any]:
        """
        Fetches current weather for a region, caching it in Redis for 15 minutes.
        If the API key is not configured or rate limits are hit, returns mock data.
        """
        cache_key = f"weather:{region.lower()}"
        cached = await self.redis_client.get(cache_key)
        
        if cached:
            return json.loads(cached)
            
        region_key = region.lower()
        if region_key not in self.coords:
            region_key = "national"
            
        lat, lon = self.coords[region_key]
        
        weather_data = None
        
        # Try fetching from real API if key exists
        if self.api_key:
            try:
                async with httpx.AsyncClient() as client:
                    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
                    response = await client.get(url, timeout=5.0)
                    if response.status_code == 200:
                        data = response.json()
                        weather_data = {
                            "temperature": data["main"]["temp"],
                            "humidity": data["main"]["humidity"],
                            "rainfall": data.get("rain", {}).get("1h", 0.0),
                            "wind_speed": data["wind"]["speed"],
                            "solar_radiation": 800.0 if data["weather"][0]["main"] == "Clear" else 400.0,
                            "aqi": 110.0
                        }
            except Exception as e:
                print(f"Weather API fetch failed: {e}")
                
        # Fallback to realistic mock data if API fails or no key
        if not weather_data:
            weather_data = self._get_mock_data(region_key)
            
        # Cache for 15 minutes
        await self.redis_client.setex(cache_key, 900, json.dumps(weather_data))
        
        return weather_data

weather_service = WeatherService()
