"""
ITBIS — Employee Identity Endpoints  (Module 2)
Routes:
  POST   /api/v1/employees/                  — create employee profile
  GET    /api/v1/employees/                  — list employees (paginated + filtered)
  GET    /api/v1/employees/{emp_id}          — retrieve employee detail with assets
  POST   /api/v1/employees/{emp_id}/assets   — associate an asset with an employee
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.domain import Asset, AssetTypeEnum, Employee, RiskCategoryEnum, RoleEnum, User
from app.schemas.schemas import (
    AssetRead,
    EmployeeCreate,
    EmployeeRead,
)

router = APIRouter(prefix="/employees", tags=["Employee Identity"])


# ─────────────────────────────────────────────────────────────
# Inline body schema for asset creation (employee_id derived from path)
# ─────────────────────────────────────────────────────────────

class AssetBody(BaseModel):
    """Payload for associating a new asset with an employee via path."""
    asset_id:    str                    = Field(..., examples=["ASSET-7721"])
    asset_type:  AssetTypeEnum
    ip_address:  Optional[str]          = Field(default=None, examples=["192.168.10.45"])
    mac_address: Optional[str]          = Field(
                                           default=None,
                                           pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$",
                                           examples=["AA:BB:CC:DD:EE:FF"],
                                         )


# ─────────────────────────────────────────────────────────────
# POST /api/v1/employees/  — Create employee
# ─────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=EmployeeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee profile",
    description=(
        "Onboard a new monitored employee. "
        "Requires **SECURITY_MANAGER** or **ADMINISTRATOR** role."
    ),
)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles([RoleEnum.SECURITY_MANAGER, RoleEnum.ADMINISTRATOR])
    ),
) -> EmployeeRead:
    # Prevent duplicate emp_id
    existing = db.query(Employee).filter(Employee.emp_id == payload.emp_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with emp_id '{payload.emp_id}' already exists.",
        )

    employee = Employee(
        emp_id=payload.emp_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        department=payload.department,
        designation=payload.designation,
        manager_name=payload.manager_name,
        device_id=payload.device_id,
        ip_address=payload.ip_address,
        os_type=payload.os_type,
        access_level=payload.access_level,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


# ─────────────────────────────────────────────────────────────
# GET /api/v1/employees/  — List employees (paginated + filtered)
# ─────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=List[EmployeeRead],
    summary="List all employees",
    description=(
        "Returns a paginated list of employee profiles. "
        "Optionally filter by **department** or **risk_category**. "
        "All authenticated users may access this endpoint."
    ),
)
def list_employees(
    skip:          int                      = Query(default=0,   ge=0,   description="Records to skip (offset)"),
    limit:         int                      = Query(default=25,  ge=1, le=200, description="Max records to return"),
    department:    Optional[str]            = Query(default=None, description="Filter by department name (case-insensitive contains)"),
    risk_category: Optional[RiskCategoryEnum] = Query(default=None, description="Filter by risk category"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> List[EmployeeRead]:
    query = db.query(Employee)

    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))
    if risk_category:
        query = query.filter(Employee.risk_category == risk_category)

    employees = query.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()
    return employees


# ─────────────────────────────────────────────────────────────
# GET /api/v1/employees/{emp_id}  — Retrieve employee detail
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{emp_id}",
    response_model=EmployeeRead,
    summary="Retrieve an employee's full profile",
    description=(
        "Returns the full profile for the given **emp_id** "
        "(e.g. `emp_4091`), including all assigned assets."
    ),
)
def get_employee(
    emp_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> EmployeeRead:
    employee = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{emp_id}' not found.",
        )
    return employee


# ─────────────────────────────────────────────────────────────
# POST /api/v1/employees/{emp_id}/assets  — Associate an asset
# ─────────────────────────────────────────────────────────────

@router.post(
    "/{emp_id}/assets",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Associate a new asset with an employee",
    description=(
        "Register a corporate **Device** or **IP** asset and link it to the "
        "employee identified by *emp_id*. "
        "Requires **SECURITY_MANAGER** or **ADMINISTRATOR** role."
    ),
)
def add_asset_to_employee(
    emp_id: str,
    payload: AssetBody,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles([RoleEnum.SECURITY_MANAGER, RoleEnum.ADMINISTRATOR])
    ),
) -> AssetRead:
    # Resolve employee from path parameter
    employee = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{emp_id}' not found.",
        )

    # employee_id is derived from the path — no body field needed
    asset = Asset(
        asset_id=payload.asset_id,
        asset_type=payload.asset_type,
        ip_address=payload.ip_address,
        mac_address=payload.mac_address,
        employee_id=employee.id,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset
