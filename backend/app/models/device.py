from sqlalchemy import Column, Integer, String, DateTime

from app.database import Base


class DeviceActivity(Base):
    __tablename__ = "device_activities"

    # Internal Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Original CERT Event ID
    event_id = Column(String(50), unique=True, nullable=False, index=True)

    # Event Timestamp
    event_time = Column(DateTime, nullable=False)

    # CERT User ID
    user_id = Column(String(20), nullable=False, index=True)

    # Computer Name
    pc = Column(String(50), nullable=False)

    # Device Activity
    activity = Column(String(100), nullable=False)