from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeRead,
    EmployeeListResponse,
    ContainmentResponse
)

router = APIRouter(prefix="/employees", tags=["Monitored Identities"])


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    search: Optional[str] = None,
    department: Optional[str] = None,
    risk_level: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    sort_by: str = Query("score", pattern="^(score|name|id|department|risk_level)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves a paginated, filterable directory of monitored corporate identities."""
    query = db.query(Employee)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Employee.name.ilike(s),
                Employee.id.ilike(s),
                Employee.department.ilike(s),
                Employee.role.ilike(s),
                Employee.email.ilike(s)
            )
        )

    if department and department != "All":
        query = query.filter(Employee.department == department)

    if risk_level and risk_level != "All":
        query = query.filter(Employee.risk_level == risk_level)

    if status_filter and status_filter != "All":
        query = query.filter(Employee.status == status_filter)

    total = query.count()

    # Sorting
    col = getattr(Employee, sort_by)
    if order == "desc":
        query = query.order_by(desc(col))
    else:
        query = query.order_by(asc(col))

    # Pagination
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return EmployeeListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[EmployeeRead.model_validate(emp) for emp in items]
    )


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    """Retrieves full behavioral dossier for a monitored employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity #{employee_id} not found in monitored database."
        )
    return EmployeeRead.model_validate(emp)


@router.post("/{employee_id}/lock", response_model=ContainmentResponse)
def lock_employee_account(employee_id: str, db: Session = Depends(get_db)):
    """Executes immediate isolation containment directive on the identity."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity #{employee_id} not found."
        )

    emp.status = "Locked"
    emp.risk_level = "Low"
    emp.score = 0
    emp.last_activity = "Account locked by analyst containment directive"
    db.commit()
    db.refresh(emp)

    return ContainmentResponse(
        id=emp.id,
        status=emp.status,
        score=emp.score,
        risk_level=emp.risk_level,
        message=f"Credentials for {emp.name} have been suspended and sessions isolated."
    )


@router.post("/{employee_id}/reset-score", response_model=ContainmentResponse)
def reset_employee_score(employee_id: str, db: Session = Depends(get_db)):
    """Recalibrates behavioral threat score back to standard baseline (15 / 100)."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity #{employee_id} not found."
        )

    emp.status = "Active"
    emp.risk_level = "Low"
    emp.score = 15
    emp.last_activity = "Behavioral risk score recalibrated to baseline"
    db.commit()
    db.refresh(emp)

    return ContainmentResponse(
        id=emp.id,
        status=emp.status,
        score=emp.score,
        risk_level=emp.risk_level,
        message=f"Threat score for {emp.name} reset to baseline."
    )


@router.post("/{employee_id}/dismiss-flag", response_model=ContainmentResponse)
def dismiss_employee_flag(employee_id: str, db: Session = Depends(get_db)):
    """Dismisses active security flag on an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity #{employee_id} not found."
        )

    emp.status = "Active"
    emp.risk_level = "Low"
    emp.score = min(emp.score, 20)
    emp.last_activity = "Security flag cleared by analyst"
    db.commit()
    db.refresh(emp)

    return ContainmentResponse(
        id=emp.id,
        status=emp.status,
        score=emp.score,
        risk_level=emp.risk_level,
        message=f"Security flag cleared for {emp.name}."
    )
