from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import uuid
from datetime import datetime

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.admin import ApiKeyCreate, ApiKeyResponse, ModelMetricsResponse
from app.services.admin_service import admin_service
from app.models.user import User

router = APIRouter()

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.post("/keys", response_model=Dict[str, Any])
async def create_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_key, raw_key = await admin_service.create_api_key(db, current_user.id, data)
    
    # We must return the raw key only once
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
    # The frontend expects a list of keys
    keys = await admin_service.list_api_keys(db, current_user.id)
    # the frontend expects 'key' not 'key_hash' for the masked string in some implementations, but schemas matches 'key_hash'
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
        # Return dummy if none exist
        return {
            "version": "v1.0.0 (mock)",
            "mae": 1.2,
            "rmse": 1.8,
            "mape": 0.02,
            "last_trained": datetime.utcnow()
        }
    return metrics

@router.post("/model/retrain")
async def trigger_retrain(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    log = await admin_service.trigger_retrain(db)
    return {"message": "Retraining triggered successfully", "version": log.model_version}
