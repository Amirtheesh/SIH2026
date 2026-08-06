from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.event import EventResponse
from app.services.event_service import event_service

router = APIRouter()

@router.get("", response_model=List[EventResponse])
async def get_events(
    region: Optional[str] = None,
    date_range: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await event_service.get_events(db, region, date_range)
