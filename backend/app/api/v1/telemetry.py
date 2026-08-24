"""
ITBIS — Telemetry Log Ingestion Endpoint  (Module 3)
Routes:
  POST /api/v1/telemetry/ingest  — validate emp_id against PostgreSQL,
                                   persist telemetry event to MongoDB.
"""

from __future__ import annotations

import enum
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, User

logger = logging.getLogger(__name__)

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
    timestamp:  Optional[datetime] = Field(
                    default=None,
                    description="UTC timestamp of the event (defaults to ingestion time if omitted)",
                )


from app.schemas.features import RiskFactorItem
from app.services.scoring import evaluate_and_persist_realtime_risk


class TelemetryIngestResponse(BaseModel):
    """
    Confirmation and real-time ML risk inference returned after ingestion.
    Preserves status and log_id for backwards compatibility while delivering
    instant anomaly percentile, severity, and risk attribution factors.
    """
    status:                    str                       = "success"
    log_id:                    str
    emp_id:                    Optional[str]             = None
    threat_score:              Optional[int]             = None
    risk_score:                Optional[float]           = None
    risk_category:             Optional[str]             = None
    anomaly_score:             Optional[float]           = None
    severity:                  Optional[str]             = None
    is_anomaly:                Optional[bool]            = None
    contributing_risk_factors: Optional[List[RiskFactorItem]] = None
    evaluated_at:              Optional[str]             = None


# ─────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────

def verify_employee_exists(
    db: Session,
    emp_id: str,
    custom_detail: Optional[str] = None,
) -> Employee:
    """
    Validate that an employee exists in PostgreSQL.
    Raises HTTPException 404 if the identity is unknown.
    """
    employee = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not employee:
        detail = custom_detail or f"Employee '{emp_id}' not found. Cannot ingest telemetry for an unknown identity."
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )
    return employee


# ─────────────────────────────────────────────────────────────
# POST /api/v1/telemetry/ingest
# ─────────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=TelemetryIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest telemetry & execute real-time ML anomaly scoring",
    description=(
        "Validates that the **emp_id** exists in PostgreSQL, then stores the "
        "full telemetry payload in the MongoDB `activity_logs` collection. "
        "Instantly triggers automated behavioral feature vector updating, runs "
        "real-time Isolation Forest anomaly inference, re-calculates the multi-factor "
        "threat score, updates the PostgreSQL employee record, and persists the "
        "comprehensive behavioral baseline snapshot into MongoDB."
    ),
)
async def ingest_telemetry(
    payload: TelemetryEventCreate,
    db:      Session               = Depends(get_db),
    mdb:     AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:       User                  = Depends(get_current_active_user),
) -> TelemetryIngestResponse:
    # ── 1. Validate emp_id exists in PostgreSQL ───────────────
    employee = verify_employee_exists(db=db, emp_id=payload.emp_id)

    # ── 2. Build the MongoDB document with explicit UTC time ──
    now_utc = datetime.now(timezone.utc)
    if payload.timestamp is not None:
        event_timestamp = payload.timestamp
        if event_timestamp.tzinfo is None:
            event_timestamp = event_timestamp.replace(tzinfo=timezone.utc)
    else:
        event_timestamp = now_utc

    log_document: Dict[str, Any] = {
        "emp_id":         payload.emp_id,
        "employee_db_id": employee.id,
        "event_type":     payload.event_type,
        "severity":       payload.severity.value,   # store plain string, not enum obj
        "source_ip":      payload.source_ip,
        "payload":        payload.payload or {},
        "timestamp":      event_timestamp,
        "ingested_at":    now_utc,
    }

    # ── 3. Insert into MongoDB activity_logs collection ───────
    try:
        result = await mdb[_COLLECTION].insert_one(log_document)
    except PyMongoError as exc:
        logger.error("MongoDB ingestion failed for employee '%s': %s", payload.emp_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable. Failed to persist telemetry event.",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error during telemetry ingestion for employee '%s': %s", payload.emp_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while processing telemetry event.",
        ) from exc

    # ── 4. Real-Time Automated ML Inference & Baseline Persistence ──
    try:
        inference_result = await evaluate_and_persist_realtime_risk(
            emp_id=payload.emp_id,
            db=db,
            mdb=mdb,
            window_days=14,
            latest_event={
                "event_type": payload.event_type,
                "severity": payload.severity.value,
                "timestamp": event_timestamp.isoformat(),
            },
        )
        return TelemetryIngestResponse(
            status="success",
            log_id=str(result.inserted_id),
            emp_id=inference_result.emp_id,
            threat_score=inference_result.threat_score,
            risk_score=inference_result.risk_score,
            risk_category=inference_result.risk_category,
            anomaly_score=inference_result.anomaly_score,
            severity=inference_result.severity,
            is_anomaly=inference_result.is_anomaly,
            contributing_risk_factors=inference_result.contributing_risk_factors,
            evaluated_at=inference_result.evaluated_at,
        )
    except Exception as inf_exc:
        logger.warning(
            "Real-time ML scoring degraded for emp_id '%s': %s (returning basic ingestion response)",
            payload.emp_id,
            inf_exc,
        )
        return TelemetryIngestResponse(
            status="success",
            log_id=str(result.inserted_id),
            emp_id=payload.emp_id,
            threat_score=round(employee.risk_score * 100),
            risk_score=employee.risk_score,
            risk_category=employee.risk_category.value,
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
) -> List[Dict[str, Any]]:
    # Verify employee exists
    verify_employee_exists(
        db=db,
        emp_id=emp_id,
        custom_detail=f"Employee '{emp_id}' not found.",
    )

    limit = min(limit, 500)  # safety cap

    try:
        cursor = (
            mdb[_COLLECTION]
            .find({"emp_id": emp_id}, {"_id": 0})   # exclude raw ObjectId from response
            .sort("timestamp", -1)
            .limit(limit)
        )
        logs = await cursor.to_list(length=limit)
        return logs
    except PyMongoError as exc:
        logger.error("MongoDB query failed for employee '%s': %s", emp_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable. Failed to retrieve telemetry logs.",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error retrieving telemetry logs for employee '%s': %s", emp_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while retrieving telemetry logs.",
        ) from exc
