import httpx
import json
import redis.asyncio as redis
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
                            "solar_radiation": 800.0, # Mocked as OpenWeather doesn't provide this on free tier
                            "aqi": 110.0 # Mocked
                        }
            except Exception as e:
                print(f"Weather API fetch failed: {e}")
                pass
                
        # Fallback to realistic mock data if API fails or no key
        if not weather_data:
            weather_data = {
                "temperature": 32.5 if region_key == "southern" else 38.0,
                "humidity": 65.0,
                "rainfall": 0.0,
                "wind_speed": 4.2,
                "solar_radiation": 850.0,
                "aqi": 150.0 if region_key == "northern" else 85.0
            }
            
        # Cache for 15 minutes
        await self.redis_client.setex(cache_key, 900, json.dumps(weather_data))
        
        return weather_data

weather_service = WeatherService()
