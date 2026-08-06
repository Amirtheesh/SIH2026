from fastapi import APIRouter, Depends, Query
from typing import Any
from app.services.prediction_service import prediction_service
from app.services.weather_service import weather_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/{region}")
async def get_forecast(
    region: str,
    horizon: str = Query("24h"),
    current_user = Depends(get_current_user)
) -> Any:
    # Feature 3: Weather-Aware Forecasting
    # Pull live (or realistic typical) weather for this region and feed it
    # into the ML model as input features.
    weather = await weather_service.get_current_weather(region)
    return await prediction_service.predict_horizon(
        region,
        horizon,
        temperature_override=weather.get("temperature"),
        humidity_override=weather.get("humidity"),
    )

from app.services.explain_service import explain_service
from app.services.prediction_service import prediction_service

@router.get("/{region}/peak")
async def get_forecast_peak(
    region: str,
    current_user = Depends(get_current_user)
) -> Any:
    return await prediction_service.get_peak(region)

@router.get("/{region}/explain")
async def explain_forecast(
    region: str,
    horizon: str = Query("24h"),
    current_user = Depends(get_current_user)
) -> Any:
    return await explain_service.explain_forecast(region, horizon)

from app.schemas.whatif import WhatIfRequest, WhatIfResponse

@router.post("/{region}/what-if", response_model=WhatIfResponse)
async def simulate_what_if(
    region: str,
    request: WhatIfRequest,
    current_user = Depends(get_current_user)
) -> Any:
    return await prediction_service.simulate_what_if(region, request.model_dump())


