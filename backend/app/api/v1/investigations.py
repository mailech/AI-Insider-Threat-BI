"""Threat investigation and incident management endpoints (modules 7 & 9)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst, require_manager
from app.db.session import get_db
from app.models.alert import Alert
from app.models.employee import Employee
from app.models.enums import IncidentStatus, Severity
from app.models.incident import Evidence, Incident, IncidentNote, TimelineEntry
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.incident import (
    EvidenceCreate,
    EvidenceOut,
    IncidentCreate,
    IncidentDetail,
    IncidentEscalate,
    IncidentOut,
    IncidentUpdate,
    NoteCreate,
    NoteOut,
    TimelineEntryCreate,
    TimelineEntryOut,
)
from app.services import audit
from app.services import investigations as service

router = APIRouter(prefix="/investigations", tags=["Threat Investigation"])


def _row(db: Session, incident: Incident) -> dict:
    data = {c.name: getattr(incident, c.name) for c in Incident.__table__.columns}
    employee = incident.employee
    data["employee_name"] = employee.full_name if employee else None
    data["employee_code"] = employee.employee_code if employee else None
    data["department"] = employee.department.name if employee and employee.department else None
    data["assignee_name"] = incident.assignee.full_name if incident.assignee else None
    data["alert_count"] = int(
        db.execute(select(func.count(Alert.id)).where(Alert.incident_id == incident.id)).scalar_one()
    )
    data["evidence_count"] = int(
        db.execute(
            select(func.count(Evidence.id)).where(Evidence.incident_id == incident.id)
        ).scalar_one()
    )
    return data


@router.get("", response_model=Page[IncidentOut])
def list_incidents(
    status_filter: Optional[IncidentStatus] = Query(None, alias="status"),
    severity: Optional[Severity] = None,
    employee_id: Optional[int] = None,
    assigned_to_me: bool = False,
    open_only: bool = False,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(Incident)
    if status_filter:
        stmt = stmt.where(Incident.status == status_filter.value)
    if severity:
        stmt = stmt.where(Incident.severity == severity.value)
    if employee_id:
        stmt = stmt.where(Incident.employee_id == employee_id)
    if assigned_to_me:
        stmt = stmt.where(Incident.assigned_to_id == user.id)
    if open_only:
        stmt = stmt.where(
            Incident.status.notin_([IncidentStatus.CLOSED.value, IncidentStatus.RESOLVED.value])
        )

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(Incident.opened_at.desc()).offset((page - 1) * size).limit(size)
    ).scalars().all()
    return {
        "items": [_row(db, i) for i in rows],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.post("", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Create an investigation, linking alerts/anomalies and building the timeline."""
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    incident = service.create_incident(
        db,
        employee=employee,
        title=payload.title,
        summary=payload.summary,
        category=payload.category,
        severity=payload.severity.value,
        created_by=user,
        assigned_to_id=payload.assigned_to_id,
        alert_ids=payload.alert_ids,
        anomaly_ids=payload.anomaly_ids,
        auto_build_timeline=payload.auto_build_timeline,
    )
    audit.record(
        db, "incident.create", user, "incident", incident.id, incident.reference, client_ip(request)
    )
    db.commit()
    db.refresh(incident)
    return _detail(db, incident)


