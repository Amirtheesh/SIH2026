"""
Decision Support API Endpoints
"""
from fastapi import APIRouter
from typing import Any

from app.services.decision_service import decision_service

router = APIRouter()


@router.get("/{region}")
async def get_decisions(region: str) -> Any:
    """
    Returns comprehensive decision support package for grid operators.
    Combines forecast, peak risk, anomaly detection, and weather signals
    into prioritized recommendations.
    """
    return await decision_service.get_decisions(region)


@router.get("/{region}/summary")
async def get_decision_summary(region: str) -> Any:
    """
    Returns a concise executive summary for dashboard display.
    """
    return await decision_service.get_summary(region)
