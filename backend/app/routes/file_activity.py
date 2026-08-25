from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.file_activity import FileActivityResponse
from app.services.file_activity_service import FileActivityService


router = APIRouter(
    prefix="/files",
    tags=["File Monitoring"]
)


# ============================================================
# GET ALL FILE ACTIVITIES
# ============================================================

@router.get(
    "/",
    response_model=list[FileActivityResponse]
)
def get_all_files(
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

    return FileActivityService.get_all_files(
        db,
        skip,
        limit
    )


# ============================================================
# FAST FILE SUMMARY
# ============================================================

@router.get(
    "/summary"
)
def get_file_summary(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            total_file_events,
            file_unique_users,
            file_unique_files,
            file_unique_devices
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
            result["total_file_events"] or 0
        ),

        "unique_users": int(
            result["file_unique_users"] or 0
        ),

        "unique_files": int(
            result["file_unique_files"] or 0
        ),

        "unique_devices": int(
            result["file_unique_devices"] or 0
        )
    }


# ============================================================
# GET FILE BY ID
# ============================================================

@router.get(
    "/{file_id}",
    response_model=FileActivityResponse
)
def get_file_by_id(
    file_id: int,
    db: Session = Depends(get_db),
):

    file = FileActivityService.get_file_by_id(
        db,
        file_id
    )

    if not file:

        raise HTTPException(
            status_code=404,
            detail="File activity not found"
        )

    return file


# ============================================================
# GET FILES BY USER
# ============================================================

@router.get(
    "/user/{user_id}",
    response_model=list[FileActivityResponse]
)
def get_files_by_user(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):

    return FileActivityService.get_files_by_user(
        db,
        user_id,
        skip,
        limit
    )