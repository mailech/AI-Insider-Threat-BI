from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.logon import LogonResponse
from app.services.logon_service import LogonService


router = APIRouter(
    prefix="/logon",
    tags=["Logon Monitoring"]
)


# ============================================================
# GET ALL LOGONS
# ============================================================

@router.get(
    "/",
    response_model=list[LogonResponse]
)
def get_all_logons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):

    limit = min(
        max(limit, 1),
        100
    )

    skip = max(
        skip,
        0
    )

    return LogonService.get_all_logons(
        db,
        skip,
        limit
    )


# ============================================================
# FAST LOGON SUMMARY
# ============================================================

@router.get(
    "/summary"
)
def get_logon_summary(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            total_logon_events,
            logon_events,
            logoff_events,
            logon_unique_users,
            logon_unique_devices
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
            result["total_logon_events"] or 0
        ),

        "logon_events": int(
            result["logon_events"] or 0
        ),

        "logoff_events": int(
            result["logoff_events"] or 0
        ),

        "unique_users": int(
            result["logon_unique_users"] or 0
        ),

        "unique_devices": int(
            result["logon_unique_devices"] or 0
        )
    }


# ============================================================
# GET LOGON BY ID
# ============================================================

@router.get(
    "/{logon_id}",
    response_model=LogonResponse
)
def get_logon_by_id(
    logon_id: int,
    db: Session = Depends(get_db)
):

    logon = LogonService.get_logon_by_id(
        db,
        logon_id
    )

    if not logon:

        raise HTTPException(
            status_code=404,
            detail="Logon activity not found"
        )

    return logon


# ============================================================
# GET LOGONS BY USER
# ============================================================

@router.get(
    "/user/{user_id}",
    response_model=list[LogonResponse]
)
def get_logons_by_user(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):

    return LogonService.get_logons_by_user(
        db,
        user_id,
        skip,
        limit
    )


# ============================================================
# GET LOGONS BY ACTIVITY
# ============================================================

@router.get(
    "/activity/{activity}",
    response_model=list[LogonResponse]
)
def get_logons_by_activity(
    activity: str,
    db: Session = Depends(get_db)
):

    return LogonService.get_logons_by_activity(
        db,
        activity
    )