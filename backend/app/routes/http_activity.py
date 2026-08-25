from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.http_activity import HttpActivityResponse
from app.services.http_activity_service import HttpActivityService


router = APIRouter(
    prefix="/http",
    tags=["HTTP Monitoring"]
)


# ============================================================
# FAST HTTP SUMMARY
# ============================================================

@router.get("/summary")
def get_http_summary(
    db: Session = Depends(get_db),
):
    """
    Fast HTTP activity summary.

    Uses the pre-computed employee_behavior_features
    materialized view instead of scanning raw HTTP events.
    """

    query = text("""
        SELECT
            COALESCE(
                SUM(total_http_events),
                0
            ) AS total,

            COUNT(employee_id) FILTER (
                WHERE total_http_events > 0
            ) AS unique_users,

            COALESCE(
                SUM(unique_websites),
                0
            ) AS unique_websites

        FROM employee_behavior_features
    """)

    result = db.execute(query).mappings().one()

    return {
        "total": int(result["total"]),
        "unique_users": int(result["unique_users"]),
        "unique_websites": int(result["unique_websites"])
    }


# ============================================================
# GET ALL HTTP ACTIVITIES
# ============================================================

@router.get(
    "/",
    response_model=list[HttpActivityResponse]
)
def get_all_http(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return HttpActivityService.get_all_http(
        db,
        skip,
        limit
    )


# ============================================================
# GET HTTP ACTIVITY BY ID
# ============================================================

@router.get(
    "/{http_id}",
    response_model=HttpActivityResponse
)
def get_http_by_id(
    http_id: int,
    db: Session = Depends(get_db),
):
    activity = HttpActivityService.get_http_by_id(
        db,
        http_id
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="HTTP activity not found"
        )

    return activity


# ============================================================
# GET HTTP ACTIVITIES BY USER
# ============================================================

@router.get(
    "/user/{user_id}",
    response_model=list[HttpActivityResponse]
)
def get_http_by_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    return HttpActivityService.get_http_by_user(
        db,
        user_id
    )