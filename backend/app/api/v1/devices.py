"""Asset association -- devices attached to monitored employees."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import any_role, soc_or_above
from app.db.session import get_db
from app.models.employee import Device, Employee
from app.models.user import User
from app.schemas.employee import DeviceCreate, DeviceRead, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=list[DeviceRead])
def list_devices(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(any_role),
) -> list[Device]:
    query = select(Device).order_by(Device.hostname)
    if employee_id is not None:
        query = query.where(Device.employee_id == employee_id)
    return list(db.scalars(query))


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: DeviceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(soc_or_above),
) -> Device:
    if db.get(Employee, payload.employee_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )
    device = Device(**payload.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.patch("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: int,
    payload: DeviceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(soc_or_above),
) -> Device:
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int, db: Session = Depends(get_db), _: User = Depends(soc_or_above)
) -> None:
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()
