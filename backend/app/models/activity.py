from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, nullable=False)
    activity_type = Column(String, nullable=False)
    file_name = Column(String, nullable=True)
    device = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)