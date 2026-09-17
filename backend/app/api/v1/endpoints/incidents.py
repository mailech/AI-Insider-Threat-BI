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
GET    /api/v1/incidents/{id}/tasks     List investigation tasks
POST   /api/v1/incidents/{id}/tasks     Create investigation task
PATCH  /api/v1/incidents/{id}/tasks/{task_id}  Update investigation task
GET    /api/v1/incidents/{id}/timeline  Chronological telemetry event timeline

Access Control
--------------
All endpoints require a valid Bearer JWT (any active ITBIS user).
Analysts (SECURITY_ANALYST) may triage (New / In Progress), claim cases,
add notes, and create tasks assigned to themselves.
Closing (RESOLVED / FALSE_POSITIVE) and identity isolation require
SOC_ENGINEER, SECURITY_MANAGER (SOC Manager), or ADMINISTRATOR.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.api.deps import (
    SOC_ALL_ROLES,
    SOC_CLOSE_ROLES,
    can_assign_any_user,
    can_close_incident,
    get_current_active_user,
    get_db,
    require_roles,
)
from app.db.mongo import get_mongo_db
from app.models.domain import (
    AccessLevelEnum,
    Employee,
    Incident,
    IncidentComment,
    IncidentSeverityEnum,
    IncidentStatusEnum,
    IncidentTask,
    IncidentTaskStatusEnum,
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
    IncidentTaskCreate,
    IncidentTaskRead,
    IncidentTaskUpdate,
    IncidentTimelineEvent,
    IncidentTimelineResponse,
    RiskFactorRead,
    normalize_incident_status,
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
    # Use relationship accessors (not __dict__) so lazy-loaded assignee/employee
    # resolve after commit+refresh — __dict__.get skips the ORM loader.
    emp = incident.employee if incident.employee_id is not None else None
    assignee = incident.assigned_to if incident.assigned_to_id is not None else None
    comments = incident.comments or []

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
        comment_count=len(comments),
    )


