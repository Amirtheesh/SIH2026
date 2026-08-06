from fastapi import APIRouter, Depends
from typing import Any
from app.services.weather_service import weather_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/{region}")
async def get_weather(
    region: str,
    current_user = Depends(get_current_user)
) -> Any:
    return await weather_service.get_current_weather(region)
