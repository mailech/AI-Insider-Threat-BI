"""Feature extraction from stored activity history.

Produces exactly the five features the Isolation Forest model was trained on.
"""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.activity import ActivityLog, ActivityType

AFTER_HOURS_START = 19  # 19:00 and later counts as after hours
AFTER_HOURS_END = 7  # before 07:00 counts as after hours

USB_KEYWORDS = ("usb", "removable", "external drive", "thumb drive")


def is_after_hours(moment: datetime) -> bool:
    hour = moment.hour
    return hour >= AFTER_HOURS_START or hour < AFTER_HOURS_END


def _is_usb_event(log: ActivityLog) -> bool:
    haystack = " ".join(
        part.lower() for part in (log.device, log.source, log.details or "") if part
    )
    return log.activity_type == ActivityType.DEVICE_USAGE or any(
        keyword in haystack for keyword in USB_KEYWORDS
    )


def extract_features(
    db: Session, employee_id: uuid.UUID, lookback_days: int = 30
) -> dict[str, float]:
    """Aggregate an employee's recent activity into model features."""
    since = utcnow() - timedelta(days=lookback_days)
    logs = list(
        db.scalars(
            select(ActivityLog).where(
                ActivityLog.employee_id == employee_id,
                ActivityLog.timestamp >= since,
            )
        )
    )

    features = {
        "logon_count": 0.0,
        "after_hours_logon_count": 0.0,
        "usb_connect_count": 0.0,
        "file_copy_count": 0.0,
        "email_count": 0.0,
    }

    for log in logs:
        if log.activity_type in (ActivityType.LOGIN, ActivityType.REMOTE_ACCESS):
            features["logon_count"] += 1
            if is_after_hours(log.timestamp):
                features["after_hours_logon_count"] += 1
        if log.activity_type == ActivityType.EMAIL:
            features["email_count"] += 1
        if log.activity_type in (
            ActivityType.FILE_DOWNLOAD,
            ActivityType.FILE_UPLOAD,
            ActivityType.DATA_TRANSFER,
        ):
            features["file_copy_count"] += 1
        if _is_usb_event(log):
            features["usb_connect_count"] += 1

    return features
