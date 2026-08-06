from sqlalchemy import Column, BigInteger, String, DateTime, Float
from app.db.session import Base

class Weather(Base):
    __tablename__ = "weather"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    region = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    rainfall = Column(Float)
    wind_speed = Column(Float)
    solar_radiation = Column(Float)
    aqi = Column(Float)
