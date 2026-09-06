from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=list[schemas.EmployeeOut])
def list_employees(
    department: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Employee)
    if department:
        q = q.filter(models.Employee.department == department)
    return q.order_by(models.Employee.full_name).all()


@router.get("/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("", response_model=schemas.EmployeeOut)
def create_employee(
    payload: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "security_manager")),
):
    emp = models.Employee(**payload.dict())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.get("/{employee_id}/baseline", response_model=schemas.BaselineOut)
def get_baseline(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    baseline = (
        db.query(models.BehaviorBaseline)
        .filter(models.BehaviorBaseline.employee_id == employee_id)
        .first()
    )
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not yet generated")
    return baseline


@router.get("/{employee_id}/timeline", response_model=list[schemas.ActivityOut])
def get_employee_timeline(
    employee_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ActivityEvent)
        .filter(models.ActivityEvent.employee_id == employee_id)
        .order_by(models.ActivityEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
