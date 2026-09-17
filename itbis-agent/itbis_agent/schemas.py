"""
ITBIS Endpoint Agent — CanonicalEvent schema

This Pydantic model is the wire format the agent uses to ship events to the
ITBIS server. It is a self-contained copy of the server's CanonicalEvent
(backend/app/shared/schemas/canonical_event.py) — kept in sync deliberately.

The agent never imports from the backend. This guarantees the agent can be
shipped and run on a host without the FastAPI server, Docker, MongoDB, etc.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EventType(str, Enum):
    """Subset of server event types the agent emits."""

    # Authentication
    LOGON = "logon"
    LOGOFF = "logoff"
    LOGON_FAILED = "logon_failed"

    # Remote access (Remote Desktop session reconnect / disconnect)
    REMOTE_SESSION_CONNECT = "remote_session_connect"
    REMOTE_SESSION_DISCONNECT = "remote_session_disconnect"

    # Account & privilege management
    PRIVILEGE_CHANGE = "privilege_change"
    GROUP_CHANGE = "group_change"
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DISABLED = "account_disabled"
    PASSWORD_CHANGE = "password_change"

    # Process / Application
    APP_LAUNCH = "app_launch"
    APP_CLOSE = "app_close"

    # USB / Removable Media
    USB_INSERT = "usb_insert"
    USB_REMOVE = "usb_remove"
    USB_FILE_COPY = "usb_file_copy"

    # File activity (from USB/process lineage)
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_DELETE = "file_delete"
    FILE_COPY = "file_copy"
    FILE_MOVE = "file_move"
    FILE_DOWNLOAD = "file_download"
    DATA_TRANSFER = "data_transfer"

    # Network (basic shell for future expansion)
    HTTP_REQUEST = "http_request"
    NETWORK_CONNECTION = "network_connection"

    # System
    SYSTEM_EVENT = "system_event"

    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    """Risk severity levels (mirrors server)."""

    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class CanonicalEvent(BaseModel):
    """
    Wire-format event produced by the agent and consumed by the ITBIS server.

    Field set mirrors the server-side CanonicalEvent so the server can ingest
    agent batches with no transformation.
    """

    # ─── Identity ──────────────────────────────────────────
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_type: EventType
    source_dataset: str = Field(
        description="Logical source name, e.g. 'win_endpoint'."
    )
    raw_event_id: str | None = Field(
        default=None,
        description="Source-side stable id (e.g. Windows EventID-RecordId).",
    )

    # ─── Timing ────────────────────────────────────────────
    timestamp: datetime = Field(description="Event time in UTC.")
    ingested_at: datetime = Field(
        default_factory=_utcnow,
        description="When the agent captured the event (UTC).",
    )

    # ─── Actor ─────────────────────────────────────────────
    user_id: str = Field(description="Internal ITBIS user identifier.")
    username: str | None = None
    user_email: str | None = None
    employee_id: str | None = None
    department: str | None = None

    # ─── Asset / Device ────────────────────────────────────
    device_id: str | None = None
    device_name: str | None = None
    device_type: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    operating_system: str | None = None

    # ─── Activity Details ──────────────────────────────────
    target_resource: str | None = None
    target_type: str | None = None
    action: str | None = None
    result: str | None = None

    # ─── Volume / Size ─────────────────────────────────────
    bytes_transferred: int | None = None
    file_count: int | None = None

    # ─── Location ──────────────────────────────────────────
    location: str | None = None
    country: str | None = None
    city: str | None = None
    is_remote: bool | None = None

    # ─── Risk Indicators ───────────────────────────────────
    risk_indicators: list[str] = Field(default_factory=list)
    risk_score: float | None = None
    risk_level: RiskLevel | None = None

    # ─── Raw / Extra ───────────────────────────────────────
    raw_payload: dict[str, Any] | None = Field(
        default=None,
        description="Original unmodified event data from the source.",
    )
    enrichments: dict[str, Any] | None = None
    tags: list[str] = Field(default_factory=list)

    model_config = ConfigDict(use_enum_values=True)

    # ─── Helpers ───────────────────────────────────────────

    def idempotency_key(self) -> str:
        """
        Compute a stable, source-derived idempotency key.

        Format: '<source_dataset>:<raw_event_id>'.
        Used by the agent's persistent queue and by the server to dedupe
        retried submissions.
        """
        if self.raw_event_id:
            return f"{self.source_dataset}:{self.raw_event_id}"
        return f"{self.source_dataset}:{self.event_id}"


class EventBatch(BaseModel):
    """
    Wrapper payload the agent sends to the server.

    The server endpoint POST /api/v1/ingestion/events accepts this shape.
    """

    agent_id: str = Field(description="Stable identifier of the agent host.")
    submitted_at: datetime = Field(default_factory=_utcnow)
    events: list[CanonicalEvent]

    model_config = ConfigDict(use_enum_values=True)


class EventAck(BaseModel):
    """Server acknowledgement of an event batch (subset returned per event)."""

    raw_event_id: str | None = None
    event_id: uuid.UUID
    status: str  # "accepted" | "duplicate" | "rejected"
    reason: str | None = None


class BatchAck(BaseModel):
    """Server response to a batch submission."""

    accepted: int
    duplicates: int
    rejected: int
    results: list[EventAck] = Field(default_factory=list)
