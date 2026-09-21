from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Investigation, InvestigationTimeline, Incident, Employee, User, AlertSeverity
from app.schemas import InvestigationResponse, InvestigationTimelineItem
from app.auth import get_current_user

router = APIRouter(prefix="/investigations", tags=["Threat Investigation Workflows"])

class NoteCreate(BaseModel):
    text: str

class EvidenceCreate(BaseModel):
    type: str  # PCAP, Hash, Registry, Screenshot, Email, Disk
    name: str
    hash: Optional[str] = "N/A"
    description: Optional[str] = None

class TimelineEventCreate(BaseModel):
    event_title: str
    event_type: str
    severity: AlertSeverity = AlertSeverity.MEDIUM
    details: str

class ContainmentAction(BaseModel):
    action: str  # "disable_user", "isolate_endpoint", "block_usb", "reset_mfa", "revoke_cloud_keys"

@router.get("", response_model=List[InvestigationResponse])
def list_investigations(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Investigation)
    if status:
        query = query.filter(Investigation.status == status)
    return query.order_by(Investigation.created_at.desc()).limit(limit).all()

@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

@router.post("/{investigation_id}/notes")
def add_investigator_note(
    investigation_id: str,
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    notes = list(inv.investigator_notes or [])
    notes.append({
        "author": current_user.name,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "text": note.text
    })
    inv.investigator_notes = notes
    db.commit()
    return {"status": "success", "notes": inv.investigator_notes}

@router.post("/{investigation_id}/evidence")
def add_threat_evidence(
    investigation_id: str,
    evidence: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    items = list(inv.evidence_items or [])
    items.append({
        "id": len(items) + 1,
        "type": evidence.type,
        "name": evidence.name,
        "hash": evidence.hash,
        "description": evidence.description,
        "added_by": current_user.name,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    })
    inv.evidence_items = items
    db.commit()
    return {"status": "success", "evidence_items": inv.evidence_items}

@router.post("/{investigation_id}/timeline", response_model=InvestigationTimelineItem)
def add_timeline_event(
    investigation_id: str,
    event: TimelineEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    tl = InvestigationTimeline(
        investigation_id=investigation_id,
        timestamp=datetime.utcnow(),
        event_title=event.event_title,
        event_type=event.event_type,
        severity=event.severity,
        details=event.details
    )
    db.add(tl)
    db.commit()
    db.refresh(tl)
    return tl

@router.post("/{investigation_id}/execute-containment")
def execute_containment_action(
    investigation_id: str,
    action_req: ContainmentAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    emp = db.query(Employee).filter(Employee.employee_id == inv.employee_id).first()
    if emp:
        if action_req.action == "disable_user":
            emp.status = "Suspended"
        elif action_req.action == "isolate_endpoint":
            emp.status = "Quarantined"
            
    # Add timeline event
    tl = InvestigationTimeline(
        investigation_id=investigation_id,
        timestamp=datetime.utcnow(),
        event_title=f"Containment Action Executed: {action_req.action.replace('_', ' ').title()}",
        event_type="Response Action",
        severity=AlertSeverity.HIGH,
        details=f"SOC Analyst {current_user.name} executed immediate remediation: {action_req.action}"
    )
    db.add(tl)
    db.commit()
    
    return {
        "status": "success",
        "action": action_req.action,
        "employee_status": emp.status if emp else "Unknown",
        "executed_by": current_user.name
    }
