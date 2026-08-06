from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
import hashlib

from app.models.api_key import ApiKey
from app.models.model_log import ModelLog
from app.schemas.admin import ApiKeyCreate

class AdminService:
    async def create_api_key(self, db: AsyncSession, user_id: uuid.UUID, data: ApiKeyCreate) -> tuple[ApiKey, str]:
        # Generate a real looking key
        raw_key = f"sk_test_{uuid.uuid4().hex}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        db_key = ApiKey(
            user_id=user_id,
            label=data.label,
            key_hash=key_hash
        )
        db.add(db_key)
        await db.commit()
        await db.refresh(db_key)
        
        return db_key, raw_key

    async def list_api_keys(self, db: AsyncSession, user_id: uuid.UUID) -> List[ApiKey]:
        result = await db.execute(select(ApiKey).where(ApiKey.user_id == user_id))
        return list(result.scalars().all())

    async def delete_api_key(self, db: AsyncSession, key_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await db.execute(
            select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
        )
        key = result.scalars().first()
        if key:
            await db.delete(key)
            await db.commit()
            return True
        return False

    async def get_model_metrics(self, db: AsyncSession) -> Optional[ModelLog]:
        # Get latest
        result = await db.execute(select(ModelLog).order_by(ModelLog.trained_at.desc()).limit(1))
        return result.scalars().first()

    async def trigger_retrain(self, db: AsyncSession):
        """
        Mock retrain. In prod, this fires a celery task.
        """
        import asyncio
        from datetime import datetime
        
        # Simulate delay
        await asyncio.sleep(2)
        
        log = ModelLog(
            model_version=f"v{datetime.utcnow().timestamp()}",
            trained_at=datetime.utcnow(),
            mae=1.5,
            rmse=2.1,
            mape=0.03,
            notes="Manual retrain"
        )
        db.add(log)
        await db.commit()
        return log

admin_service = AdminService()
