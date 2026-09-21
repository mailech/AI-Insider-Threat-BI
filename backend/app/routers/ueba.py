from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BehavioralProfile, Employee, User
from app.schemas import BehavioralProfileResponse
from app.auth import get_current_user
from app.services.ueba_service import calculate_department_peer_baselines, compute_employee_peer_comparison

router = APIRouter(prefix="/ueba", tags=["UEBA Behavioral Intelligence"])

@router.get("/profiles", response_model=List[BehavioralProfileResponse])
def get_behavioral_profiles(
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BehavioralProfile).join(Employee)
    if department:
        query = query.filter(Employee.department == department)
    return query.order_by(BehavioralProfile.peer_group_deviation.desc()).limit(limit).all()

@router.get("/peer-baselines")
def get_peer_group_baselines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return calculate_department_peer_baselines(db)

@router.get("/peer-comparison/{employee_id}")
def get_employee_peer_comparison(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    peer_baselines = calculate_department_peer_baselines(db)
    comparison = compute_employee_peer_comparison(emp, peer_baselines)
    return comparison
