"""Department reference data."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import any_role, manager_or_admin
from app.db.session import get_db
from app.models.employee import Department
from app.models.user import User
from app.schemas.employee import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentRead])
def list_departments(
    db: Session = Depends(get_db), _: User = Depends(any_role)
) -> list[Department]:
    return list(db.scalars(select(Department).order_by(Department.name)))


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Department:
    if db.scalar(select(Department).where(Department.code == payload.code)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Department code already exists"
        )
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> Department:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> None:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    db.delete(department)
    db.commit()
