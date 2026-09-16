"""Investigation management endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.anomaly import Severity
from app.models.investigation import Investigation, InvestigationStatus
from app.models.user import User
from app.schemas.investigation import (
    InvestigationAssign,
    InvestigationCreate,
    InvestigationEscalate,
    InvestigationRead,
    InvestigationResolve,
    InvestigationUpdate,
)
from app.services import investigation_service

router = APIRouter(prefix="/investigations", tags=["investigations"])


def _get_or_404(db: Session, investigation_id: uuid.UUID) -> Investigation:
    inv = investigation_service.get_investigation(db, investigation_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found."
        )
    return inv


@router.get(
    "",
    response_model=list[InvestigationRead],
    summary="List investigations with optional filters",
)
def list_investigations(
    employee_id: uuid.UUID | None = Query(None),
    assigned_to_id: uuid.UUID | None = Query(None),
    inv_status: InvestigationStatus | None = Query(None, alias="status"),
    severity: Severity | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return investigation_service.list_investigations(
        db,
        employee_id=employee_id,
        assigned_to_id=assigned_to_id,
        status=inv_status,
        severity=severity,
        offset=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=InvestigationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new investigation",
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    return investigation_service.create_investigation(
        db,
        title=payload.title,
        employee_id=payload.employee_id,
        description=payload.description,
        severity=payload.severity,
        anomaly_id=payload.anomaly_id,
        alert_id=payload.alert_id,
        created_by_id=current_user.id,
        actor_name=current_user.full_name,
    )


@router.get(
    "/{investigation_id}",
    response_model=InvestigationRead,
    summary="Get a single investigation with timeline events",
)
def get_investigation(
    investigation_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Investigation:
    return _get_or_404(db, investigation_id)


@router.patch(
    "/{investigation_id}",
    response_model=InvestigationRead,
    summary="Update an investigation or append a timeline note",
)
def update_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    """Persist the fields used by the investigation UI and record note/status events."""
    investigation = _get_or_404(db, investigation_id)
    changes = payload.model_dump(exclude_unset=True, exclude={"note"})
    for field, value in changes.items():
        setattr(investigation, field, value)
    if payload.note:
        investigation_service.add_event(
            db, investigation, event_type="note", message=payload.note,
            actor_id=current_user.id, actor_name=current_user.full_name, commit=False,
        )
    if payload.status:
        investigation_service.add_event(
            db, investigation, event_type="status_changed",
            message=f"Status changed to {payload.status}.", actor_id=current_user.id,
            actor_name=current_user.full_name, commit=False,
        )
    db.commit()
    db.refresh(investigation)
    return investigation


@router.post(
    "/{investigation_id}/assign",
    response_model=InvestigationRead,
    summary="Assign an investigation to a user",
)
def assign_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    _get_or_404(db, investigation_id)  # 404 if missing
    assignee = db.get(User, payload.assigned_to_id)
    if assignee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assignee user not found."
        )
    result = investigation_service.assign_investigation(
        db,
        investigation_id,
        assigned_to_id=payload.assigned_to_id,
        actor_name=current_user.full_name,
        assignee_name=assignee.full_name,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found."
        )
    return result


@router.post(
    "/{investigation_id}/escalate",
    response_model=InvestigationRead,
    summary="Escalate an investigation",
)
def escalate_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationEscalate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    _get_or_404(db, investigation_id)
    result = investigation_service.escalate_investigation(
        db,
        investigation_id,
        reason=payload.reason,
        new_severity=payload.severity,
        actor_name=current_user.full_name,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found."
        )
    return result


@router.post(
    "/{investigation_id}/resolve",
    response_model=InvestigationRead,
    summary="Resolve an investigation",
)
def resolve_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    _get_or_404(db, investigation_id)
    result = investigation_service.resolve_investigation(
        db,
        investigation_id,
        resolution=payload.resolution,
        resolved_by_id=current_user.id,
        actor_name=current_user.full_name,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found."
        )
    return result


@router.post(
    "/{investigation_id}/close",
    response_model=InvestigationRead,
    summary="Close a resolved investigation",
)
def close_investigation(
    investigation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Investigation:
    _get_or_404(db, investigation_id)
    result = investigation_service.close_investigation(
        db,
        investigation_id,
        actor_name=current_user.full_name,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found."
        )
    return result
