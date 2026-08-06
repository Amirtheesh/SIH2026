from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ApiKeyCreate(BaseModel):
    label: str

class ApiKeyResponse(BaseModel):
    id: UUID
    label: str
    key_hash: str # Note: In real life we'd show the raw key ONCE and never again, but for mock purposes we'll return a mock string
    created_at: datetime
    rate_limit_per_min: int

    class Config:
        from_attributes = True

class ModelMetricsResponse(BaseModel):
    version: str
    mae: float
    rmse: float
    mape: float
    last_trained: datetime
