from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ThreatAlert, Incident, Investigation, AlertSeverity, IncidentStatus, User, UserRole
from app.schemas import AlertCreate, AlertResponse
from app.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["Threat Alerts & Incident Generation"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[AlertSeverity] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ThreatAlert)
    if severity:
        query = query.filter(ThreatAlert.severity == severity)
    if status:
        query = query.filter(ThreatAlert.status == status)
    if employee_id:
        query = query.filter(ThreatAlert.employee_id == employee_id)
    return query.order_by(ThreatAlert.timestamp.desc()).limit(limit).all()

@router.post("", response_model=AlertResponse)
def create_alert(alert_data: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    alert_id = f"ALT-{now.strftime('%Y%m%d%H%M%S')}-{alert_data.employee_id}"
    alert = ThreatAlert(
        alert_id=alert_id,
        employee_id=alert_data.employee_id,
        title=alert_data.title,
        description=alert_data.description,
        severity=alert_data.severity,
        status="New",
        source_engine=alert_data.source_engine or "Analyst Submission",
        anomaly_score=alert_data.anomaly_score or 0.0,
        risk_score=alert_data.risk_score or 0.0
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(ThreatAlert).filter(ThreatAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_acknowledged = True
    alert.status = "Acknowledged"
    alert.acknowledged_by = current_user.name
    db.commit()
    return {"status": "success", "alert_id": alert_id, "acknowledged_by": current_user.name}

@router.post("/{alert_id}/convert-to-incident")
def convert_alert_to_incident(alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(ThreatAlert).filter(ThreatAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    now = datetime.utcnow()
    inc_id = f"INC-{now.strftime('%Y%m%d')}-{alert.employee_id}"
    
    incident = Incident(
        incident_id=inc_id,
        title=f"Investigating: {alert.title}",
        description=alert.description,
        severity=alert.severity,
        status=IncidentStatus.OPEN,
        employee_id=alert.employee_id,
        assigned_analyst=current_user.name,
        containment_actions=["Automated Log Ingestion Triggered"]
    )
    db.add(incident)
    
    # Create matching investigation
    inv_id = f"INV-{now.strftime('%Y%m%d')}-{alert.employee_id}"
    investigation = Investigation(
        investigation_id=inv_id,
        incident_id=inc_id,
        employee_id=alert.employee_id,
        lead_analyst=current_user.name,
        status="In Progress",
        findings="Case opened directly from high-severity alert.",
        evidence_items=[],
        investigator_notes=[{
            "author": current_user.name,
            "timestamp": now.strftime("%Y-%m-%d %H:%M"),
            "text": f"Incident converted from Alert {alert_id}."
        }]
    )
    db.add(investigation)
    
    alert.status = "Converted to Incident"
    db.commit()
    
    return {
        "status": "success",
        "incident_id": inc_id,
        "investigation_id": inv_id,
        "assigned_analyst": current_user.name
    }
