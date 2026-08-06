from sqlalchemy import Column, BigInteger, String, DateTime, Float
from app.db.session import Base

class HistoricalData(Base):
    __tablename__ = "historical_data"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    region = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    load_mw = Column(Float)
    sector = Column(String, nullable=True)
    source = Column(String, nullable=True)
