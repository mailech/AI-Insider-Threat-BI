"""Employee identity and profile management."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import any_role, manager_or_admin
from app.db.session import get_db
from app.models.activity import ActivityEvent
from app.models.employee import AccessPrivilege, Device, Employee
from app.models.enums import EmployeeStatus
from app.models.user import User
from app.schemas.activity import ActivityEventRead, Page
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeDetail,
    EmployeeRead,
    EmployeeUpdate,
    PrivilegeCreate,
    PrivilegeRead,
)

router = APIRouter(prefix="/employees", tags=["employees"])


def _get_or_404(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )
    return employee


def _assert_unique(db: Session, payload, exclude_id: int | None = None) -> None:
    clauses = []
    if getattr(payload, "employee_code", None):
        clauses.append(Employee.employee_code == payload.employee_code)
    if getattr(payload, "email", None):
        clauses.append(Employee.email == payload.email)
    if not clauses:
        return

    query = select(Employee).where(or_(*clauses))
    if exclude_id is not None:
        query = query.where(Employee.id != exclude_id)
    if db.scalar(query) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee code or email is already in use",
        )


@router.get("", response_model=Page[EmployeeRead])
def list_employees(
    q: str | None = None,
    department_id: int | None = None,
    employee_status: EmployeeStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(any_role),
) -> Page[EmployeeRead]:
    query = select(Employee).options(selectinload(Employee.department))
    count_query = select(func.count()).select_from(Employee)

    filters = []
    if q:
        pattern = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(Employee.full_name).like(pattern),
                func.lower(Employee.email).like(pattern),
                func.lower(Employee.employee_code).like(pattern),
                func.lower(Employee.designation).like(pattern),
            )
        )
    if department_id is not None:
        filters.append(Employee.department_id == department_id)
    if employee_status is not None:
        filters.append(Employee.status == employee_status)

    for clause in filters:
        query = query.where(clause)
        count_query = count_query.where(clause)

    total = db.scalar(count_query) or 0
    rows = db.scalars(
        query.order_by(Employee.full_name).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return Page[EmployeeRead](
        items=[EmployeeRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=EmployeeDetail, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Employee:
    _assert_unique(db, payload)
    if payload.manager_id is not None:
        _get_or_404(db, payload.manager_id)

    employee = Employee(**payload.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee(
    employee_id: int, db: Session = Depends(get_db), _: User = Depends(any_role)
) -> Employee:
    return _get_or_404(db, employee_id)


@router.patch("/{employee_id}", response_model=EmployeeDetail)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Employee:
    employee = _get_or_404(db, employee_id)
    _assert_unique(db, payload, exclude_id=employee_id)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("manager_id") == employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee cannot be their own manager",
        )
    if updates.get("manager_id") is not None:
        _get_or_404(db, updates["manager_id"])

    for field, value in updates.items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> None:
    employee = _get_or_404(db, employee_id)
    db.delete(employee)
    db.commit()


@router.get("/{employee_id}/activities", response_model=list[ActivityEventRead])
def employee_activities(
    employee_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(any_role),
) -> list[ActivityEventRead]:
    _get_or_404(db, employee_id)
    rows = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.employee_id == employee_id)
        .order_by(ActivityEvent.timestamp.desc())
        .limit(limit)
    ).all()
    return [ActivityEventRead.model_validate(row) for row in rows]


@router.get("/{employee_id}/devices", response_model=list[dict])
def employee_devices(
    employee_id: int, db: Session = Depends(get_db), _: User = Depends(any_role)
) -> list[dict]:
    employee = _get_or_404(db, employee_id)
    return [
        {
            "id": device.id,
            "employee_id": device.employee_id,
            "hostname": device.hostname,
            "device_type": device.device_type.value,
            "os": device.os,
            "mac_address": device.mac_address,
            "is_managed": device.is_managed,
        }
        for device in employee.devices
    ]


@router.get("/{employee_id}/privileges", response_model=list[PrivilegeRead])
def employee_privileges(
    employee_id: int, db: Session = Depends(get_db), _: User = Depends(any_role)
) -> list[AccessPrivilege]:
    return _get_or_404(db, employee_id).privileges


@router.post(
    "/{employee_id}/privileges",
    response_model=PrivilegeRead,
    status_code=status.HTTP_201_CREATED,
)
def add_privilege(
    employee_id: int,
    payload: PrivilegeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> AccessPrivilege:
    _get_or_404(db, employee_id)
    privilege = AccessPrivilege(
        employee_id=employee_id, name=payload.name, level=payload.level
    )
    db.add(privilege)
    db.commit()
    db.refresh(privilege)
    return privilege


@router.delete("/{employee_id}/privileges/{privilege_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_privilege(
    employee_id: int,
    privilege_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> None:
    privilege = db.get(AccessPrivilege, privilege_id)
    if privilege is None or privilege.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Privilege not found"
        )
    db.delete(privilege)
    db.commit()
