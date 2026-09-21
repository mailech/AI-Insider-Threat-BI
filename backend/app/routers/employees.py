from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee, User, UserRole, RiskLevel
from app.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/employees", tags=["Employee & Identity Management"])

@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = Query(None),
    risk_level: Optional[RiskLevel] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)
    if risk_level:
        query = query.filter(Employee.risk_level == risk_level)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Employee.name.ilike(search_pattern)) |
            (Employee.employee_id.ilike(search_pattern)) |
            (Employee.email.ilike(search_pattern)) |
            (Employee.designation.ilike(search_pattern))
        )
    return query.order_by(Employee.risk_score.desc()).all()

@router.get("/departments", response_model=List[str])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    depts = db.query(Employee.department).distinct().all()
    return [d[0] for d in depts if d[0]]

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@router.post("", response_model=EmployeeResponse)
def create_employee(
    emp_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR, UserRole.SECURITY_MANAGER]))
):
    existing = db.query(Employee).filter(Employee.employee_id == emp_data.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
        
    emp = Employee(
        employee_id=emp_data.employee_id,
        name=emp_data.name,
        email=emp_data.email,
        department=emp_data.department,
        designation=emp_data.designation,
        manager=emp_data.manager,
        device_info=emp_data.device_info or {},
        access_privileges=emp_data.access_privileges or [],
        status=emp_data.status or "Active"
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    emp_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR, UserRole.SECURITY_MANAGER]))
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    for k, v in emp_update.dict(exclude_unset=True).items():
        setattr(emp, k, v)
        
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR]))
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    db.delete(emp)
    db.commit()
    return {"status": "deleted", "employee_id": employee_id}
