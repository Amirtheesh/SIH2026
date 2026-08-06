from sqlalchemy import Column, Integer, String, Date
from app.db.session import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    region = Column(String, index=True)
    date = Column(Date, index=True)
    event_type = Column(String) # holiday / festival / match / political / concert
    description = Column(String)
