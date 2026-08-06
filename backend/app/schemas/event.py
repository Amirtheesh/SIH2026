from pydantic import BaseModel
from datetime import date
from typing import Optional

class EventBase(BaseModel):
    region: str
    date: date
    event_type: str
    description: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int

    class Config:
        from_attributes = True
