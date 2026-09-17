"""
ITBIS — Telemetry Log Ingestion Endpoint  (Module 3)
Routes:
  POST /api/v1/telemetry/ingest  — validate emp_id against PostgreSQL,
                                   persist telemetry event to MongoDB.
"""

from __future__ import annotations

import asyncio
import enum
import json
import logging
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.security import decode_access_token
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, User
from app.services.telemetry_broker import broker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["Telemetry Ingestion"])

_optional_bearer = HTTPBearer(auto_error=False)

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
    device_id:  Optional[str]            = Field(
                    default=None,
                    examples=["ASSET-LT-001"],
                    description="Observed endpoint / device identifier for baseline tracking",
                )
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

    event_payload = payload.payload or {}
    observed_device_id: Optional[str] = payload.device_id
    if not observed_device_id:
        nested_device = event_payload.get("device_id") if isinstance(event_payload, dict) else None
        if isinstance(nested_device, str) and nested_device.strip():
            observed_device_id = nested_device.strip()
    if not observed_device_id and employee.device_id:
        observed_device_id = employee.device_id

    log_document: Dict[str, Any] = {
        "emp_id":         payload.emp_id,
        "employee_db_id": employee.id,
        "event_type":     payload.event_type,
        "severity":       payload.severity.value,   # store plain string, not enum obj
        "source_ip":      payload.source_ip,
        "device_id":      observed_device_id,
        "payload":        event_payload,
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

    # ── 4. Real-Time Isolation Forest inference + dual-database baseline ──
    try:
        from app.services.baseline import recalculate_baselines_on_ingest

        try:
            await recalculate_baselines_on_ingest(
                emp=employee,
                db=db,
                mdb=mdb,
                window_days=14,
            )
        except Exception as baseline_err:
            logger.warning("Baseline recalculation trigger failed for %s: %s", payload.emp_id, baseline_err)

        inference_result = await evaluate_and_persist_realtime_risk(
            emp_id=payload.emp_id,
            db=db,
            mdb=mdb,
            window_days=14,
            latest_event={
                "event_type": payload.event_type,
                "severity": payload.severity.value,
                "timestamp": event_timestamp.isoformat(),
                "device_id": observed_device_id,
            },
        )

        # ── 5. Write anomaly_score (0.0–1.0) and inference_result onto activity_logs ──
        factors_serializable = []
        for factor in (inference_result.contributing_risk_factors or []):
            if hasattr(factor, "model_dump"):
                factors_serializable.append(factor.model_dump())
            elif isinstance(factor, dict):
                factors_serializable.append(factor)
            else:
                factors_serializable.append(str(factor))

        anomaly_score_01 = round(float(inference_result.anomaly_score_01), 4)
        inference_result_doc: Dict[str, Any] = {
            "model": "isolation_forest.joblib",
            "anomaly_score": anomaly_score_01,
            "anomaly_score_pct": inference_result.anomaly_score,
            "raw_decision_score": inference_result.raw_decision_score,
            "threat_score": inference_result.threat_score,
            "risk_score": inference_result.risk_score,
            "risk_category": inference_result.risk_category,
            "severity": inference_result.severity,
            "is_anomaly": inference_result.is_anomaly,
            "contributing_risk_factors": factors_serializable,
            "features": inference_result.features,
            "evaluated_at": inference_result.evaluated_at,
        }
        # `inference` retains 0–100 anomaly_score for existing consumers.
        enriched_inference = {
            **inference_result_doc,
            "anomaly_score": inference_result.anomaly_score,
        }
        try:
            await mdb[_COLLECTION].update_one(
                {"_id": result.inserted_id},
                {
                    "$set": {
                        "anomaly_score": anomaly_score_01,
                        "inference_result": inference_result_doc,
                        "inference": enriched_inference,
                        "threat_score": inference_result.threat_score,
                        "risk_score": inference_result.risk_score,
                        "risk_category": inference_result.risk_category,
                        "is_anomaly": inference_result.is_anomaly,
                    }
                },
            )
        except Exception as log_enrich_err:
            logger.warning(
                "Failed to append inference metadata to activity log %s: %s",
                result.inserted_id,
                log_enrich_err,
            )

        # ── 6. Auto-create/update HIGH/CRITICAL incident when score > 75 ──
        try:
            from app.api.v1.endpoints.incidents import auto_trigger_incident

            triggered = auto_trigger_incident(
                emp=employee,
                threat_score=int(inference_result.threat_score),
                db=db,
            )
            if triggered:
                logger.info(
                    "Ingest auto-trigger: incident %d for %s (score=%d)",
                    triggered.id,
                    payload.emp_id,
                    inference_result.threat_score,
                )
        except Exception as trigger_err:
            logger.warning("Incident auto-trigger failed for %s: %s", payload.emp_id, trigger_err)

        stream_event = {
            "log_id": str(result.inserted_id),
            "emp_id": payload.emp_id,
            "event_type": payload.event_type,
            "severity": payload.severity.value,
            "source_ip": payload.source_ip,
            "device_id": observed_device_id,
            "payload": event_payload,
            "timestamp": event_timestamp.isoformat(),
            "threat_score": inference_result.threat_score,
            "risk_score": inference_result.risk_score,
            "risk_category": inference_result.risk_category,
            "is_anomaly": inference_result.is_anomaly,
            "ingested_at": now_utc.isoformat(),
        }
        try:
            await broker.publish(stream_event)
        except Exception as pub_err:
            logger.debug("SSE publish skipped: %s", pub_err)

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
        try:
            from app.services.baseline import recalculate_baselines_on_ingest

            await recalculate_baselines_on_ingest(
                emp=employee,
                db=db,
                mdb=mdb,
                window_days=14,
            )
        except Exception:
            pass
        try:
            await mdb[_COLLECTION].update_one(
                {"_id": result.inserted_id},
                {
                    "$set": {
                        "anomaly_score": round(float(employee.risk_score or 0.0), 4),
                        "inference_result": {
                            "status": "degraded",
                            "model": "isolation_forest.joblib",
                            "error": str(inf_exc),
                            "anomaly_score": round(float(employee.risk_score or 0.0), 4),
                            "fallback_threat_score": round(employee.risk_score * 100),
                        },
                        "inference": {
                            "status": "degraded",
                            "error": str(inf_exc),
                            "fallback_threat_score": round(employee.risk_score * 100),
                        },
                    }
                },
            )
        except Exception:
            pass

        fallback_score = round(employee.risk_score * 100)
        try:
            from app.api.v1.endpoints.incidents import auto_trigger_incident

            auto_trigger_incident(emp=employee, threat_score=int(fallback_score), db=db)
        except Exception:
            pass
        try:
            await broker.publish(
                {
                    "log_id": str(result.inserted_id),
                    "emp_id": payload.emp_id,
                    "event_type": payload.event_type,
                    "severity": payload.severity.value,
                    "source_ip": payload.source_ip,
                    "device_id": observed_device_id,
                    "payload": event_payload,
                    "timestamp": event_timestamp.isoformat(),
                    "threat_score": fallback_score,
                    "risk_score": employee.risk_score,
                    "risk_category": employee.risk_category.value,
                    "is_anomaly": None,
                    "ingested_at": now_utc.isoformat(),
                }
            )
        except Exception:
            pass

        return TelemetryIngestResponse(
            status="success",
            log_id=str(result.inserted_id),
            emp_id=payload.emp_id,
            threat_score=fallback_score,
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


def _resolve_stream_user(token: str, db: Session) -> User:
    try:
        payload = decode_access_token(token)
        email: str | None = payload.get("sub")
        if not email:
            raise ValueError("missing subject")
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ─────────────────────────────────────────────────────────────
# GET /api/v1/telemetry/stream  — Server-Sent Events
# ─────────────────────────────────────────────────────────────

@router.get(
    "/stream",
    summary="Live telemetry Server-Sent Events stream",
    description=(
        "Opens an SSE connection that pushes each newly ingested activity log "
        "to the client in real time. Pass the JWT as `Authorization: Bearer` "
        "or as a `token` query parameter (EventSource cannot set headers)."
    ),
)
async def stream_telemetry(
    token: Optional[str] = Query(default=None, description="JWT access token (for EventSource)"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """
    Authenticated SSE feed of telemetry ingest events.
    Pass JWT via Authorization header or `token` query (EventSource).
    """
    raw_token: Optional[str] = token
    if credentials is not None and credentials.credentials:
        raw_token = credentials.credentials
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    _resolve_stream_user(raw_token, db)

    async def event_generator() -> AsyncGenerator[str, None]:
        queue = await broker.subscribe()
        try:
            yield "event: ready\ndata: {\"status\":\"connected\"}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    payload = json.dumps(event, default=str)
                    yield f"event: telemetry\ndata: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        except asyncio.CancelledError:
            logger.debug("SSE client disconnected")
            raise
        finally:
            await broker.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
