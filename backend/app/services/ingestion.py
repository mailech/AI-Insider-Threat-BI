"""Activity log ingestion pipeline (module 3).

Accepts JSON batches, CSV uploads and CERT-style records, normalises them into
ActivityEvent rows, enriches derived flags and optionally triggers the detection
and risk scoring engines.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from dateutil import parser as date_parser
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml import anomaly as anomaly_engine
from app.ml import features as F
from app.ml import risk as risk_engine
from app.models.activity import ActivityEvent
from app.models.employee import Employee
from app.models.enums import ActivityType, LogSource
from app.schemas.activity import ActivityEventCreate
from app.services import alerts as alert_service

# Normalisation map for common log-source vocabularies (CERT / AD / DLP).
ACTIVITY_ALIASES: Dict[str, str] = {
    "logon": ActivityType.LOGIN.value,
    "logoff": ActivityType.LOGOUT.value,
    "logon_failed": ActivityType.FAILED_LOGIN.value,
    "4624": ActivityType.LOGIN.value,
    "4625": ActivityType.FAILED_LOGIN.value,
    "4672": ActivityType.PRIVILEGE_CHANGE.value,
    "file_copy": ActivityType.USB_FILE_COPY.value,
    "device_connect": ActivityType.USB_CONNECT.value,
    "http_upload": ActivityType.FILE_UPLOAD.value,
    "email": ActivityType.EMAIL_SENT.value,
    "vpn": ActivityType.VPN_SESSION.value,
    "access_denied": ActivityType.UNAUTHORIZED_ACCESS.value,
}

VALID_ACTIVITIES = {a.value for a in ActivityType}
VALID_SOURCES = {s.value for s in LogSource}


def normalise_activity(value: str) -> Optional[str]:
    key = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if key in VALID_ACTIVITIES:
        return key
    return ACTIVITY_ALIASES.get(key)


def resolve_employee(
    db: Session,
    cache: Dict[str, Optional[Employee]],
    employee_id: Optional[int],
    employee_code: Optional[str],
) -> Optional[Employee]:
    if employee_id is not None:
        key = f"id:{employee_id}"
        if key not in cache:
            cache[key] = db.execute(
                select(Employee).where(Employee.id == employee_id)
            ).scalar_one_or_none()
        return cache[key]
    if employee_code:
        key = f"code:{employee_code}"
        if key not in cache:
            cache[key] = db.execute(
                select(Employee).where(Employee.employee_code == employee_code)
            ).scalar_one_or_none()
        return cache[key]
    return None


def ingest_events(
    db: Session,
    payloads: List[ActivityEventCreate],
    run_detection: bool = True,
) -> Dict[str, Any]:
    """Persist a batch of events, then optionally detect, score and alert."""
    cache: Dict[str, Optional[Employee]] = {}
    errors: List[str] = []
    touched: set[int] = set()
    ingested = 0

    for index, payload in enumerate(payloads):
        employee = resolve_employee(db, cache, payload.employee_id, payload.employee_code)
        if employee is None:
            errors.append(f"row {index}: unknown employee (id={payload.employee_id}, code={payload.employee_code})")
            continue

        event = ActivityEvent(
            employee_id=employee.id,
            activity_type=payload.activity_type.value,
            log_source=payload.log_source.value,
            event_time=F.as_utc(payload.event_time),
            device_id=payload.device_id,
            ip_address=payload.ip_address,
            hostname=payload.hostname,
            resource=payload.resource,
            application=payload.application,
            destination=payload.destination,
            country=payload.country,
            bytes_transferred=float(payload.bytes_transferred or 0.0),
            duration_seconds=float(payload.duration_seconds or 0.0),
            file_count=int(payload.file_count or 0),
            is_external=bool(payload.is_external),
            is_removable_media=bool(payload.is_removable_media),
            success=bool(payload.success),
            sensitivity=payload.sensitivity,
            raw_payload=payload.raw_payload,
        )
        F.enrich_event_flags(event)
        db.add(event)
        touched.add(employee.id)
        ingested += 1

    db.flush()

    result: Dict[str, Any] = {
        "ingested": ingested,
        "skipped": len(payloads) - ingested,
        "employees_touched": len(touched),
        "anomalies_detected": 0,
        "alerts_created": 0,
        "errors": errors[:50],
    }

    if run_detection and touched:
        ids = list(touched)
        detection = anomaly_engine.run_detection(db, employee_ids=ids, lookback_days=30)
        anomalies = detection["anomalies"]
        risk_engine.recompute_all(db, employee_ids=ids)
        created_alerts = alert_service.generate_alerts(db, anomalies)
        result["anomalies_detected"] = len(anomalies)
        result["alerts_created"] = len(created_alerts)

    db.commit()
    return result


CSV_FIELD_ALIASES = {
    "employee_code": {"employee_code", "user", "user_id", "employee", "userid", "actor"},
    "activity_type": {"activity_type", "activity", "event_type", "action", "event"},
    "event_time": {"event_time", "date", "timestamp", "time", "datetime"},
    "device_id": {"device_id", "pc", "device", "host_id", "asset"},
    "ip_address": {"ip_address", "ip", "src_ip", "source_ip"},
    "hostname": {"hostname", "host", "computer"},
    "resource": {"resource", "filename", "file", "url", "path", "object"},
    "application": {"application", "app", "process", "program"},
    "destination": {"destination", "to", "recipient", "dest", "remote_host"},
    "bytes_transferred": {"bytes_transferred", "bytes", "size", "filesize", "volume"},
    "file_count": {"file_count", "files", "attachments"},
    "log_source": {"log_source", "source", "sourcetype"},
    "sensitivity": {"sensitivity", "classification", "label"},
    "success": {"success", "result", "status", "outcome"},
    "is_external": {"is_external", "external", "to_external"},
    "is_removable_media": {"is_removable_media", "removable", "usb"},
}


def _map_headers(headers: List[str]) -> Dict[str, str]:
    """Map arbitrary CSV headers onto canonical event fields."""
    mapping: Dict[str, str] = {}
    for header in headers:
        key = (header or "").strip().lower().replace(" ", "_")
        for canonical, aliases in CSV_FIELD_ALIASES.items():
            if key in aliases:
                mapping[header] = canonical
                break
    return mapping


def _truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "success", "allowed", "external"}


def parse_csv(content: bytes) -> Tuple[List[ActivityEventCreate], List[str]]:
    """Parse a CSV export (CERT/LANL-style or the platform's own format)."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return [], ["CSV file has no header row"]

    mapping = _map_headers(list(reader.fieldnames))
    if "activity_type" not in mapping.values() or "event_time" not in mapping.values():
        return [], [
            "CSV must contain an activity/event-type column and a date/timestamp column. "
            f"Detected columns: {', '.join(reader.fieldnames)}"
        ]

    events: List[ActivityEventCreate] = []
    errors: List[str] = []
    for line_no, raw_row in enumerate(reader, start=2):
        row: Dict[str, Any] = {}
        for header, value in raw_row.items():
            canonical = mapping.get(header)
            if canonical:
                row[canonical] = value

        activity = normalise_activity(str(row.get("activity_type", "")))
        if not activity:
            errors.append(f"line {line_no}: unrecognised activity type '{row.get('activity_type')}'")
            continue
        try:
            event_time = date_parser.parse(str(row.get("event_time")))
        except (ValueError, TypeError):
            errors.append(f"line {line_no}: unparsable timestamp '{row.get('event_time')}'")
            continue

        source = str(row.get("log_source", "")).strip().lower()
        try:
            bytes_transferred = float(row.get("bytes_transferred") or 0.0)
        except ValueError:
            bytes_transferred = 0.0
        try:
            file_count = int(float(row.get("file_count") or 0))
        except ValueError:
            file_count = 0

        success_raw = row.get("success")
        events.append(
            ActivityEventCreate(
                employee_code=str(row.get("employee_code") or "").strip() or None,
                activity_type=ActivityType(activity),
                log_source=LogSource(source) if source in VALID_SOURCES else LogSource.MANUAL,
                event_time=event_time,
                device_id=row.get("device_id") or None,
                ip_address=row.get("ip_address") or None,
                hostname=row.get("hostname") or None,
                resource=row.get("resource") or None,
                application=row.get("application") or None,
                destination=row.get("destination") or None,
                bytes_transferred=bytes_transferred,
                file_count=file_count,
                sensitivity=row.get("sensitivity") or None,
                success=True if success_raw is None else _truthy(success_raw),
                is_external=_truthy(row.get("is_external")),
                is_removable_media=_truthy(row.get("is_removable_media")),
            )
        )
    return events, errors[:50]


def ingest_csv(db: Session, content: bytes, run_detection: bool = True) -> Dict[str, Any]:
    events, parse_errors = parse_csv(content)
    if not events:
        return {
            "ingested": 0,
            "skipped": 0,
            "employees_touched": 0,
            "anomalies_detected": 0,
            "alerts_created": 0,
            "errors": parse_errors or ["No valid rows found in file"],
        }
    result = ingest_events(db, events, run_detection=run_detection)
    result["errors"] = (parse_errors + result.get("errors", []))[:50]
    return result
