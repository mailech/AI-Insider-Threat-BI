"""
ITBIS — Per-employee behavioral baseline matrix (Milestone 2)

Persists typical login hours and average download/upload volumes to:
  • PostgreSQL ``behavioral_baselines``
  • MongoDB ``employee_behavioral_baselines``
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.models.domain import BehavioralBaseline, Employee

logger = logging.getLogger(__name__)

_LOGIN_TYPES = {"LOGIN", "LOGON", "LOGIN_ATTEMPT", "REMOTE_ACCESS", "VPN_LOGIN"}
_DOWNLOAD_TYPES = {"FILE_DOWNLOAD", "DATA_TRANSFER", "LARGE_DOWNLOAD", "FILE_ACCESS"}
_UPLOAD_TYPES = {"FILE_UPLOAD", "DATA_EXFILTRATION"}


def _to_utc(ts: Any) -> datetime | None:
    if not isinstance(ts, datetime):
        return None
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def _payload_mb(payload: dict[str, Any]) -> float:
    if not payload:
        return 0.0
    if payload.get("size_mb") is not None:
        return float(payload["size_mb"])
    if payload.get("file_size_bytes") is not None:
        return float(payload["file_size_bytes"]) / (1024.0 * 1024.0)
    if payload.get("bytes_transferred") is not None:
        return float(payload["bytes_transferred"]) / (1024.0 * 1024.0)
    if payload.get("bytes") is not None:
        return float(payload["bytes"]) / (1024.0 * 1024.0)
    return 0.0


def compute_behavioral_profile(
    logs: list[dict[str, Any]],
    window_days: int,
) -> dict[str, Any]:
    """
    Derive a stable baseline profile from telemetry:
    typical weekday login hours and mean daily download/upload volume.
    """
    days = max(1, int(window_days))
    login_hours: list[int] = []
    download_mb = 0.0
    upload_mb = 0.0
    login_count = 0

    for doc in logs:
        event_type = str(doc.get("event_type", "")).upper()
        payload = doc.get("payload") or {}
        ts = _to_utc(doc.get("timestamp"))

        if event_type in _LOGIN_TYPES:
            failed = payload.get("status") == "FAILED" or payload.get("success") is False
            if not failed:
                login_count += 1
                if ts is not None and ts.weekday() < 5:
                    login_hours.append(ts.hour)

        if event_type in _DOWNLOAD_TYPES:
            download_mb += _payload_mb(payload)
        if event_type in _UPLOAD_TYPES:
            upload_mb += _payload_mb(payload)

    histogram = {str(h): 0 for h in range(24)}
    for hour in login_hours:
        histogram[str(hour)] += 1

    if login_hours:
        sorted_hours = sorted(login_hours)
        start = sorted_hours[max(0, int(len(sorted_hours) * 0.10))]
        end = sorted_hours[min(len(sorted_hours) - 1, int(len(sorted_hours) * 0.90))]
        peak = Counter(login_hours).most_common(1)[0][0]
        if start > end:
            start, end = 8, 18
    else:
        start, end, peak = 8, 18, 9

    return {
        "typical_login_hour_start": int(start),
        "typical_login_hour_end": int(end),
        "peak_login_hour": int(peak),
        "avg_download_mb_per_day": round(download_mb / days, 4),
        "avg_upload_mb_per_day": round(upload_mb / days, 4),
        "avg_daily_logins": round(login_count / days, 4),
        "sample_event_count": len(logs),
        "window_days": days,
        "login_hour_histogram": histogram,
    }


def upsert_postgres_baseline(
    db: Session,
    employee: Employee,
    profile: dict[str, Any],
) -> BehavioralBaseline:
    row: BehavioralBaseline | None = (
        db.query(BehavioralBaseline)
        .filter(BehavioralBaseline.employee_id == employee.id)
        .first()
    )
    now = datetime.utcnow()
    if row is None:
        row = BehavioralBaseline(employee_id=employee.id)
        db.add(row)

    row.typical_login_hour_start = int(profile["typical_login_hour_start"])
    row.typical_login_hour_end = int(profile["typical_login_hour_end"])
    row.peak_login_hour = int(profile["peak_login_hour"])
    row.avg_download_mb_per_day = float(profile["avg_download_mb_per_day"])
    row.avg_upload_mb_per_day = float(profile["avg_upload_mb_per_day"])
    row.avg_daily_logins = float(profile["avg_daily_logins"])
    row.sample_event_count = int(profile["sample_event_count"])
    row.window_days = int(profile["window_days"])
    row.login_hour_histogram = profile.get("login_hour_histogram")
    row.updated_at = now
    db.commit()
    db.refresh(row)
    return row


async def persist_user_baseline(
    emp: Employee,
    logs: list[dict[str, Any]],
    db: Session,
    mdb: AsyncIOMotorDatabase,
    window_days: int,
) -> dict[str, Any]:
    """Compute, persist, and return the behavioral baseline profile."""
    profile = compute_behavioral_profile(logs, window_days)
    try:
        upsert_postgres_baseline(db, emp, profile)
    except Exception as exc:
        db.rollback()
        logger.warning("PostgreSQL baseline persist failed for %s: %s", emp.emp_id, exc)

    mongo_doc = {
        "emp_id": emp.emp_id,
        "employee_db_id": emp.id,
        **profile,
        "updated_at": datetime.now(timezone.utc),
    }
    try:
        await mdb["employee_behavioral_baselines"].update_one(
            {"emp_id": emp.emp_id},
            {"$set": mongo_doc},
            upsert=True,
        )
    except Exception as exc:
        logger.warning("MongoDB baseline persist failed for %s: %s", emp.emp_id, exc)

    return profile
