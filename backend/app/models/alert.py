from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from app.db.session import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    region = Column(String, index=True)
    alert_type = Column(String) # high_load / low_load / spike
    triggered_at = Column(DateTime)
    resolved_at = Column(DateTime, nullable=True)
    status = Column(String)
    prediction_id = Column(BigInteger, ForeignKey("predictions.id"))
