from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import uuid
from datetime import datetime

# Import centralized role dependencies from deps.py
from app.api.deps import require_admin
from app.db.session import get_db
from app.schemas.admin import ApiKeyCreate, ApiKeyResponse, ModelMetricsResponse, SystemHealthResponse
from app.services.admin_service import admin_service
from app.models.user import User

router = APIRouter()

# NOTE: require_admin is now imported from app.api.deps (not defined locally).
# Every endpoint in this router uses require_admin — no endpoint is accessible
# without a valid JWT belonging to a user with role='admin' in the database.

@router.post("/keys", response_model=Dict[str, Any])
async def create_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_key, raw_key = await admin_service.create_api_key(db, current_user.id, data)
    return {
        "id": db_key.id,
        "label": db_key.label,
        "key_hash": raw_key,
        "created_at": db_key.created_at,
        "rate_limit_per_min": db_key.rate_limit_per_min
    }

@router.get("/keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    keys = await admin_service.list_api_keys(db, current_user.id)
    return keys

@router.delete("/keys/{key_id}")
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    success = await admin_service.delete_api_key(db, key_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"message": "Key deleted successfully"}

@router.get("/model/metrics", response_model=ModelMetricsResponse)
async def get_model_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    metrics = await admin_service.get_model_metrics(db)
    if not metrics:
        return {
            "version": "v1.0.0 (mock)",
            "mae": 1.2,
            "rmse": 1.8,
            "mape": 0.02,
            "last_trained": datetime.utcnow()
        }
    return {
        "version": metrics.model_version,
        "mae": metrics.mae,
        "rmse": metrics.rmse,
        "mape": metrics.mape,
        "last_trained": metrics.trained_at
    }

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: User = Depends(require_admin)
):
    return {
        "scada": "Syncing Live",
        "meteorological": "Synced 5m ago"
    }

@router.post("/model/retrain")
async def trigger_retrain(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    log = await admin_service.trigger_retrain(db)
    return {"message": "Retraining triggered successfully", "version": log.model_version}
