"""
Date Lookup API Endpoint
========================
Endpoint: GET /api/date-lookup?date=YYYY-MM-DD
and GET /api/v1/date-lookup?date=YYYY-MM-DD
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Any
from app.services.date_lookup_service import date_lookup_service

router = APIRouter()

@router.get("")
async def lookup_date(
    date: str = Query(..., description="Target date in YYYY-MM-DD format (e.g. 2024-08-01)"),
    region: str = Query("national", description="Grid region (national, northern, etc.)")
) -> Any:
    """
    Looks up load data for a specific date:
    - Past dates (< today): Returns recorded values from historical dataset (source: historical)
    - Current/Future dates (>= today): Returns AI model predictions (source: predicted)
    """
    try:
        return await date_lookup_service.lookup_date(date, region)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
