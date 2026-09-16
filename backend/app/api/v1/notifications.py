"""Notification endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.alert import NotificationRead
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get(
    "",
    response_model=list[NotificationRead],
    summary="List notifications",
)
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return notification_service.list_notifications(db, unread_only=unread_only, limit=limit)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="Mark a notification as read",
)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    notif = notification_service.mark_read(db, notification_id)
    if notif is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )
    return notif


@router.patch(
    "/read-all",
    summary="Mark all notifications as read",
)
def mark_all_read(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    updated = notification_service.mark_all_read(db)
    return {"updated": updated}
