"""
Analytics API Endpoints
"""
from fastapi import APIRouter
from typing import Any

from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/{region}/accuracy")
async def get_accuracy(region: str) -> Any:
    """
    Returns model performance metrics (MAE, RMSE, MAPE) for the region.
    """
    return await analytics_service.get_accuracy_metrics(region)


@router.get("/{region}/distribution")
async def get_distribution(region: str) -> Any:
    """
    Returns load distribution patterns by hour, day, and season.
    """
    return await analytics_service.get_load_distribution(region)


@router.get("/{region}/feature-importance")
async def get_feature_importance(region: str) -> Any:
    """
    Returns feature importance rankings from the XGBoost model.
    Shows which factors most influence predictions.
    """
    return await analytics_service.get_feature_importance(region)


@router.get("/{region}/trends")
async def get_trends(region: str) -> Any:
    """
    Returns trend analysis comparing different forecast horizons.
    """
    return await analytics_service.get_trends(region)
