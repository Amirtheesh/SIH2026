from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.alert import AlertResponse
from app.services.alert_service import alert_service

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
async def get_alerts(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await alert_service.get_alerts(db, status)

@router.put("/{id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alert = await alert_service.resolve_alert(db, id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
