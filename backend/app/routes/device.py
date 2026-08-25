from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.device import DeviceResponse
from app.services.device_service import DeviceService


router = APIRouter(
    prefix="/device",
    tags=["Device Monitoring"]
)


# ============================================================
# GET ALL DEVICES
# ============================================================

@router.get(
    "/",
    response_model=list[DeviceResponse]
)
def get_all_devices(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):

    limit = min(
        max(limit, 1),
        100
    )

    skip = max(
        skip,
        0
    )

    return DeviceService.get_all_devices(
        db,
        skip,
        limit
    )


# ============================================================
# FAST DEVICE SUMMARY
# ============================================================

@router.get(
    "/summary"
)
def get_device_summary(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            total_device_events,
            device_unique_users,
            device_unique_devices
        FROM dashboard_activity_summary
        WHERE id = 1
    """)

    result = (
        db.execute(query)
        .mappings()
        .one()
    )

    return {
        "total": int(
            result["total_device_events"] or 0
        ),

        "unique_users": int(
            result["device_unique_users"] or 0
        ),

        "unique_devices": int(
            result["device_unique_devices"] or 0
        )
    }


# ============================================================
# GET DEVICES BY USER
# ============================================================

@router.get(
    "/user/{user_id}",
    response_model=list[DeviceResponse]
)
def get_devices_by_user(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):

    return DeviceService.get_devices_by_user(
        db,
        user_id,
        skip,
        limit
    )


# ============================================================
# GET DEVICE BY ID
# ============================================================

@router.get(
    "/{device_id}",
    response_model=DeviceResponse
)
def get_device_by_id(
    device_id: int,
    db: Session = Depends(get_db),
):

    device = DeviceService.get_device_by_id(
        db,
        device_id
    )

    if not device:

        raise HTTPException(
            status_code=404,
            detail="Device activity not found"
        )

    return device