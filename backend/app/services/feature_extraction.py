"""
ITBIS — Feature Engineering & Extraction Service (Milestone 2 - Step 2)
=======================================================================
Extracts quantitative, ML-ready behavioral feature vectors from raw telemetry logs
stored in MongoDB activity_logs over a configurable sliding time window.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.domain import Employee
from app.schemas.features import EmployeeFeatureVector

logger = logging.getLogger(__name__)

COLLECTION_NAME = "activity_logs"


def _compute_vector_from_logs(
    employee_id: str,
    window_days: int,
    logs: List[Dict[str, Any]],
) -> EmployeeFeatureVector:
    """
    Pure compute helper to transform a list of MongoDB telemetry log documents
    into an EmployeeFeatureVector.
    """
    off_hours_logon = 0
    total_download_mb = 0.0
    total_upload_mb = 0.0
    usb_connects = 0
    external_emails = 0
    priv_escalations = 0
    failed_logons = 0
    critical_events = 0

    for doc in logs:
        event_type = str(doc.get("event_type", "")).upper()
        severity = str(doc.get("severity", "INFO")).upper()
        payload = doc.get("payload") or {}
        ts: Optional[datetime] = doc.get("timestamp")

        # 1. Critical Events
        if severity == "CRITICAL":
            critical_events += 1

        # 2. Off-Hours Logon Count
        if event_type in ("LOGON", "LOGIN", "REMOTE_ACCESS"):
            is_off_hours = False
            if payload.get("work_hours") is False or payload.get("off_hours") is True:
                is_off_hours = True
            elif ts is not None and isinstance(ts, datetime):
                # Check UTC hour (< 08:00 or >= 18:00) or weekend (Saturday=5, Sunday=6)
                if ts.hour < 8 or ts.hour >= 18 or ts.weekday() >= 5:
                    is_off_hours = True
            if is_off_hours and payload.get("status") != "FAILED":
                off_hours_logon += 1

        # 3. Failed Logon Count
        if event_type in ("LOGON", "LOGIN", "LOGIN_ATTEMPT"):
            if payload.get("status") == "FAILED" or payload.get("success") is False:
                failed_logons += int(payload.get("attempts") or 1)

        # 4. File Downloads & Data Transfers (MB)
        if event_type in ("FILE_DOWNLOAD", "DATA_TRANSFER", "LARGE_DOWNLOAD", "FILE_ACCESS"):
            if "size_mb" in payload and payload["size_mb"] is not None:
                total_download_mb += float(payload["size_mb"])
            elif "file_size_bytes" in payload and payload["file_size_bytes"] is not None:
                total_download_mb += float(payload["file_size_bytes"]) / (1024.0 * 1024.0)
            elif "bytes_transferred" in payload and payload["bytes_transferred"] is not None:
                total_download_mb += float(payload["bytes_transferred"]) / (1024.0 * 1024.0)

        # 5. File Uploads & Exfiltrations (MB)
        if event_type in ("FILE_UPLOAD", "DATA_EXFILTRATION"):
            if "size_mb" in payload and payload["size_mb"] is not None:
                total_upload_mb += float(payload["size_mb"])
            elif "file_size_bytes" in payload and payload["file_size_bytes"] is not None:
                total_upload_mb += float(payload["file_size_bytes"]) / (1024.0 * 1024.0)
            elif "bytes_transferred" in payload and payload["bytes_transferred"] is not None:
                total_upload_mb += float(payload["bytes_transferred"]) / (1024.0 * 1024.0)

        # 6. USB / Removable Storage Device Connects
        if event_type in ("DEVICE", "USB_INSERTED"):
            activity = str(payload.get("activity", "")).lower()
            if activity in ("connect", "inserted") or event_type == "USB_INSERTED":
                usb_connects += 1
            elif not activity and payload.get("device_type", "").startswith(("USB", "EXTERNAL")):
                usb_connects += 1

        # 7. External Email Activity
        if event_type in ("EMAIL_ACTIVITY", "EMAIL_FORWARD", "EMAIL_EXFILTRATION"):
            is_external = payload.get("external_recipient") is True or payload.get("is_bcc_exfiltration") is True
            if not is_external:
                recipients = payload.get("recipients") or []
                if isinstance(recipients, list):
                    for r in recipients:
                        if isinstance(r, str) and not r.endswith(("@itbis.com", "@corp.internal", "@itbis.internal")):
                            is_external = True
                            break
            if is_external:
                external_emails += 1

        # 8. Privilege Escalations
        if event_type in ("PRIVILEGE_CHANGE", "PRIVILEGE_ESCALATION"):
            is_suspicious_priv = (
                payload.get("approved") is False
                or payload.get("method") in ("sudo_abuse", "token_impersonation", "unauthorized_group_add", "pam_bypass")
                or payload.get("action") in ("ELEVATE_TO_ADMIN", "SUDO_ACCESS", "POLICY_OVERRIDE")
                or severity in ("CRITICAL", "HIGH")
            )
            if is_suspicious_priv:
                priv_escalations += 1

    return EmployeeFeatureVector(
        employee_id=employee_id,
        window_days=window_days,
        off_hours_logon_count=off_hours_logon,
        total_file_download_mb=round(total_download_mb, 2),
        total_file_upload_mb=round(total_upload_mb, 2),
        usb_device_connect_count=usb_connects,
        external_email_count=external_emails,
        privilege_escalation_count=priv_escalations,
        failed_logon_count=failed_logons,
        critical_event_count=critical_events,
    )


async def extract_employee_features(
    employee_id: str,
    window_days: int = 14,
    mdb: Optional[AsyncIOMotorDatabase] = None,
) -> EmployeeFeatureVector:
    """
    Extracts the feature vector for a single employee from MongoDB activity_logs
    over the trailing `window_days` days.
    """
    since_utc = datetime.now(timezone.utc) - timedelta(days=window_days)
    owns_client = False
    client = None

    if mdb is None:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        mdb = client[settings.MONGO_DB_NAME]
        owns_client = True

    try:
        cursor = mdb[COLLECTION_NAME].find(
            {
                "emp_id": employee_id,
                "timestamp": {"$gte": since_utc},
            },
            {
                "_id": 0,
                "event_type": 1,
                "severity": 1,
                "payload": 1,
                "timestamp": 1,
            },
        ).sort("timestamp", 1)

        logs: List[Dict[str, Any]] = await cursor.to_list(length=100_000)
        return _compute_vector_from_logs(employee_id, window_days, logs)
    finally:
        if owns_client and client:
            client.close()


async def extract_all_employee_features(
    window_days: int = 14,
    db: Optional[Session] = None,
    mdb: Optional[AsyncIOMotorDatabase] = None,
) -> List[EmployeeFeatureVector]:
    """
    Extracts feature vectors for all active employees present in PostgreSQL.
    """
    owns_db = False
    if db is None:
        db = SessionLocal()
        owns_db = True

    owns_client = False
    client = None
    if mdb is None:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        mdb = client[settings.MONGO_DB_NAME]
        owns_client = True

    try:
        employees: List[Employee] = db.query(Employee).order_by(Employee.id.asc()).all()
        if not employees:
            logger.warning("No employees found in PostgreSQL.")
            return []

        since_utc = datetime.now(timezone.utc) - timedelta(days=window_days)

        # Batch query all logs in the window to optimize round trips
        cursor = mdb[COLLECTION_NAME].find(
            {"timestamp": {"$gte": since_utc}},
            {
                "_id": 0,
                "emp_id": 1,
                "event_type": 1,
                "severity": 1,
                "payload": 1,
                "timestamp": 1,
            },
        ).sort("timestamp", 1)

        all_logs: List[Dict[str, Any]] = await cursor.to_list(length=200_000)

        # Group logs by emp_id
        logs_by_emp: Dict[str, List[Dict[str, Any]]] = {}
        for l in all_logs:
            emp_id = l.get("emp_id")
            if emp_id:
                logs_by_emp.setdefault(emp_id, []).append(l)

        # Compute feature vectors
        vectors: List[EmployeeFeatureVector] = []
        for emp in employees:
            emp_logs = logs_by_emp.get(emp.emp_id, [])
            vec = _compute_vector_from_logs(emp.emp_id, window_days, emp_logs)
            vectors.append(vec)

        return vectors
    finally:
        if owns_db and db:
            db.close()
        if owns_client and client:
            client.close()


def extract_employee_features_sync(
    employee_id: str,
    window_days: int = 14,
) -> EmployeeFeatureVector:
    """Synchronous helper for scripts and worker threads."""
    return asyncio.run(extract_employee_features(employee_id, window_days))


def extract_all_employee_features_sync(
    window_days: int = 14,
) -> List[EmployeeFeatureVector]:
    """Synchronous helper for scripts and worker threads."""
    return asyncio.run(extract_all_employee_features(window_days))
