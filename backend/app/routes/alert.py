from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.alert import (
    AlertResponse,
    AlertAssignRequest,
    AlertStatusUpdate
)

from app.services.alert_service import AlertService

from app.auth.roles import require_role


router = APIRouter(
    prefix="/alerts",
    tags=["Alert & Incident Management"]
)


# ============================================================
# GET ALL ALERTS - PAGINATED
# ============================================================

@router.get(
    "/",
    response_model=list[AlertResponse]
)
def get_all_alerts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):
    """
    Returns paginated alert records.

    Used by the Alerts page.

    Dashboard does NOT use this endpoint.
    """

    # Prevent extremely large requests
    limit = min(
        max(limit, 1),
        100
    )

    skip = max(
        skip,
        0
    )

    return AlertService.get_all_alerts(
        db,
        skip,
        limit
    )


# ============================================================
# ALERT SUMMARY
# ============================================================

@router.get(
    "/summary"
)
def get_alert_summary(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):
    """
    Lightweight endpoint for Dashboard.

    Returns counts only.

    Does NOT return alert records.
    """

    return AlertService.get_alert_summary(
        db
    )


# ============================================================
# GET ONE ALERT
# ============================================================

@router.get(
    "/{alert_id}",
    response_model=AlertResponse
)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    alert = AlertService.get_alert_by_id(
        db,
        alert_id
    )

    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return alert


# ============================================================
# ASSIGN ANALYST
# ============================================================

@router.put(
    "/{alert_id}/assign",
    response_model=AlertResponse
)
def assign_alert(
    alert_id: int,
    request: AlertAssignRequest,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    alert = AlertService.assign_analyst(
        db,
        alert_id,
        request.assigned_analyst
    )

    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return alert


# ============================================================
# UPDATE ALERT STATUS
# ============================================================

@router.put(
    "/{alert_id}/status",
    response_model=AlertResponse
)
def update_alert_status(
    alert_id: int,
    request: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    allowed_statuses = [
        "Open",
        "In Progress",
        "Resolved"
    ]

    if request.status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Allowed values: "
                "Open, In Progress, Resolved"
            )
        )

    alert = AlertService.update_status(
        db,
        alert_id,
        request.status
    )

    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return alert