"""
Anomaly Detection API Endpoints
"""
from fastapi import APIRouter, Query
from typing import Any

from app.services.prediction_service import prediction_service
from app.ml.anomaly_detector import anomaly_detector

router = APIRouter()


@router.get("/{region}")
async def detect_anomalies(
    region: str,
    horizon: str = Query("24h", description="Forecast horizon to analyze"),
) -> Any:
    """
    Runs anomaly detection on the forecast for the given region.
    Returns detected anomalies with type, severity, and explanations.
    """
    forecast = await prediction_service.predict_horizon(region, horizon)
    loads = [p["load_mw"] for p in forecast["points"]]
    timestamps = [p["ts"] for p in forecast["points"]]

    return anomaly_detector.detect_anomalies(
        predictions=loads,
        timestamps=timestamps,
        region=region,
    )
