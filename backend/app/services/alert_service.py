from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime

from app.models.alert import Alert

class AlertService:
    async def get_alerts(self, db: AsyncSession, status: Optional[str] = None) -> List[Alert]:
        query = select(Alert)
        if status:
            query = query.where(Alert.status == status)
        query = query.order_by(Alert.triggered_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())

    async def resolve_alert(self, db: AsyncSession, alert_id: int) -> Optional[Alert]:
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalars().first()
        if alert:
            alert.status = "RESOLVED"
            alert.resolved_at = datetime.utcnow()
            await db.commit()
            await db.refresh(alert)
        return alert

    async def check_thresholds(self, prediction_data: dict, db: AsyncSession):
        """
        Runs after a prediction is made. 
        Checks for anomalies (e.g., predicted_load > threshold) and writes to DB.
        """
        # Hackathon mock logic
        # In prod: compare against 95th percentile historical values
        pass

alert_service = AlertService()
