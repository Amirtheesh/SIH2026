from pydantic import BaseModel
from typing import Optional

class WhatIfRequest(BaseModel):
    """Request body for scenario-based what-if analysis."""
    temperature_offset: float = 0.0
    humidity_offset: float = 0.0
    wind_speed: Optional[float] = None
    rainfall: Optional[float] = None
    is_holiday: Optional[bool] = None
    is_festival: Optional[bool] = None
    is_sports_event: Optional[bool] = None
    is_political_event: Optional[bool] = None
    scenario_name: Optional[str] = None  # Preset: heatwave, cold_wave, monsoon, etc.
    duration_hours: int = 24

class WhatIfResponse(BaseModel):
    """Response for what-if analysis — kept for backward compat."""
    original_peak_mw: float
    new_peak_mw: float
    delta_mw: float
    delta_percentage: float
