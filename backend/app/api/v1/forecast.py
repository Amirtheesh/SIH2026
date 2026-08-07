"""
Forecast API Endpoints
"""
from fastapi import APIRouter, Depends, Query
from typing import Any
from app.services.prediction_service import prediction_service
from app.services.explain_service import explain_service
from app.services.peak_risk_service import peak_risk_service
from app.schemas.whatif import WhatIfRequest, WhatIfResponse

router = APIRouter()


@router.get("/{region}")
async def get_forecast(
    region: str,
    horizon: str = Query("24h", description="Forecast horizon: 1h, 6h, 24h, 48h, 168h"),
) -> Any:
    """
    Returns multi-horizon electricity demand forecast for the given region.
    Uses trained XGBoost model with weather and event awareness.
    """
    return await prediction_service.predict_horizon(region, horizon)


@router.get("/{region}/peak")
async def get_forecast_peak(region: str) -> Any:
    """
    Predicts daily peak demand with severity classification.
    Returns peak load, peak hour, utilization %, and severity level.
    """
    return await prediction_service.get_peak(region)


@router.get("/{region}/explain")
async def explain_forecast(
    region: str,
    horizon: str = Query("24h"),
) -> Any:
    """
    Explains the forecast using SHAP feature importance.
    Shows which features are driving the prediction.
    """
    return await explain_service.explain_forecast(region, horizon)


@router.get("/{region}/risk")
async def assess_peak_risk(
    region: str,
    horizon: int = Query(48, description="Hours to assess risk for (default: 48h)"),
) -> Any:
    """
    Assesses peak risk over the given horizon.
    Returns risk timeline with GREEN/YELLOW/ORANGE/RED levels
    and actionable recommendations.
    """
    return await peak_risk_service.assess_risk(region, horizon)


@router.post("/{region}/what-if")
async def simulate_what_if(
    region: str,
    request: WhatIfRequest,
) -> Any:
    """
    Runs scenario-based what-if analysis with real model inference.
    Compare baseline vs modified conditions (temperature, events, etc.)
    """
    return await prediction_service.simulate_what_if(region, request.model_dump())
