from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, Investigation, User, IncidentStatus, AlertSeverity
from app.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from app.auth import get_current_user

router = APIRouter(prefix="/incidents", tags=["Threat Incident Management"])

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[IncidentStatus] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    assigned_analyst: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if assigned_analyst:
        query = query.filter(Incident.assigned_analyst.ilike(f"%{assigned_analyst}%"))
    return query.order_by(Incident.created_at.desc()).limit(limit).all()

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.post("", response_model=IncidentResponse)
def create_incident(inc_data: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    inc_id = f"INC-{now.strftime('%Y%m%d%H%M')}-{inc_data.employee_id}"
    
    incident = Incident(
        incident_id=inc_id,
        title=inc_data.title,
        description=inc_data.description,
        severity=inc_data.severity,
        status=IncidentStatus.OPEN,
        employee_id=inc_data.employee_id,
        assigned_analyst=inc_data.assigned_analyst or current_user.name,
        containment_actions=inc_data.containment_actions or []
    )
    db.add(incident)
    
    # Auto-create investigation workspace
    inv_id = f"INV-{now.strftime('%Y%m%d%H%M')}-{inc_data.employee_id}"
    investigation = Investigation(
        investigation_id=inv_id,
        incident_id=inc_id,
        employee_id=inc_data.employee_id,
        lead_analyst=inc_data.assigned_analyst or current_user.name,
        status="In Progress",
        findings="Case initialized.",
        evidence_items=[],
        investigator_notes=[]
    )
    db.add(investigation)
    
    db.commit()
    db.refresh(incident)
    return incident

@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    inc_update: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    for k, v in inc_update.dict(exclude_unset=True).items():
        if v is not None:
            setattr(incident, k, v)
            
    db.commit()
    db.refresh(incident)
    return incident
