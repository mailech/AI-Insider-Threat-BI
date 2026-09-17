"""
ITBIS — CanonicalEvent wire format (host agent ingestion)

Kept in sync with itbis-agent/itbis_agent/schemas.py so endpoint batches
can be accepted without transformation.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EventType(str, Enum):
    LOGON = "logon"
    LOGOFF = "logoff"
    LOGON_FAILED = "logon_failed"
    REMOTE_SESSION_CONNECT = "remote_session_connect"
    REMOTE_SESSION_DISCONNECT = "remote_session_disconnect"
    PRIVILEGE_CHANGE = "privilege_change"
    GROUP_CHANGE = "group_change"
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DISABLED = "account_disabled"
    PASSWORD_CHANGE = "password_change"
    APP_LAUNCH = "app_launch"
    APP_CLOSE = "app_close"
    USB_INSERT = "usb_insert"
    USB_REMOVE = "usb_remove"
    USB_FILE_COPY = "usb_file_copy"
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_DELETE = "file_delete"
    FILE_COPY = "file_copy"
    FILE_MOVE = "file_move"
    FILE_DOWNLOAD = "file_download"
    DATA_TRANSFER = "data_transfer"
    HTTP_REQUEST = "http_request"
    NETWORK_CONNECTION = "network_connection"
    SYSTEM_EVENT = "system_event"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class CanonicalEvent(BaseModel):
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_type: EventType | str
    source_dataset: str = "win_endpoint"
    raw_event_id: str | None = None
    timestamp: datetime
    ingested_at: datetime = Field(default_factory=_utcnow)
    user_id: str
    username: str | None = None
    user_email: str | None = None
    employee_id: str | None = None
    department: str | None = None
    device_id: str | None = None
    device_name: str | None = None
    device_type: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    operating_system: str | None = None
    target_resource: str | None = None
    target_type: str | None = None
    action: str | None = None
    result: str | None = None
    bytes_transferred: int | None = None
    file_count: int | None = None
    location: str | None = None
    country: str | None = None
    city: str | None = None
    is_remote: bool | None = None
    risk_indicators: list[str] = Field(default_factory=list)
    risk_score: float | None = None
    risk_level: RiskLevel | str | None = None
    raw_payload: dict[str, Any] | None = None
    enrichments: dict[str, Any] | None = None
    tags: list[str] = Field(default_factory=list)

    model_config = ConfigDict(use_enum_values=True)

    def idempotency_key(self) -> str:
        if self.raw_event_id:
            return f"{self.source_dataset}:{self.raw_event_id}"
        return f"{self.source_dataset}:{self.event_id}"


class EventBatch(BaseModel):
    agent_id: str = Field(description="Stable identifier of the agent host.")
    submitted_at: datetime = Field(default_factory=_utcnow)
    events: list[CanonicalEvent]

    model_config = ConfigDict(use_enum_values=True)


class EventAck(BaseModel):
    raw_event_id: str | None = None
    event_id: uuid.UUID
    status: str
    reason: str | None = None


class BatchAck(BaseModel):
    accepted: int
    duplicates: int
    rejected: int
    results: list[EventAck] = Field(default_factory=list)
