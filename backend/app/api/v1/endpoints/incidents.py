"""
ITBIS — Incident & Alert Management Endpoints  (Module 7 / Milestone 3)

Routes
------
GET    /api/v1/incidents/              List all incidents (filterable)
POST   /api/v1/incidents/              Manually create an incident
GET    /api/v1/incidents/stats         Aggregated counts by status
GET    /api/v1/incidents/{id}          Full incident detail
PATCH  /api/v1/incidents/{id}/status  Transition incident status
PATCH  /api/v1/incidents/{id}/assign  Assign to a SOC analyst
POST   /api/v1/incidents/{id}/comments  Add analyst case note
GET    /api/v1/incidents/{id}/comments  List case notes
GET    /api/v1/incidents/{id}/timeline  Chronological telemetry event timeline

Auto-trigger rule
-----------------
Any employee whose ML threat_score (0–100) exceeds CRITICAL_SCORE_THRESHOLD (75)
will have a NEW incident created automatically via `auto_trigger_incident()`.
If an open incident already exists for the employee it is updated (score + timestamp).

Access Control
--------------
All endpoints require a valid Bearer JWT (any active ITBIS user).
Status transitions that mark RESOLVED or FALSE_POSITIVE additionally require
SOC_ENGINEER, SECURITY_MANAGER, or ADMINISTRATOR roles.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.db.mongo import get_mongo_db
from app.models.domain import (
    AccessLevelEnum,
    Employee,
    Incident,
    IncidentComment,
    IncidentSeverityEnum,
    IncidentStatusEnum,
    RoleEnum,
    User,
)
from app.schemas.schemas import (
    CommentCreate,
    CommentRead,
    IncidentAssign,
    IncidentCreate,
    IncidentIsolateResponse,
    IncidentListResponse,
    IncidentRead,
    IncidentRiskFactorsResponse,
    IncidentStatusUpdate,
    IncidentTimelineEvent,
    IncidentTimelineResponse,
    RiskFactorRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents & Alert Management"])

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

CRITICAL_SCORE_THRESHOLD: int = 75  # threat_score (0–100) above which auto-trigger fires


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

def _severity_from_score(score: int) -> IncidentSeverityEnum:
    """Derive incident severity from a 0–100 threat score."""
    if score >= 90:
        return IncidentSeverityEnum.CRITICAL
    if score >= 75:
        return IncidentSeverityEnum.HIGH
    if score >= 50:
        return IncidentSeverityEnum.MEDIUM
    return IncidentSeverityEnum.LOW


def _enrich(incident: Incident) -> IncidentRead:
    """
    Build an IncidentRead DTO from an ORM Incident, populating denormalised
    fields (emp_id, employee_name, department, assignee_email, comment_count)
    that are not stored directly on the incidents table.
    """
    emp: Employee | None = incident.employee
    assignee: User | None = incident.assigned_to

    return IncidentRead(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        status=incident.status,
        severity=incident.severity,
        threat_score=incident.threat_score,
        employee_id=incident.employee_id,
        emp_id=emp.emp_id if emp else "",
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else "",
        department=emp.department if emp else "",
        assigned_to_id=incident.assigned_to_id,
        assignee_email=assignee.email if assignee else None,
        trigger_reason=incident.trigger_reason,
        triggered_at=incident.triggered_at,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        comment_count=len(incident.comments),
    )


def auto_trigger_incident(
    emp: Employee,
    threat_score: int,
    db: Session,
) -> Incident | None:
    """
    Create or upsert a security incident when an employee's threat_score
    exceeds CRITICAL_SCORE_THRESHOLD.

    Upsert logic:
    - If the employee already has an open incident (NEW or UNDER_INVESTIGATION),
      update its threat_score and triggered_at rather than creating a duplicate.
    - If no open incident exists, create a new one.

    Returns the created/updated Incident, or None if score is below threshold.
    """
    if threat_score <= CRITICAL_SCORE_THRESHOLD:
        return None

    severity = _severity_from_score(threat_score)

    # Check for existing open incident for this employee
    existing: Incident | None = (
        db.query(Incident)
        .filter(
            Incident.employee_id == emp.id,
            Incident.status.in_([IncidentStatusEnum.NEW, IncidentStatusEnum.UNDER_INVESTIGATION]),
        )
        .order_by(Incident.created_at.desc())
        .first()
    )

    if existing:
        # Upsert — escalate severity if score has risen
        existing.threat_score = threat_score
        existing.severity = severity
        existing.triggered_at = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        logger.info(
            "Auto-trigger: UPSERTED incident %d for employee %s (score=%d)",
            existing.id, emp.emp_id, threat_score,
        )
        return existing

    # Create a fresh incident
    title = (
        f"[AUTO] CRITICAL Behavioral Anomaly — "
        f"{emp.first_name} {emp.last_name} ({emp.emp_id}) | Score {threat_score}/100"
    )
    description = (
        f"ML anomaly engine flagged {emp.first_name} {emp.last_name} ({emp.emp_id}) "
        f"in {emp.department} with a threat score of {threat_score}/100 "
        f"({severity.value} severity). Automatic incident created for SOC review."
    )

    incident = Incident(
        title=title,
        description=description,
        status=IncidentStatusEnum.NEW,
        severity=severity,
        threat_score=threat_score,
        employee_id=emp.id,
        trigger_reason="ML_AUTO_TRIGGER",
        triggered_at=datetime.utcnow(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    logger.info(
        "Auto-trigger: CREATED incident %d for employee %s (score=%d)",
        incident.id, emp.emp_id, threat_score,
    )
    return incident


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/stats
# ─────────────────────────────────────────────────────────────

@router.get(
    "/stats",
    summary="Aggregated incident counts by status",
    response_model=dict,
)
def get_incident_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> dict:
    """Returns count of incidents grouped by status for dashboard badges."""
    incidents = db.query(Incident).all()
    counts: dict[str, int] = {s.value: 0 for s in IncidentStatusEnum}
    for inc in incidents:
        counts[inc.status.value] += 1
    counts["total"] = len(incidents)
    counts["open"] = counts["NEW"] + counts["UNDER_INVESTIGATION"]
    counts["new"] = counts["NEW"]
    counts["under_investigation"] = counts["UNDER_INVESTIGATION"]
    counts["resolved"] = counts["RESOLVED"]
    counts["false_positive"] = counts["FALSE_POSITIVE"]
    return counts


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/
# ─────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=IncidentListResponse,
    summary="List all security incidents",
    description=(
        "Returns a paginated list of security incidents. Supports filtering by status, "
        "severity, and employee ID. Sorted by updated_at descending (most recent first)."
    ),
)
def list_incidents(
    status_filter: Optional[str]  = Query(default=None, alias="status",
                                          description="Filter by status: NEW, UNDER_INVESTIGATION, RESOLVED, FALSE_POSITIVE"),
    severity_filter: Optional[str] = Query(default=None, alias="severity",
                                           description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW"),
    emp_id: Optional[str]          = Query(default=None, description="Filter by employee ID, e.g. 'emp_4091'"),
    skip: int                      = Query(default=0, ge=0),
    limit: int                     = Query(default=50, ge=1, le=500),
    db: Session                    = Depends(get_db),
    _: User                        = Depends(get_current_active_user),
) -> IncidentListResponse:
    q = db.query(Incident)

    if status_filter:
        try:
            q = q.filter(Incident.status == IncidentStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status value: {status_filter!r}",
            )

    if severity_filter:
        try:
            q = q.filter(Incident.severity == IncidentSeverityEnum(severity_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid severity value: {severity_filter!r}",
            )

    if emp_id:
        emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
        if emp is None:
            return IncidentListResponse(total=0, items=[])
        q = q.filter(Incident.employee_id == emp.id)

    total = q.count()
    incidents = q.order_by(Incident.updated_at.desc()).offset(skip).limit(limit).all()

    return IncidentListResponse(
        total=total,
        items=[_enrich(inc) for inc in incidents],
    )


# ─────────────────────────────────────────────────────────────
# POST /api/v1/incidents/
# ─────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=IncidentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Manually create a security incident",
)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
        RoleEnum.ADMINISTRATOR,
    ])),
) -> IncidentRead:
    emp = db.query(Employee).filter(Employee.emp_id == payload.emp_id).first()
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{payload.emp_id}' not found.",
        )

    incident = Incident(
        title=payload.title,
        description=payload.description,
        status=IncidentStatusEnum.NEW,
        severity=payload.severity,
        threat_score=payload.threat_score,
        employee_id=emp.id,
        trigger_reason=payload.trigger_reason,
        triggered_at=datetime.utcnow(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    logger.info("Manual incident %d created by user %s", incident.id, current_user.email)
    return _enrich(incident)


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/{incident_id}
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{incident_id}",
    response_model=IncidentRead,
    summary="Get a single incident by ID",
)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")
    return _enrich(incident)


# ─────────────────────────────────────────────────────────────
# PATCH /api/v1/incidents/{incident_id}/status
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{incident_id}/status",
    response_model=IncidentRead,
    summary="Transition incident status",
    description=(
        "Updates the lifecycle status of an incident. "
        "Transitions to RESOLVED or FALSE_POSITIVE require SOC_ENGINEER or higher role. "
        "An optional note is auto-posted as a case comment recording the status change."
    ),
)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    # Closing transitions require elevated role
    closing_statuses = {IncidentStatusEnum.RESOLVED, IncidentStatusEnum.FALSE_POSITIVE}
    if payload.status in closing_statuses:
        allowed = {RoleEnum.SOC_ENGINEER, RoleEnum.SECURITY_MANAGER, RoleEnum.ADMINISTRATOR}
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Closing an incident requires role SOC_ENGINEER or higher. "
                    f"Your role: {current_user.role.value}."
                ),
            )

    old_status = incident.status
    incident.status = payload.status
    incident.updated_at = datetime.utcnow()

    if payload.status in closing_statuses:
        incident.resolved_at = datetime.utcnow()

    # Auto-post a system comment recording the transition
    note_text = payload.note or f"Status changed from {old_status.value} → {payload.status.value}."
    system_note = IncidentComment(
        incident_id=incident.id,
        content=f"[STATUS CHANGE] {note_text}",
        author_id=current_user.id,
    )
    db.add(system_note)
    db.commit()
    db.refresh(incident)
    logger.info(
        "Incident %d status: %s → %s (by %s)",
        incident_id, old_status.value, payload.status.value, current_user.email,
    )
    return _enrich(incident)


# ─────────────────────────────────────────────────────────────
# PATCH /api/v1/incidents/{incident_id}/assign
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{incident_id}/assign",
    response_model=IncidentRead,
    summary="Assign incident to an analyst",
)
def assign_incident(
    incident_id: int,
    payload: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
        RoleEnum.ADMINISTRATOR,
    ])),
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    assignee = db.query(User).filter(User.id == payload.assignee_user_id).first()
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"User {payload.assignee_user_id} not found.")

    incident.assigned_to_id = payload.assignee_user_id
    incident.updated_at = datetime.utcnow()

    # Auto-comment recording the assignment
    assign_note = IncidentComment(
        incident_id=incident.id,
        content=f"[ASSIGNED] Case assigned to {assignee.email} by {current_user.email}.",
        author_id=current_user.id,
    )
    db.add(assign_note)
    db.commit()
    db.refresh(incident)
    return _enrich(incident)


# ─────────────────────────────────────────────────────────────
# POST /api/v1/incidents/{incident_id}/comments
# ─────────────────────────────────────────────────────────────

@router.post(
    "/{incident_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add analyst case note",
)
def add_comment(
    incident_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CommentRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    comment = IncidentComment(
        incident_id=incident_id,
        content=payload.content,
        author_id=current_user.id,
    )
    db.add(comment)

    # Bump incident updated_at so the list sorts correctly
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)

    return CommentRead(
        id=comment.id,
        incident_id=comment.incident_id,
        content=comment.content,
        author_id=comment.author_id,
        author_email=current_user.email,
        created_at=comment.created_at,
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/{incident_id}/comments
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{incident_id}/comments",
    response_model=list[CommentRead],
    summary="List analyst case notes for an incident",
)
def list_comments(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> list[CommentRead]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    result = []
    for c in incident.comments:
        author_email = c.author.email if c.author else None
        result.append(
            CommentRead(
                id=c.id,
                incident_id=c.incident_id,
                content=c.content,
                author_id=c.author_id,
                author_email=author_email,
                created_at=c.created_at,
            )
        )
    return result


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/{incident_id}/timeline
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{incident_id}/timeline",
    response_model=IncidentTimelineResponse,
    summary="Chronological telemetry event timeline for an incident",
    description=(
        "Fetches raw telemetry events from MongoDB for the employee associated with this "
        "incident in chronological order."
    ),
)
async def get_incident_timeline(
    incident_id: int,
    limit: int                    = Query(default=100, ge=1, le=500),
    db:   Session                 = Depends(get_db),
    mdb:  AsyncIOMotorDatabase    = Depends(get_mongo_db),
    _:    User                    = Depends(get_current_active_user),
) -> IncidentTimelineResponse:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    emp = incident.employee
    if emp is None:
        return IncidentTimelineResponse(
            incident_id=incident_id,
            emp_id="",
            total_events=0,
            events=[],
        )

    # Query MongoDB activity_logs
    collection = mdb["activity_logs"]
    cursor = collection.find(
        {"emp_id": emp.emp_id},
        sort=[("timestamp", 1)],
        limit=limit,
    )

    events: list[IncidentTimelineEvent] = []
    async for doc in cursor:
        ts_val = doc.get("timestamp")
        ts_str = ts_val.isoformat() if hasattr(ts_val, "isoformat") else str(ts_val or "")

        events.append(
            IncidentTimelineEvent(
                id=str(doc.get("_id", "")),
                timestamp=ts_str,
                event_type=str(doc.get("event_type", "TELEMETRY")),
                severity=str(doc.get("severity", "INFO")),
                description=str(doc.get("description") or f"{doc.get('event_type', 'Activity')} event observed"),
                device_id=str(doc.get("device_id") or "") if doc.get("device_id") else None,
                ip_address=str(doc.get("source_ip") or doc.get("ip_address") or "") if (doc.get("source_ip") or doc.get("ip_address")) else None,
                metadata=doc.get("payload") or doc.get("metadata") or {},
            )
        )

    logger.info(
        "Timeline for incident %d (emp_id=%s): %d events loaded",
        incident_id, emp.emp_id, len(events),
    )
    return IncidentTimelineResponse(
        incident_id=incident_id,
        emp_id=emp.emp_id,
        total_events=len(events),
        events=events,
    )


# ─────────────────────────────────────────────────────────────
# POST aliases (mentor spec: POST update status / assign / notes)
# ─────────────────────────────────────────────────────────────

@router.post(
    "/{incident_id}/status",
    response_model=IncidentRead,
    summary="Transition incident status (POST alias)",
)
def update_incident_status_post(
    incident_id: int,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IncidentRead:
    return update_incident_status(incident_id, payload, db, current_user)


@router.post(
    "/{incident_id}/assign",
    response_model=IncidentRead,
    summary="Assign incident to an analyst (POST alias)",
)
def assign_incident_post(
    incident_id: int,
    payload: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
        RoleEnum.ADMINISTRATOR,
    ])),
) -> IncidentRead:
    return assign_incident(incident_id, payload, db, current_user)


# ─────────────────────────────────────────────────────────────
# POST /api/v1/incidents/{id}/isolate
# ─────────────────────────────────────────────────────────────

@router.post(
    "/{incident_id}/isolate",
    response_model=IncidentIsolateResponse,
    summary="Isolate user access for the incident subject",
)
def isolate_incident_user(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
        RoleEnum.ADMINISTRATOR,
    ])),
) -> IncidentIsolateResponse:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    emp = incident.employee
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Incident has no associated employee.")

    previous = emp.access_level.value if emp.access_level else "UNKNOWN"
    emp.access_isolated = True
    emp.access_level = AccessLevelEnum.READ
    emp.updated_at = datetime.utcnow()
    if incident.status == IncidentStatusEnum.NEW:
        incident.status = IncidentStatusEnum.UNDER_INVESTIGATION
    incident.updated_at = datetime.utcnow()

    note = IncidentComment(
        incident_id=incident.id,
        content=(
            f"[CONTAINMENT] Isolate User Access executed by {current_user.email}. "
            f"Previous access level: {previous}. Privileges reduced to READ and "
            f"identity flagged as isolated."
        ),
        author_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(incident)
    db.refresh(emp)

    return IncidentIsolateResponse(
        incident=_enrich(incident),
        emp_id=emp.emp_id,
        access_isolated=True,
        previous_access_level=previous,
        current_access_level=emp.access_level.value,
        message=f"Access isolated for {emp.emp_id}.",
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents/{id}/risk-factors
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{incident_id}/risk-factors",
    response_model=IncidentRiskFactorsResponse,
    summary="Z-score risk attribution factors for the incident subject",
)
async def get_incident_risk_factors(
    incident_id: int,
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase = Depends(get_mongo_db),
    _: User = Depends(get_current_active_user),
) -> IncidentRiskFactorsResponse:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    emp = incident.employee
    emp_id = emp.emp_id if emp else ""
    factors: list[RiskFactorRead] = []
    anomaly_score: float | None = None
    evaluated_at: str | None = None

    if emp_id:
        doc = await mdb["employee_risk_baselines"].find_one({"emp_id": emp_id})
        if doc:
            anomaly_score = doc.get("anomaly_score")
            eval_raw = doc.get("evaluated_at") or doc.get("updated_at")
            if hasattr(eval_raw, "isoformat"):
                evaluated_at = eval_raw.isoformat()
            elif eval_raw is not None:
                evaluated_at = str(eval_raw)
            for item in doc.get("contributing_risk_factors") or []:
                if not isinstance(item, dict):
                    continue
                factors.append(
                    RiskFactorRead(
                        feature_name=str(item.get("feature_name", "")),
                        feature_label=str(item.get("feature_label", item.get("feature_name", "Factor"))),
                        value=float(item.get("value") or 0.0),
                        baseline_mean=float(item.get("baseline_mean") or 0.0),
                        z_score=float(item.get("z_score") or 0.0),
                        risk_level=str(item.get("risk_level", "LOW")),
                        description=str(item.get("description", "")),
                    )
                )

    return IncidentRiskFactorsResponse(
        incident_id=incident_id,
        emp_id=emp_id,
        threat_score=incident.threat_score,
        anomaly_score=anomaly_score,
        factors=factors,
        evaluated_at=evaluated_at,
    )
