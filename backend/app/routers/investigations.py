from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(tags=["investigations"])


# ---------------- Alerts ----------------
@router.get("/api/alerts", response_model=list[schemas.AlertOut])
def list_alerts(
    status: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Alert)
    if status:
        q = q.filter(models.Alert.status == status)
    if severity:
        q = q.filter(models.Alert.severity == severity)
    return q.order_by(models.Alert.created_at.desc()).all()


@router.patch("/api/alerts/{alert_id}", response_model=schemas.AlertOut)
def update_alert(
    alert_id: str,
    payload: schemas.AlertUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if payload.status:
        alert.status = payload.status
        if payload.status in ("resolved", "dismissed"):
            alert.resolved_at = datetime.utcnow()
    if payload.assigned_to:
        alert.assigned_to = payload.assigned_to
    db.commit()
    db.refresh(alert)
    return alert


# ---------------- Incidents ----------------
@router.get("/api/incidents", response_model=list[schemas.IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Incident).order_by(models.Incident.created_at.desc()).all()


@router.post("/api/incidents", response_model=schemas.IncidentOut)
def create_incident(
    payload: schemas.IncidentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    incident = models.Incident(
        employee_id=payload.employee_id,
        title=payload.title,
        summary=payload.summary,
        created_by=current_user.id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/api/incidents/{incident_id}/notes", response_model=list[schemas.NoteOut])
def list_notes(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.InvestigationNote)
        .filter(models.InvestigationNote.incident_id == incident_id)
        .order_by(models.InvestigationNote.created_at)
        .all()
    )


@router.post("/api/incidents/notes", response_model=schemas.NoteOut)
def add_note(
    payload: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = models.InvestigationNote(
        incident_id=payload.incident_id, author_id=current_user.id, note=payload.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
