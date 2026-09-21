from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, User, UserRole
from app.schemas import SimulationRequest
from app.auth import require_roles
from app.services.ml_service import run_complete_behavioral_intelligence_pipeline
from app.services.simulation_service import inject_realtime_threat_simulation

router = APIRouter(prefix="/admin", tags=["System Administration & Simulation"])

@router.post("/retrain-ml")
def trigger_ml_retraining(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR, UserRole.SOC_ENGINEER]))
):
    result = run_complete_behavioral_intelligence_pipeline(db, num_days=30)
    
    db.add(AuditLog(
        user_email=current_user.email,
        action="ML_PIPELINE_RETRAINED",
        resource="/admin/retrain-ml",
        details=f"Models retrained: {result.get('models_executed')}. {result.get('employees_processed')} employees scored."
    ))
    db.commit()
    
    return result

@router.post("/simulate-attack")
def trigger_attack_simulation(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR, UserRole.SOC_ENGINEER, UserRole.SECURITY_ANALYST]))
):
    sim_result = inject_realtime_threat_simulation(
        db=db,
        scenario=req.scenario,
        employee_id=req.target_employee_id
    )
    
    db.add(AuditLog(
        user_email=current_user.email,
        action="SIMULATION_INJECTED",
        resource="/admin/simulate-attack",
        details=f"Scenario: {req.scenario} against target {req.target_employee_id or 'auto-selected'}."
    ))
    db.commit()
    
    return sim_result

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR]))
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
