from pydantic import BaseModel
from typing import Optional

class WhatIfRequest(BaseModel):
    temperature_offset: float = 0.0
    humidity_offset: float = 0.0
    is_holiday: Optional[bool] = None

class WhatIfResponse(BaseModel):
    original_peak_mw: float
    new_peak_mw: float
    delta_mw: float
    delta_percentage: float
