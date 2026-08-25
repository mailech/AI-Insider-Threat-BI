from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.email import EmailResponse
from app.services.email_service import EmailService


router = APIRouter(
    prefix="/email",
    tags=["Email Monitoring"]
)


# ============================================================
# GET ALL EMAILS
# ============================================================

@router.get(
    "/",
    response_model=list[EmailResponse]
)
def get_all_emails(
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

    return EmailService.get_all_emails(
        db,
        skip,
        limit
    )


# ============================================================
# FAST EMAIL DASHBOARD SUMMARY
# ============================================================

@router.get(
    "/dashboard/activity"
)
def get_email_dashboard_activity(
    db: Session = Depends(get_db),
):

    query = text("""
        SELECT
            total_emails,
            emails_with_attachments,
            emails_without_attachments,
            total_email_size,
            average_email_size,
            email_unique_users,
            email_unique_devices
        FROM dashboard_activity_summary
        WHERE id = 1
    """)

    result = (
        db.execute(query)
        .mappings()
        .one()
    )

    return {
        "total_emails": int(
            result["total_emails"] or 0
        ),

        "emails_with_attachments": int(
            result["emails_with_attachments"] or 0
        ),

        "emails_without_attachments": int(
            result["emails_without_attachments"] or 0
        ),

        "total_email_size": int(
            result["total_email_size"] or 0
        ),

        "average_email_size": float(
            result["average_email_size"] or 0
        ),

        "unique_users": int(
            result["email_unique_users"] or 0
        ),

        "unique_devices": int(
            result["email_unique_devices"] or 0
        )
    }


# ============================================================
# EMAIL SUMMARY
# ============================================================

@router.get(
    "/summary"
)
def get_email_summary(
    db: Session = Depends(get_db),
):

    query = text("""
        SELECT
            total_emails,
            emails_with_attachments,
            emails_without_attachments,
            email_unique_users
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
            result["total_emails"] or 0
        ),

        "with_attachments": int(
            result["emails_with_attachments"] or 0
        ),

        "without_attachments": int(
            result["emails_without_attachments"] or 0
        ),

        "unique_users": int(
            result["email_unique_users"] or 0
        )
    }


# ============================================================
# GET EMAIL BY ID
# ============================================================

@router.get(
    "/{email_id}",
    response_model=EmailResponse
)
def get_email_by_id(
    email_id: int,
    db: Session = Depends(get_db),
):

    email = EmailService.get_email_by_id(
        db,
        email_id
    )

    if not email:

        raise HTTPException(
            status_code=404,
            detail="Email activity not found"
        )

    return email


# ============================================================
# GET EMAILS BY USER
# ============================================================

@router.get(
    "/user/{user_id}",
    response_model=list[EmailResponse]
)
def get_emails_by_user(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
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

    return EmailService.get_emails_by_user(
        db,
        user_id,
        skip,
        limit
    )