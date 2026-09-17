"""
Map host-agent CanonicalEvents onto activity_logs and the IsolationForest pipeline.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.domain import Employee, EnrolledAgent
from app.schemas.canonical_event import CanonicalEvent

logger = logging.getLogger(__name__)

_HIGH_RISK_LEVELS = {"HIGH", "CRITICAL", "high", "critical"}

_EVENT_SEVERITY: dict[str, str] = {
    "LOGON_FAILED": "MEDIUM",
    "USB_INSERT": "MEDIUM",
    "USB_FILE_COPY": "HIGH",
    "FILE_DOWNLOAD": "MEDIUM",
    "DATA_TRANSFER": "MEDIUM",
    "PRIVILEGE_CHANGE": "HIGH",
    "GROUP_CHANGE": "HIGH",
    "ACCOUNT_CREATED": "HIGH",
    "ACCOUNT_DISABLED": "MEDIUM",
    "PASSWORD_CHANGE": "MEDIUM",
    "REMOTE_SESSION_CONNECT": "MEDIUM",
    "NETWORK_CONNECTION": "INFO",
}


def normalize_event_type(event_type: str) -> str:
    return str(event_type or "unknown").strip().upper()


def severity_for_event(event: CanonicalEvent) -> str:
    if event.risk_level:
        level = str(event.risk_level).upper()
        if level in {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}:
            return level
    return _EVENT_SEVERITY.get(normalize_event_type(str(event.event_type)), "INFO")


def event_is_high_risk(event: CanonicalEvent) -> bool:
    if event.risk_level and str(event.risk_level) in _HIGH_RISK_LEVELS:
        return True
    if str(event.risk_level).upper() in {"HIGH", "CRITICAL"}:
        return True
    indicators = {item.lower() for item in (event.risk_indicators or [])}
    if indicators.intersection({"high", "critical", "exfil", "usb_exfil", "privilege_escalation"}):
        return True
    return severity_for_event(event) in {"HIGH", "CRITICAL"}


def resolve_employee(
    db: Session,
    event: CanonicalEvent,
    agent: EnrolledAgent,
) -> Employee | None:
    """
    Bind a host event to a monitored employee.

    Order: explicit employee_id / user_id (emp_*), enrolled agent link,
    matching device_id, then username/email.
    """
    candidates: list[str] = []
    if event.employee_id:
        candidates.append(event.employee_id.strip())
    if event.user_id:
        candidates.append(event.user_id.strip())

    for value in candidates:
        if value.lower().startswith("emp_"):
            emp = db.query(Employee).filter(Employee.emp_id == value).first()
            if emp:
                return emp

    if agent.employee_id:
        emp = db.query(Employee).filter(Employee.id == agent.employee_id).first()
        if emp:
            return emp

    device_ids = [
        item
        for item in (event.device_id, agent.device_id)
        if item
    ]
    for device_id in device_ids:
        emp = db.query(Employee).filter(Employee.device_id == device_id).first()
        if emp:
            return emp

    if event.user_email:
        # Employees do not store email; skip unless username matches first/last.
        pass

    if event.username:
        name = event.username.replace("/", "\\").split("\\")[-1].strip()
        if name:
            emp = (
                db.query(Employee)
                .filter(Employee.first_name.ilike(name))
                .first()
            )
            if emp:
                return emp

    return None


def link_employee_for_device(db: Session, device_id: str) -> Employee | None:
    return db.query(Employee).filter(Employee.device_id == device_id).first()


def canonical_to_activity_log(
    event: CanonicalEvent,
    employee: Employee,
    agent: EnrolledAgent,
    ingested_at: datetime,
) -> dict[str, Any]:
    event_type = normalize_event_type(str(event.event_type))
    payload: dict[str, Any] = dict(event.raw_payload or {})
    payload.update(
        {
            "target_resource": event.target_resource,
            "target_type": event.target_type,
            "action": event.action,
            "result": event.result,
            "bytes_transferred": event.bytes_transferred,
            "file_count": event.file_count,
            "risk_indicators": event.risk_indicators,
            "username": event.username,
            "user_id": event.user_id,
            "source_dataset": event.source_dataset,
            "raw_event_id": event.raw_event_id,
        }
    )
    if event_type == "LOGON_FAILED":
        payload.setdefault("status", "FAILED")
        payload.setdefault("success", False)
    if event.bytes_transferred is not None and "file_size_bytes" not in payload:
        payload["file_size_bytes"] = event.bytes_transferred

    timestamp = event.timestamp
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    return {
        "emp_id": employee.emp_id,
        "employee_db_id": employee.id,
        "event_type": event_type,
        "severity": severity_for_event(event),
        "source_ip": event.ip_address,
        "device_id": event.device_id or agent.device_id,
        "payload": payload,
        "timestamp": timestamp,
        "ingested_at": ingested_at,
        "source_dataset": event.source_dataset,
        "canonical_event_id": str(event.event_id),
        "idempotency_key": event.idempotency_key(),
        "agent_device_id": agent.device_id,
    }


def canonical_document(
    event: CanonicalEvent,
    agent: EnrolledAgent,
    employee: Employee | None,
    ingested_at: datetime,
) -> dict[str, Any]:
    timestamp = event.timestamp
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    dumped = event.model_dump(mode="json")
    dumped["idempotency_key"] = event.idempotency_key()
    dumped["agent_device_id"] = agent.device_id
    dumped["emp_id"] = employee.emp_id if employee else None
    dumped["ingested_at"] = ingested_at
    dumped["timestamp"] = timestamp
    return dumped
