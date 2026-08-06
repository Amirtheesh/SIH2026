from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date

from app.models.event import Event
from app.schemas.event import EventCreate

class EventService:
    async def get_events(self, db: AsyncSession, region: Optional[str] = None, date_range: Optional[str] = None) -> List[Event]:
        query = select(Event)
        if region:
            query = query.where(Event.region == region)
        # Note: date_range parsing would go here, omitting for hackathon simplicity unless specified
        
        result = await db.execute(query)
        return list(result.scalars().all())

event_service = EventService()
