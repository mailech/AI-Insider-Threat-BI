from sqlalchemy import Column, Integer, String, DateTime

from app.database import Base


class LogonActivity(Base):
    __tablename__ = "logon_activities"

    # Internal Database Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Original CERT Event ID
    event_id = Column(String(50), unique=True, nullable=False, index=True)

    # User ID from CERT Dataset
    user_id = Column(String(20), nullable=False, index=True)

    # Computer Name
    pc = Column(String(50), nullable=False)

    # Logon / Logoff
    activity = Column(String(20), nullable=False)

    # Event Timestamp
    event_time = Column(DateTime, nullable=False)