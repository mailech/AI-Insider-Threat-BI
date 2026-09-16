"""Employee management endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.anomaly import AnomalyStatus
from app.models.employee import Device, Employee
from app.models.department import Department
from app.models.risk import RiskScore
from app.models.user import User
from app.schemas.employee import (
    DepartmentSummary,
    DepartmentCreate, DepartmentRead, DepartmentUpdate,
    EmployeeCreate,
    EmployeeRead,
    EmployeeUpdate,
)

router = APIRouter(prefix="/employees", tags=["employees"])


def _department_read(db: Session, dept: Department) -> DepartmentRead:
    return DepartmentRead(
        id=dept.id, code=dept.code, name=dept.name,
        head_employee_id=dept.head_employee_id,
        employee_count=db.scalar(select(func.count(Employee.id)).where(Employee.department == dept.name)) or 0,
    )


# ── helpers ─────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, employee_id: uuid.UUID) -> Employee:
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return emp


# ── routes ──────────────────────────────────────────────────────────────────

@router.get(
    "/departments",
    response_model=list[DepartmentSummary],
    summary="Per-department headcount, open anomaly count, and average risk score",
)
def list_departments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DepartmentSummary]:
    # Pull distinct departments
    departments = [
        row[0]
        for row in db.execute(
            select(Employee.department).distinct().order_by(Employee.department)
        )
    ]

    from app.models.anomaly import Anomaly
    from app.services import risk_service

    summaries: list[DepartmentSummary] = []
    for dept in departments:
        emp_ids = list(
            db.scalars(
                select(Employee.id).where(Employee.department == dept)
            )
        )
        count = len(emp_ids)
        open_anomalies = 0
        if emp_ids:
            open_anomalies = db.scalar(
                select(func.count(Anomaly.id)).where(
                    Anomaly.employee_id.in_(emp_ids),
                    Anomaly.status == AnomalyStatus.OPEN,
                )
            ) or 0

        # Average risk score
        latest_scores = risk_service.latest_scores(db)
        dept_scores = [
            s.risk_score for eid, s in latest_scores.items() if eid in emp_ids
        ]
        avg_risk = round(sum(dept_scores) / len(dept_scores), 2) if dept_scores else 0.0

        summaries.append(
            DepartmentSummary(
                department=dept,
                employee_count=count,
                open_anomalies=open_anomalies,
                average_risk_score=avg_risk,
            )
        )
    return summaries


@router.get("/departments/managed", response_model=list[DepartmentRead])
def list_managed_departments(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[DepartmentRead]:
    return [_department_read(db, dept) for dept in db.scalars(select(Department).order_by(Department.name))]


@router.post("/departments/managed", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DepartmentRead:
    if db.scalars(select(Department).where((Department.code == payload.code) | (Department.name == payload.name))).first():
        raise HTTPException(status_code=409, detail="Department code or name already exists.")
    dept = Department(**payload.model_dump()); db.add(dept); db.commit(); db.refresh(dept)
    return _department_read(db, dept)


@router.patch("/departments/managed/{department_id}", response_model=DepartmentRead)
def update_department(department_id: uuid.UUID, payload: DepartmentUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DepartmentRead:
    dept = db.get(Department, department_id)
    if not dept: raise HTTPException(status_code=404, detail="Department not found.")
    changes = payload.model_dump(exclude_unset=True)
    old_name = dept.name
    for field, value in changes.items(): setattr(dept, field, value)
    if "name" in changes and changes["name"] != old_name:
        db.execute(Employee.__table__.update().where(Employee.department == old_name).values(department=changes["name"]))
    db.commit(); db.refresh(dept)
    return _department_read(db, dept)


@router.get(
    "",
    response_model=list[EmployeeRead],
    summary="List all employees",
)
def list_employees(
    department: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Employee]:
    q = select(Employee).order_by(Employee.employee_code).offset(skip).limit(limit)
    if department:
        q = q.where(Employee.department == department)
    return list(db.scalars(q))


@router.post(
    "",
    response_model=EmployeeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee",
)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Employee:
    existing = db.scalars(
        select(Employee).where(Employee.employee_code == payload.employee_code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee code '{payload.employee_code}' already exists.",
        )
    emp = Employee(
        employee_code=payload.employee_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        department=payload.department,
        designation=payload.designation,
        manager=payload.manager,
        access_level=payload.access_level,
        access_privileges=payload.access_privileges,
    )
    db.add(emp)
    db.flush()  # get emp.id before inserting devices

    for dev in payload.devices:
        db.add(
            Device(
                employee_id=emp.id,
                name=dev.name,
                device_type=dev.device_type,
                operating_system=dev.operating_system,
                serial_number=dev.serial_number,
            )
        )

    db.commit()
    db.refresh(emp)
    return emp


@router.get(
    "/{employee_id}",
    response_model=EmployeeRead,
    summary="Get a single employee",
)
def get_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Employee:
    return _get_or_404(db, employee_id)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeRead,
    summary="Update an employee",
)
def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Employee:
    emp = _get_or_404(db, employee_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an employee",
)
def delete_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    emp = _get_or_404(db, employee_id)
    db.delete(emp)
    db.commit()
