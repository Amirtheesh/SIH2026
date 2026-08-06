from sqlalchemy import Column, Integer, String, DateTime, Float
from app.db.session import Base

class ModelLog(Base):
    __tablename__ = "model_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version = Column(String)
    trained_at = Column(DateTime)
    mae = Column(Float)
    rmse = Column(Float)
    mape = Column(Float)
    notes = Column(String, nullable=True)
