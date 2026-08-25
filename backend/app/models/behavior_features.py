from sqlalchemy import Column, Integer, String, Float, DateTime

from app.database import Base


class EmployeeBehaviorFeatures(Base):

    __tablename__ = "employee_behavior_features"

    employee_id = Column(
        String(50),
        primary_key=True,
        index=True
    )

    total_logon_events = Column(
        Integer,
        default=0
    )

    logon_events = Column(
        Integer,
        default=0
    )

    logoff_events = Column(
        Integer,
        default=0
    )

    logon_unique_devices = Column(
        Integer,
        default=0
    )

    last_logon_activity = Column(
        DateTime,
        nullable=True
    )

    total_emails = Column(
        Integer,
        default=0
    )

    emails_with_attachments = Column(
        Integer,
        default=0
    )

    emails_without_attachments = Column(
        Integer,
        default=0
    )

    average_email_size = Column(
        Float,
        default=0
    )

    email_unique_devices = Column(
        Integer,
        default=0
    )

    last_email_activity = Column(
        DateTime,
        nullable=True
    )

    total_file_events = Column(
        Integer,
        default=0
    )

    unique_files = Column(
        Integer,
        default=0
    )

    file_unique_devices = Column(
        Integer,
        default=0
    )

    last_file_activity = Column(
        DateTime,
        nullable=True
    )

    total_http_events = Column(
        Integer,
        default=0
    )

    unique_websites = Column(
        Integer,
        default=0
    )

    http_unique_devices = Column(
        Integer,
        default=0
    )

    last_http_activity = Column(
        DateTime,
        nullable=True
    )

    total_device_events = Column(
        Integer,
        default=0
    )

    device_unique_devices = Column(
        Integer,
        default=0
    )

    device_activity_types = Column(
        Integer,
        default=0
    )

    last_device_activity = Column(
        DateTime,
        nullable=True
    )