from sqlalchemy import Column, BigInteger, String, DateTime, Float
from app.db.session import Base
from datetime import datetime

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    region = Column(String, index=True) # Logical FK to historical_data.region
    predicted_for = Column(DateTime, index=True)
    horizon = Column(String)
    predicted_load = Column(Float)
    confidence_low = Column(Float)
    confidence_high = Column(Float)
    model_version = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