def _task_read(task: IncidentTask) -> IncidentTaskRead:
    assignee = task.assignee if task.assignee_user_id is not None else None
    creator = task.created_by if task.created_by_id is not None else None
    return IncidentTaskRead(
        id=task.id,
        incident_id=task.incident_id,
        title=task.title,
        description=task.description,
        status=task.status,
        assignee_user_id=task.assignee_user_id,
        assignee_email=getattr(assignee, "email", None),
        created_by_id=task.created_by_id,
        created_by_email=getattr(creator, "email", None),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _parse_status_filter(raw: str) -> IncidentStatusEnum:
    try:
        normalized = normalize_incident_status(raw)
        return IncidentStatusEnum(normalized)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status value: {raw!r}",
        ) from exc


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
        previous_severity = existing.severity
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
        score_increased = threat_score > (existing.threat_score or 0)
        if severity is IncidentSeverityEnum.CRITICAL and (
            previous_severity is not IncidentSeverityEnum.CRITICAL
            or score_increased
        ):
            try:
                from app.services.notification_service import dispatch_critical_alert_notifications

                dispatch_critical_alert_notifications(incident=existing, db=db)
            except Exception as notify_err:
                logger.warning(
                    "Critical alert notification dispatch failed for incident %d: %s",
                    existing.id,
                    notify_err,
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
    if severity is IncidentSeverityEnum.CRITICAL:
        try:
            from app.services.notification_service import dispatch_critical_alert_notifications

            dispatch_critical_alert_notifications(incident=incident, db=db)
        except Exception as notify_err:
            logger.warning(
                "Critical alert notification dispatch failed for incident %d: %s",
                incident.id,
                notify_err,
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
    counts["in_progress"] = counts["UNDER_INVESTIGATION"]
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
                                          description="Filter by status: NEW, UNDER_INVESTIGATION (alias IN_PROGRESS), RESOLVED, FALSE_POSITIVE"),
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
        q = q.filter(Incident.status == _parse_status_filter(status_filter))

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
    current_user: User = Depends(require_roles(SOC_ALL_ROLES)),
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

@router.api_route(
    "/{incident_id}/status",
    methods=["PATCH", "POST"],
    response_model=IncidentRead,
    summary="Transition incident status",
    description=(
        "Updates the lifecycle status of an incident. "
        "Transitions to RESOLVED or FALSE_POSITIVE require SOC Engineer, SOC Manager, "
        "or Administrator. Analysts may move cases between New and In Progress. "
        "IN_PROGRESS is accepted as an alias for UNDER_INVESTIGATION."
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

    closing_statuses = {IncidentStatusEnum.RESOLVED, IncidentStatusEnum.FALSE_POSITIVE}
    if payload.status in closing_statuses and not can_close_incident(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Closing an incident (Resolved / False Positive) requires SOC Manager, "
                f"SOC Engineer, or Administrator. Your role: {current_user.role.value}."
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

@router.api_route(
    "/{incident_id}/assign",
    methods=["PATCH", "POST"],
    response_model=IncidentRead,
    summary="Assign incident to an analyst",
)
def assign_incident(
    incident_id: int,
    payload: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    if (
        not can_assign_any_user(current_user)
        and payload.assignee_user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analysts may only assign incidents to themselves. A SOC Manager must reassign cases.",
        )

    assignee = db.query(User).filter(User.id == payload.assignee_user_id).first()
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"User {payload.assignee_user_id} not found.")

    incident.assigned_to_id = payload.assignee_user_id
    incident.assigned_to = assignee
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
# Investigation tasks
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{incident_id}/tasks",
    response_model=list[IncidentTaskRead],
    summary="List investigation tasks for an incident",
)
def list_incident_tasks(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> list[IncidentTaskRead]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")
    return [_task_read(task) for task in incident.tasks]


@router.post(
    "/{incident_id}/tasks",
    response_model=IncidentTaskRead,
    status_code=status.HTTP_201_CREATED,
    summary="Assign an investigation task",
)
def create_incident_task(
    incident_id: int,
    payload: IncidentTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IncidentTaskRead:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incident {incident_id} not found.")

    assignee_id = payload.assignee_user_id
    if assignee_id is not None:
        if not can_assign_any_user(current_user) and assignee_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Analysts may only assign tasks to themselves.",
            )
        assignee = db.query(User).filter(User.id == assignee_id).first()
        if assignee is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"User {assignee_id} not found.")

    now = datetime.utcnow()
    task = IncidentTask(
        incident_id=incident_id,
        title=payload.title,
        description=payload.description,
        status=IncidentTaskStatusEnum.OPEN,
        assignee_user_id=assignee_id,
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    incident.updated_at = datetime.utcnow()
    note = IncidentComment(
        incident_id=incident_id,
        content=f"[TASK] Created '{payload.title}' by {current_user.email}.",
        author_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(task)
    return _task_read(task)


@router.patch(
    "/{incident_id}/tasks/{task_id}",
    response_model=IncidentTaskRead,
    summary="Update an investigation task",
)
def update_incident_task(
    incident_id: int,
    task_id: int,
    payload: IncidentTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IncidentTaskRead:
    task = (
        db.query(IncidentTask)
        .filter(IncidentTask.id == task_id, IncidentTask.incident_id == incident_id)
        .first()
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Task {task_id} not found on incident {incident_id}.")

    if payload.assignee_user_id is not None:
        if (
            not can_assign_any_user(current_user)
            and payload.assignee_user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Analysts may only assign tasks to themselves.",
            )
        assignee = db.query(User).filter(User.id == payload.assignee_user_id).first()
        if assignee is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"User {payload.assignee_user_id} not found.")
        task.assignee_user_id = payload.assignee_user_id

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.status is not None:
        task.status = payload.status
    task.updated_at = datetime.utcnow()
    if task.incident:
        task.incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _task_read(task)


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
    current_user: User = Depends(require_roles(SOC_CLOSE_ROLES)),
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
