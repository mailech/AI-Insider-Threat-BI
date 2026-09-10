"""Employee identity, department and asset management (module 2)."""
from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst, require_manager
from app.db.session import get_db
from app.models.activity import ActivityEvent
from app.models.anomaly import Anomaly
from app.models.employee import Asset, Department, Employee
from app.models.enums import EmploymentStatus, IncidentStatus, RiskCategory
from app.models.incident import Incident
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.employee import (
    AssetCreate,
    AssetOut,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeDetail,
    EmployeeOut,
    EmployeeUpdate,
)
from app.services import audit

router = APIRouter(tags=["Employees & Identity"])


def to_employee_out(employee: Employee) -> dict:
    data = {
        column.name: getattr(employee, column.name) for column in Employee.__table__.columns
    }
    data["department_name"] = employee.department.name if employee.department else None
    data["manager_name"] = employee.manager.full_name if employee.manager else None
    return data


# ------------------------------------------------------------- departments
@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(_: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    rows = db.execute(select(Department).order_by(Department.name)).scalars().all()
    out = []
    for dept in rows:
        payload = {c.name: getattr(dept, c.name) for c in Department.__table__.columns}
        payload["employee_count"] = int(
            db.execute(
                select(func.count(Employee.id)).where(Employee.department_id == dept.id)
            ).scalar_one()
        )
        out.append(payload)
    return out


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    if db.execute(select(Department).where(Department.name == payload.name)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department already exists")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.flush()
    audit.record(db, "department.create", user, "department", dept.id, payload.name, client_ip(request))
    db.commit()
    db.refresh(dept)
    return {**{c.name: getattr(dept, c.name) for c in Department.__table__.columns}, "employee_count": 0}


@router.patch("/departments/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dept, field, value)
    audit.record(db, "department.update", user, "department", dept.id, None, client_ip(request))
    db.commit()
    db.refresh(dept)
    count = int(
        db.execute(select(func.count(Employee.id)).where(Employee.department_id == dept.id)).scalar_one()
    )
    return {**{c.name: getattr(dept, c.name) for c in Department.__table__.columns}, "employee_count": count}


# --------------------------------------------------------------- employees
@router.get("/employees", response_model=Page[EmployeeOut])
def list_employees(
    q: Optional[str] = None,
    department_id: Optional[int] = None,
    risk_category: Optional[RiskCategory] = None,
    employment_status: Optional[EmploymentStatus] = None,
    on_watchlist: Optional[bool] = None,
    is_privileged: Optional[bool] = None,
    sort: str = Query("risk", pattern="^(risk|name|code|created)$"),
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(Employee)
    if q:
        pattern = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Employee.full_name).like(pattern),
                func.lower(Employee.email).like(pattern),
                func.lower(Employee.employee_code).like(pattern),
            )
        )
    if department_id:
        stmt = stmt.where(Employee.department_id == department_id)
    if risk_category:
        stmt = stmt.where(Employee.current_risk_category == risk_category.value)
    if employment_status:
        stmt = stmt.where(Employee.employment_status == employment_status.value)
    if on_watchlist is not None:
        stmt = stmt.where(Employee.on_watchlist.is_(on_watchlist))
    if is_privileged is not None:
        stmt = stmt.where(Employee.is_privileged.is_(is_privileged))

    order = {
        "risk": Employee.current_risk_score.desc(),
        "name": Employee.full_name.asc(),
        "code": Employee.employee_code.asc(),
        "created": Employee.created_at.desc(),
    }[sort]

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(stmt.order_by(order).offset((page - 1) * size).limit(size)).scalars().all()
    return {
        "items": [to_employee_out(e) for e in rows],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    """Employee onboarding."""
    if db.execute(
        select(Employee).where(Employee.employee_code == payload.employee_code)
    ).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee code already exists")
    if payload.department_id and not db.get(Department, payload.department_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")

    data = payload.model_dump()
    data["employment_status"] = payload.employment_status.value
    employee = Employee(**data)
    db.add(employee)
    db.flush()
    audit.record(
        db, "employee.onboard", user, "employee", employee.id, payload.employee_code, client_ip(request)
    )
    db.commit()
    db.refresh(employee)
    return to_employee_out(employee)


@router.get("/employees/{employee_id}", response_model=EmployeeDetail)
def get_employee(
    employee_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)
) -> Any:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    data = to_employee_out(employee)
    data["assets"] = list(employee.assets)
    data["total_events"] = int(
        db.execute(
            select(func.count(ActivityEvent.id)).where(ActivityEvent.employee_id == employee_id)
        ).scalar_one()
    )
    data["open_anomalies"] = int(
        db.execute(
            select(func.count(Anomaly.id)).where(
                Anomaly.employee_id == employee_id, Anomaly.reviewed.is_(False)
            )
        ).scalar_one()
    )
    data["open_incidents"] = int(
        db.execute(
            select(func.count(Incident.id)).where(
                Incident.employee_id == employee_id,
                Incident.status.notin_([IncidentStatus.CLOSED.value, IncidentStatus.RESOLVED.value]),
            )
        ).scalar_one()
    )
    return data


@router.patch("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("employment_status") is not None:
        data["employment_status"] = (
            data["employment_status"].value
            if isinstance(data["employment_status"], EmploymentStatus)
            else data["employment_status"]
        )
    for field, value in data.items():
        setattr(employee, field, value)
    audit.record(db, "employee.update", user, "employee", employee.id, str(data), client_ip(request))
    db.commit()
    db.refresh(employee)
    return to_employee_out(employee)


@router.delete("/employees/{employee_id}", response_model=Message)
def offboard_employee(
    employee_id: int,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    employee.employment_status = EmploymentStatus.TERMINATED.value
    audit.record(db, "employee.offboard", user, "employee", employee.id, None, client_ip(request))
    db.commit()
    return {"detail": f"Employee {employee.employee_code} marked as terminated"}


# ------------------------------------------------------------------ assets
@router.get("/employees/{employee_id}/assets", response_model=List[AssetOut])
def list_assets(
    employee_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)
) -> Any:
    if not db.get(Employee, employee_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return list(
        db.execute(select(Asset).where(Asset.employee_id == employee_id)).scalars().all()
    )


@router.post("/assets", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    """Associate a device / asset with an employee."""
    if not db.get(Employee, payload.employee_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    asset = Asset(**payload.model_dump())
    db.add(asset)
    db.flush()
    audit.record(db, "asset.create", user, "asset", asset.id, payload.asset_tag, client_ip(request))
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/assets/{asset_id}", response_model=Message)
def delete_asset(
    asset_id: int,
    request: Request,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    tag = asset.asset_tag
    db.delete(asset)
    audit.record(db, "asset.delete", user, "asset", asset_id, tag, client_ip(request))
    db.commit()
    return {"detail": f"Asset {tag} removed"}
