from sqlalchemy import Column, Integer, String, DateTime, Text

from app.database import Base


class FileActivity(Base):
    __tablename__ = "file_activities"

    # Internal Database Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Original CERT Event ID
    event_id = Column(String(50), unique=True, nullable=False, index=True)

    # Event Timestamp
    event_time = Column(DateTime, nullable=False)

    # CERT User ID
    user_id = Column(String(20), nullable=False, index=True)

    # Computer Name
    pc = Column(String(50), nullable=False)

    # File Name
    filename = Column(String(500), nullable=False)

    # File Content
    content = Column(Text)