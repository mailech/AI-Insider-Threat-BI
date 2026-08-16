"""
ITBIS — Telemetry Log Ingestion Endpoint  (Module 3)
Routes:
  POST /api/v1/telemetry/ingest  — validate emp_id against PostgreSQL,
                                   persist telemetry event to MongoDB.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, User

router = APIRouter(prefix="/telemetry", tags=["Telemetry Ingestion"])

# MongoDB collection name
_COLLECTION = "activity_logs"


# ─────────────────────────────────────────────────────────────
# Request / Response Schemas  (telemetry-specific, inline here)
# ─────────────────────────────────────────────────────────────

class SeverityEnum(str, enum.Enum):
    """Severity bands for behavioural telemetry events."""
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"
    INFO     = "INFO"


class TelemetryEventCreate(BaseModel):
    """Inbound telemetry payload from sensors / agents."""
    emp_id:     str           = Field(..., examples=["emp_4091"],
                                     description="Employee identifier — must exist in PostgreSQL")
    event_type: str           = Field(..., examples=["FILE_ACCESS", "LOGIN_ATTEMPT", "USB_INSERTED"],
                                     description="Category of behavioural event")
    severity:   SeverityEnum  = Field(default=SeverityEnum.INFO,
                                     description="Severity level of the event")
    source_ip:  Optional[str]            = Field(default=None, examples=["192.168.1.42"])
    payload:    Optional[Dict[str, Any]] = Field(
                    default=None,
                    description="Arbitrary structured metadata captured with the event",
                    examples=[{"filename": "/etc/passwd", "action": "READ"}],
                )
    timestamp:  datetime = Field(
                    default_factory=lambda: datetime.now(tz=timezone.utc),
                    description="UTC timestamp of the event (defaults to ingestion time)",
                )


class TelemetryIngestResponse(BaseModel):
    """Confirmation returned after a successful log insertion."""
    status: str
    log_id: str


# ─────────────────────────────────────────────────────────────
# POST /api/v1/telemetry/ingest
# ─────────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=TelemetryIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a telemetry event",
    description=(
        "Validates that the **emp_id** exists in PostgreSQL, then stores the "
        "full telemetry payload in the MongoDB `activity_logs` collection. "
        "Returns the inserted document ID for downstream correlation."
    ),
)
async def ingest_telemetry(
    payload: TelemetryEventCreate,
    db:      Session               = Depends(get_db),
    mdb:     AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:       User                  = Depends(get_current_active_user),
) -> TelemetryIngestResponse:
    # ── 1. Validate emp_id exists in PostgreSQL ───────────────
    employee = db.query(Employee).filter(Employee.emp_id == payload.emp_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{payload.emp_id}' not found. Cannot ingest telemetry for an unknown identity.",
        )

    # ── 2. Build the MongoDB document ────────────────────────
    log_document: Dict[str, Any] = {
        "emp_id":         payload.emp_id,
        "employee_db_id": employee.id,
        "event_type":     payload.event_type,
        "severity":       payload.severity.value,   # store plain string, not enum obj
        "source_ip":      payload.source_ip,
        "payload":        payload.payload or {},
        "timestamp":      payload.timestamp,
        "ingested_at":    datetime.now(tz=timezone.utc),
    }

    # ── 3. Insert into MongoDB activity_logs collection ───────
    result = await mdb[_COLLECTION].insert_one(log_document)

    return TelemetryIngestResponse(
        status="success",
        log_id=str(result.inserted_id),
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/telemetry/logs/{emp_id}  — Query logs for employee
# ─────────────────────────────────────────────────────────────

@router.get(
    "/logs/{emp_id}",
    summary="Retrieve recent telemetry logs for an employee",
    description=(
        "Returns the most recent activity log entries for the given **emp_id** "
        "from MongoDB. Results are sorted by timestamp descending. "
        "Use `limit` to cap the number of records returned (max 500)."
    ),
)
async def get_employee_logs(
    emp_id: str,
    limit:  int                   = 50,
    db:     Session               = Depends(get_db),
    mdb:    AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:      User                  = Depends(get_current_active_user),
) -> list[dict]:
    # Verify employee exists
    employee = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{emp_id}' not found.",
        )

    limit = min(limit, 500)  # safety cap

    cursor = (
        mdb[_COLLECTION]
        .find({"emp_id": emp_id}, {"_id": 0})   # exclude raw ObjectId from response
        .sort("timestamp", -1)
        .limit(limit)
    )
    logs = await cursor.to_list(length=limit)
    return logs