def _detail(db: Session, incident: Incident) -> dict:
    data = _row(db, incident)
    data["timeline"] = list(
        db.execute(
            select(TimelineEntry)
            .where(TimelineEntry.incident_id == incident.id)
            .order_by(TimelineEntry.occurred_at.asc())
        ).scalars().all()
    )
    data["evidence"] = list(
        db.execute(
            select(Evidence).where(Evidence.incident_id == incident.id).order_by(Evidence.collected_at)
        ).scalars().all()
    )
    notes = list(
        db.execute(
            select(IncidentNote)
            .where(IncidentNote.incident_id == incident.id)
            .order_by(IncidentNote.created_at)
        ).scalars().all()
    )
    authors = {
        u.id: u.full_name
        for u in db.execute(
            select(User).where(User.id.in_([n.author_id for n in notes if n.author_id] or [0]))
        ).scalars().all()
    }
    data["notes"] = [
        {
            "id": n.id,
            "incident_id": n.incident_id,
            "author_id": n.author_id,
            "author_name": authors.get(n.author_id),
            "body": n.body,
            "created_at": n.created_at,
        }
        for n in notes
    ]
    alerts = list(
        db.execute(select(Alert).where(Alert.incident_id == incident.id)).scalars().all()
    )
    from app.api.v1.alerts import _row as alert_row

    data["alerts"] = [alert_row(a) for a in alerts]
    data["correlated_events"] = service.correlated_events(db, incident)
    data["risk_history"] = service.risk_history(db, incident.employee_id)
    data["device_analysis"] = service.device_analysis(db, incident.employee_id)
    return data


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(
    incident_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)
) -> Any:
    """Investigation workspace: timeline, evidence, correlation, device analysis."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return _detail(db, incident)


@router.patch("/{incident_id}", response_model=IncidentDetail)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    data = payload.model_dump(exclude_unset=True)

    new_status = data.pop("status", None)
    if new_status is not None:
        value = new_status.value if isinstance(new_status, IncidentStatus) else new_status
        try:
            service.transition(db, incident, value, user, data.get("resolution"))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if data.get("severity") is not None:
        incident.severity = (
            data["severity"].value if isinstance(data["severity"], Severity) else data["severity"]
        )
    for field in ("title", "summary", "assigned_to_id", "resolution", "root_cause", "outcome"):
        if field in data and data[field] is not None:
            setattr(incident, field, data[field])

    audit.record(db, "incident.update", user, "incident", incident.id, str(data), client_ip(request))
    db.commit()
    db.refresh(incident)
    return _detail(db, incident)


@router.post("/{incident_id}/escalate", response_model=IncidentDetail)
def escalate_incident(
    incident_id: int,
    payload: IncidentEscalate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Escalation workflow: hand the incident to a manager and notify them."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    if not db.get(User, payload.escalated_to_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation target user not found")
    service.escalate(db, incident, payload.escalated_to_id, payload.reason, user)
    audit.record(
        db, "incident.escalate", user, "incident", incident.id, payload.reason, client_ip(request)
    )
    db.commit()
    db.refresh(incident)
    return _detail(db, incident)


@router.post("/{incident_id}/assign", response_model=IncidentDetail)
def assign_incident(
    incident_id: int,
    request: Request,
    assignee_id: int = Query(...),
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Analyst assignment."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    assignee = db.get(User, assignee_id)
    if not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
    incident.assigned_to_id = assignee_id
    service.add_timeline(
        db, incident, f"Assigned to {assignee.full_name}", entry_type="action", actor_id=user.id
    )
    from app.services import notifications

    notifications.notify_investigation(
        db, incident, f"You have been assigned to {incident.reference}", [assignee_id]
    )
    audit.record(
        db, "incident.assign", user, "incident", incident.id, f"assignee={assignee_id}", client_ip(request)
    )
    db.commit()
    db.refresh(incident)
    return _detail(db, incident)


@router.post("/{incident_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(
    incident_id: int,
    payload: NoteCreate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    note = service.add_note(db, incident, payload.body, user)
    audit.record(db, "incident.note", user, "incident", incident.id, None, client_ip(request))
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "incident_id": note.incident_id,
        "author_id": note.author_id,
        "author_name": user.full_name,
        "body": note.body,
        "created_at": note.created_at,
    }


@router.post("/{incident_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
def add_evidence(
    incident_id: int,
    payload: EvidenceCreate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Evidence management: attach an artefact with a SHA-256 integrity hash."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    item = service.collect_evidence(
        db,
        incident,
        title=payload.title,
        evidence_type=payload.evidence_type,
        reference_id=payload.reference_id,
        description=payload.description,
        payload=payload.payload,
        user_id=user.id,
    )
    service.add_timeline(
        db, incident, f"Evidence collected: {payload.title}", entry_type="action", actor_id=user.id
    )
    audit.record(db, "incident.evidence", user, "incident", incident.id, payload.title, client_ip(request))
    db.commit()
    db.refresh(item)
    return item


@router.post("/{incident_id}/timeline", response_model=TimelineEntryOut, status_code=status.HTTP_201_CREATED)
def add_timeline_entry(
    incident_id: int,
    payload: TimelineEntryCreate,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    entry = service.add_timeline(
        db,
        incident,
        payload.title,
        entry_type=payload.entry_type,
        description=payload.description,
        severity=payload.severity.value if payload.severity else None,
        occurred_at=payload.occurred_at,
        actor_id=user.id,
        reference_id=payload.reference_id,
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{incident_id}/rebuild-timeline", response_model=IncidentDetail)
def rebuild_timeline(
    incident_id: int,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Regenerate the threat timeline from current anomalies, alerts and events."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    service.build_timeline(db, incident)
    db.commit()
    db.refresh(incident)
    return _detail(db, incident)
