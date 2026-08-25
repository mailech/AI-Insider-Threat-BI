from sqlalchemy import Column, Integer, String, DateTime, Text

from app.database import Base


class EmailActivity(Base):
    __tablename__ = "email_activities"

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

    # Email Sender
    sender = Column(String(255), nullable=False)

    # Email Recipients
    recipient_to = Column(String(500))
    recipient_cc = Column(String(500))
    recipient_bcc = Column(String(500))

    # Email Information
    email_size = Column(Integer)

    # Attachments (stored as text until dataset import confirms type)
    attachments = Column(String(255))

    # Email Body
    content = Column(Text)