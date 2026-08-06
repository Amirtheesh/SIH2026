from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AlertBase(BaseModel):
    region: str
    alert_type: str
    status: str
    prediction_id: Optional[int] = None

class AlertCreate(AlertBase):
    triggered_at: datetime

class AlertResponse(AlertBase):
    id: int
    triggered_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
