from typing import Any, List, Optional
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.incident import Incident, IncidentComment
from backend.app.schemas.incident import (
    IncidentResponse, IncidentCreate, IncidentUpdate,
    IncidentCommentCreate, IncidentCommentResponse
)
from backend.app.api.deps import get_current_user, record_audit

router = APIRouter()


@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    user_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    assigned_analyst: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List all security incidents and forensic cases.
    """
    query = db.query(Incident)

    if user_id:
        query = query.filter(Incident.user_id.ilike(f"%{user_id}%"))
    if severity and severity != "ALL":
        query = query.filter(Incident.severity == severity)
    if status_filter and status_filter != "ALL":
        query = query.filter(Incident.status == status_filter)
    if assigned_analyst:
        query = query.filter(Incident.assigned_analyst == assigned_analyst)

    return query.order_by(desc(Incident.id)).offset(skip).limit(limit).all()


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create a new incident investigation case.
    """
    incident_id = incident_in.incident_id or f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    
    incident = Incident(
        incident_id=incident_id,
        title=incident_in.title,
        user_id=incident_in.user_id,
        severity=incident_in.severity,
        status=incident_in.status or "OPEN",
        assigned_analyst=incident_in.assigned_analyst or current_user.full_name,
        description=incident_in.description,
        evidence_references=incident_in.evidence_references or [],
        root_cause=incident_in.root_cause,
        resolution=incident_in.resolution
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    record_audit(db, current_user.username, current_user.role, "CREATE_INCIDENT", f"/api/incidents/{incident.incident_id}")
    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get incident investigation details, evidence references, and case comments.
    """
    incident = db.query(Incident).filter(
        (Incident.incident_id == incident_id) | (Incident.id == int(incident_id) if incident_id.isdigit() else False)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    incident_in: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update incident investigation case status, resolution, and assigned analyst.
    """
    incident = db.query(Incident).filter(
        (Incident.incident_id == incident_id) | (Incident.id == int(incident_id) if incident_id.isdigit() else False)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident_in.title is not None:
        incident.title = incident_in.title
    if incident_in.severity is not None:
        incident.severity = incident_in.severity
    if incident_in.status is not None:
        incident.status = incident_in.status
    if incident_in.assigned_analyst is not None:
        incident.assigned_analyst = incident_in.assigned_analyst
    if incident_in.description is not None:
        incident.description = incident_in.description
    if incident_in.evidence_references is not None:
        incident.evidence_references = incident_in.evidence_references
    if incident_in.root_cause is not None:
        incident.root_cause = incident_in.root_cause
    if incident_in.resolution is not None:
        incident.resolution = incident_in.resolution

    db.commit()
    db.refresh(incident)

    record_audit(db, current_user.username, current_user.role, "UPDATE_INCIDENT", f"/api/incidents/{incident.incident_id}", {"status": incident.status})
    return incident


@router.post("/{incident_id}/comments", response_model=IncidentCommentResponse, status_code=status.HTTP_201_CREATED)
def add_incident_comment(
    incident_id: str,
    comment_in: IncidentCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Add analyst note/comment to an incident investigation timeline.
    """
    incident = db.query(Incident).filter(
        (Incident.incident_id == incident_id) | (Incident.id == int(incident_id) if incident_id.isdigit() else False)
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    comment = IncidentComment(
        incident_id=incident.incident_id,
        author=current_user.full_name or current_user.username,
        comment=comment_in.comment,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment
