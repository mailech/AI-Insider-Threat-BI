"""Investigation workflow: create, assign, escalate, resolve, close investigations."""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.anomaly import Severity
from app.models.investigation import Investigation, InvestigationEvent, InvestigationStatus

# ---------------------------------------------------------------------------
# Reference generation
# ---------------------------------------------------------------------------

def _next_reference(db: Session) -> str:
    """Generate the next sequential INV-XXX reference string."""
    count: int = db.scalar(select(func.count()).select_from(Investigation)) or 0
    return f"INV-{count + 1:03d}"


# ---------------------------------------------------------------------------
# Timeline helper
# ---------------------------------------------------------------------------

def add_event(
    db: Session,
    investigation: Investigation,
    *,
    event_type: str,
    message: str,
    actor_id: uuid.UUID | None = None,
    actor_name: str | None = None,
    commit: bool = True,
) -> InvestigationEvent:
    """Append a timestamped event to an investigation's timeline."""
    event = InvestigationEvent(
        investigation_id=investigation.id,
        occurred_at=utcnow(),
        event_type=event_type,
        message=message,
        actor_id=actor_id,
        actor_name=actor_name,
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def create_investigation(
    db: Session,
    *,
    title: str,
    employee_id: uuid.UUID,
    description: str = "",
    severity: Severity = Severity.MEDIUM,
    anomaly_id: uuid.UUID | None = None,
    alert_id: uuid.UUID | None = None,
    risk_score_id: uuid.UUID | None = None,
    created_by_id: uuid.UUID | None = None,
    actor_name: str | None = None,
) -> Investigation:
    """Create a new investigation with an auto-generated INV-XXX reference."""
    reference = _next_reference(db)
    investigation = Investigation(
        reference=reference,
        title=title,
        description=description,
        status=InvestigationStatus.OPEN,
        severity=severity,
        employee_id=employee_id,
        anomaly_id=anomaly_id,
        alert_id=alert_id,
        risk_score_id=risk_score_id,
        created_by_id=created_by_id,
    )
    db.add(investigation)
    db.flush()  # populate investigation.id before adding event

    add_event(
        db,
        investigation,
        event_type="created",
        message=f"Investigation {reference} created: {title}",
        actor_id=created_by_id,
        actor_name=actor_name,
        commit=False,
    )

    db.commit()
    db.refresh(investigation)
    return investigation


def get_investigation(db: Session, investigation_id: uuid.UUID) -> Investigation | None:
    """Retrieve a single investigation by its UUID."""
    return db.get(Investigation, investigation_id)


def get_investigation_by_reference(db: Session, reference: str) -> Investigation | None:
    """Retrieve a single investigation by its INV-XXX reference."""
    return db.scalars(
        select(Investigation).where(Investigation.reference == reference)
    ).first()


def list_investigations(
    db: Session,
    *,
    employee_id: uuid.UUID | None = None,
    assigned_to_id: uuid.UUID | None = None,
    status: InvestigationStatus | None = None,
    severity: Severity | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Investigation]:
    """List investigations with optional filters, newest first."""
    query = select(Investigation).order_by(Investigation.created_at.desc())
    if employee_id is not None:
        query = query.where(Investigation.employee_id == employee_id)
    if assigned_to_id is not None:
        query = query.where(Investigation.assigned_to_id == assigned_to_id)
    if status is not None:
        query = query.where(Investigation.status == status)
    if severity is not None:
        query = query.where(Investigation.severity == severity)
    query = query.offset(offset).limit(limit)
    return list(db.scalars(query))


def assign_investigation(
    db: Session,
    investigation_id: uuid.UUID,
    *,
    assigned_to_id: uuid.UUID,
    actor_id: uuid.UUID | None = None,
    actor_name: str | None = None,
    assignee_name: str | None = None,
) -> Investigation | None:
    """Assign an investigation to a user and record the event."""
    investigation = db.get(Investigation, investigation_id)
    if investigation is None:
        return None

    previous_assignee_id = investigation.assigned_to_id
    investigation.assigned_to_id = assigned_to_id

    # Promote from OPEN to IN_PROGRESS on first assignment
    if investigation.status == InvestigationStatus.OPEN:
        investigation.status = InvestigationStatus.IN_PROGRESS

    assignee_label = assignee_name or str(assigned_to_id)
    message = f"Investigation assigned to {assignee_label}."
    if previous_assignee_id and previous_assignee_id != assigned_to_id:
        message = f"Investigation reassigned to {assignee_label}."

    add_event(
        db,
        investigation,
        event_type="assigned",
        message=message,
        actor_id=actor_id,
        actor_name=actor_name,
        commit=False,
    )

    db.commit()
    db.refresh(investigation)
    return investigation


def escalate_investigation(
    db: Session,
    investigation_id: uuid.UUID,
    *,
    new_severity: Severity | None = None,
    reason: str = "",
    actor_id: uuid.UUID | None = None,
    actor_name: str | None = None,
) -> Investigation | None:
    """Escalate an investigation, optionally upgrading its severity."""
    investigation = db.get(Investigation, investigation_id)
    if investigation is None:
        return None

    investigation.status = InvestigationStatus.ESCALATED
    if new_severity is not None:
        investigation.severity = new_severity

    message_parts = ["Investigation escalated."]
    if new_severity is not None:
        message_parts.append(f"Severity updated to {new_severity}.")
    if reason:
        message_parts.append(f"Reason: {reason}")

    add_event(
        db,
        investigation,
        event_type="escalated",
        message=" ".join(message_parts),
        actor_id=actor_id,
        actor_name=actor_name,
        commit=False,
    )

    db.commit()
    db.refresh(investigation)
    return investigation


def resolve_investigation(
    db: Session,
    investigation_id: uuid.UUID,
    *,
    resolution: str,
    resolved_by_id: uuid.UUID | None = None,
    actor_name: str | None = None,
) -> Investigation | None:
    """Mark an investigation as resolved with a resolution note."""
    investigation = db.get(Investigation, investigation_id)
    if investigation is None:
        return None

    now = utcnow()
    investigation.status = InvestigationStatus.RESOLVED
    investigation.resolution = resolution
    investigation.resolved_by_id = resolved_by_id
    investigation.resolved_at = now

    add_event(
        db,
        investigation,
        event_type="resolved",
        message=f"Investigation resolved. Resolution: {resolution}",
        actor_id=resolved_by_id,
        actor_name=actor_name,
        commit=False,
    )

    db.commit()
    db.refresh(investigation)
    return investigation


def close_investigation(
    db: Session,
    investigation_id: uuid.UUID,
    *,
    notes: str = "",
    actor_id: uuid.UUID | None = None,
    actor_name: str | None = None,
) -> Investigation | None:
    """Permanently close an investigation (terminal state)."""
    investigation = db.get(Investigation, investigation_id)
    if investigation is None:
        return None

    now = utcnow()
    investigation.status = InvestigationStatus.CLOSED
    investigation.closed_at = now

    message = "Investigation closed."
    if notes:
        message = f"Investigation closed. Notes: {notes}"

    add_event(
        db,
        investigation,
        event_type="closed",
        message=message,
        actor_id=actor_id,
        actor_name=actor_name,
        commit=False,
    )

    db.commit()
    db.refresh(investigation)
    return investigation


# ---------------------------------------------------------------------------
# Event history
# ---------------------------------------------------------------------------

def list_events(
    db: Session,
    investigation_id: uuid.UUID,
) -> list[InvestigationEvent]:
    """Return all timeline events for an investigation in chronological order."""
    return list(
        db.scalars(
            select(InvestigationEvent)
            .where(InvestigationEvent.investigation_id == investigation_id)
            .order_by(InvestigationEvent.occurred_at.asc())
        )
    )
