"""
ITBIS — Host agent telemetry ingestion.

POST /api/v1/ingestion/events
  Authenticated with the device API key (Bearer or X-Api-Key) and the enrolled
  device_id (X-Device-Id header and/or EventBatch.agent_id).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError, PyMongoError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import hash_agent_api_key
from app.db.mongo import get_mongo_db
from app.models.domain import EnrolledAgent
from app.schemas.canonical_event import BatchAck, EventAck, EventBatch
from app.services.agent_ingestion import (
    canonical_document,
    canonical_to_activity_log,
    event_is_high_risk,
    resolve_employee,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingestion", tags=["Agent Ingestion"])

_MAX_BATCH = 1000
_CANONICAL_COLLECTION = "canonical_events"
_ACTIVITY_COLLECTION = "activity_logs"


def _extract_api_key(request: Request, authorization: str | None, x_api_key: str | None) -> str:
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
    header_key = request.headers.get("api_key") or request.headers.get("X-ITBIS-Api-Key")
    if header_key and header_key.strip():
        return header_key.strip()
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            return value.strip()
        if authorization.startswith("itbis_ag_"):
            return authorization.strip()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing agent API key. Send Authorization: Bearer <api_key> or X-Api-Key.",
    )


def _extract_device_id(request: Request, x_device_id: str | None, agent_id: str) -> str:
    header_device = (
        (x_device_id or "").strip()
        or (request.headers.get("device_id") or "").strip()
        or (request.headers.get("X-ITBIS-Device-Id") or "").strip()
    )
    body_device = (agent_id or "").strip()
    if header_device and body_device and header_device != body_device:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="device_id header does not match batch agent_id.",
        )
    resolved = header_device or body_device
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="device_id is required (header or EventBatch.agent_id).",
        )
    return resolved


def _authenticate_agent(db: Session, raw_key: str, device_id: str) -> EnrolledAgent:
    if not raw_key.startswith("itbis_ag_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent API key.",
        )
    key_hash = hash_agent_api_key(raw_key)
    agent = (
        db.query(EnrolledAgent)
        .filter(EnrolledAgent.api_key_hash == key_hash)
        .first()
    )
    if agent is None or not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent credential was rejected.",
        )
    if agent.device_id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key is not valid for this device_id.",
        )
    return agent


@router.post(
    "/events",
    response_model=BatchAck,
    summary="Ingest a batch of CanonicalEvents from an enrolled host agent",
)
async def ingest_agent_events(
    payload: EventBatch,
    request: Request,
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase = Depends(get_mongo_db),
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
    x_device_id: str | None = Header(default=None, alias="X-Device-Id"),
) -> BatchAck:
    raw_key = _extract_api_key(request, authorization, x_api_key)
    device_id = _extract_device_id(request, x_device_id, payload.agent_id)
    agent = _authenticate_agent(db, raw_key, device_id)

    if len(payload.events) > _MAX_BATCH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Batch exceeds maximum of {_MAX_BATCH} events.",
        )

    now = datetime.now(timezone.utc)
    results: list[EventAck] = []
    accepted = 0
    duplicates = 0
    rejected = 0
    scored_emp_ids: set[str] = set()
    high_risk_employees: dict[str, int] = {}

    for event in payload.events:
        if event.device_id and event.device_id != agent.device_id:
            rejected += 1
            results.append(
                EventAck(
                    raw_event_id=event.raw_event_id,
                    event_id=event.event_id,
                    status="rejected",
                    reason="event device_id does not match enrolled device",
                )
            )
            continue

        idempotency_key = event.idempotency_key()
        existing = await mdb[_CANONICAL_COLLECTION].find_one(
            {"idempotency_key": idempotency_key},
            {"_id": 1},
        )
        if existing:
            duplicates += 1
            results.append(
                EventAck(
                    raw_event_id=event.raw_event_id,
                    event_id=event.event_id,
                    status="duplicate",
                    reason=None,
                )
            )
            continue

        employee = resolve_employee(db, event, agent)
        canonical_doc = canonical_document(event, agent, employee, now)
        try:
            await mdb[_CANONICAL_COLLECTION].insert_one(canonical_doc)
        except DuplicateKeyError:
            duplicates += 1
            results.append(
                EventAck(
                    raw_event_id=event.raw_event_id,
                    event_id=event.event_id,
                    status="duplicate",
                    reason=None,
                )
            )
            continue
        except PyMongoError as exc:
            logger.error("canonical_events insert failed: %s", exc)
            rejected += 1
            results.append(
                EventAck(
                    raw_event_id=event.raw_event_id,
                    event_id=event.event_id,
                    status="rejected",
                    reason="persist failed",
                )
            )
            continue

        if employee is not None:
            activity_doc = canonical_to_activity_log(event, employee, agent, now)
            try:
                await mdb[_ACTIVITY_COLLECTION].insert_one(activity_doc)
            except PyMongoError as exc:
                logger.warning("activity_logs insert failed for %s: %s", employee.emp_id, exc)
            scored_emp_ids.add(employee.emp_id)
            if event_is_high_risk(event):
                high_risk_employees[employee.emp_id] = max(
                    high_risk_employees.get(employee.emp_id, 0),
                    80,
                )

        accepted += 1
        results.append(
            EventAck(
                raw_event_id=event.raw_event_id,
                event_id=event.event_id,
                status="accepted",
                reason=None,
            )
        )

    agent.last_seen_at = now
    agent.updated_at = now
    db.commit()

    for emp_id in scored_emp_ids:
        try:
            from app.services.scoring import evaluate_and_persist_realtime_risk
            from app.api.v1.endpoints.incidents import auto_trigger_incident
            from app.models.domain import Employee

            employee = db.query(Employee).filter(Employee.emp_id == emp_id).first()
            if employee is None:
                continue

            inference = await evaluate_and_persist_realtime_risk(
                emp_id=emp_id,
                db=db,
                mdb=mdb,
                window_days=14,
                latest_event={
                    "source": "host_agent",
                    "device_id": agent.device_id,
                    "ingested_at": now.isoformat(),
                },
            )
            triggered = auto_trigger_incident(
                emp=employee,
                threat_score=int(inference.threat_score),
                db=db,
            )
            if triggered is None and emp_id in high_risk_employees:
                triggered = auto_trigger_incident(
                    emp=employee,
                    threat_score=high_risk_employees[emp_id],
                    db=db,
                )
            if triggered:
                logger.info(
                    "Agent ingest created/updated incident %s for %s (score=%s)",
                    triggered.id,
                    emp_id,
                    inference.threat_score,
                )
        except Exception as exc:
            logger.warning("IsolationForest scoring skipped for %s: %s", emp_id, exc)

    return BatchAck(
        accepted=accepted,
        duplicates=duplicates,
        rejected=rejected,
        results=results,
    )
