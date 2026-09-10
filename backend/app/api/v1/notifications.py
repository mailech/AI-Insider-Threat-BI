"""Notification and escalation endpoints, including the live WebSocket feed."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_manager
from app.core.security import ACCESS, decode_token
from app.db.session import SessionLocal, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.incident import NotificationCreate, NotificationOut
from app.services import notifications as service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=Page[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(Notification.created_at.desc()).offset((page - 1) * size).limit(size)
    ).scalars().all()
    return {
        "items": list(rows),
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.get("/unread-count", response_model=dict)
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    count = int(
        db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user.id, Notification.is_read.is_(False)
            )
        ).scalar_one()
    )
    return {"unread": count}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Any:
    note = db.get(Notification, notification_id)
    if not note or note.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    note.is_read = True
    db.commit()
    db.refresh(note)
    return note


@router.post("/read-all", response_model=Message)
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return {"detail": "All notifications marked as read"}


@router.post("/broadcast", response_model=Message)
def broadcast(
    payload: NotificationCreate,
    user: User = Depends(require_manager),
    db: Session = Depends(get_db),
) -> Any:
    """Send a notification to specific users or whole roles."""
    created = service.notify(
        db,
        title=payload.title,
        body=payload.body,
        user_ids=payload.user_ids or None,
        roles=payload.roles or None,
        type=payload.type,
        severity=payload.severity,
        link=payload.link,
    )
    db.commit()
    return {"detail": f"Notification delivered to {len(created)} user(s)"}


@router.websocket("/ws")
async def notifications_socket(websocket: WebSocket, token: Optional[str] = Query(None)) -> None:
    """Live alert / notification stream. Authenticate with ?token=<access token>."""
    payload = decode_token(token) if token else None
    if not payload or payload.get("type") != ACCESS:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    with SessionLocal() as db:
        user = db.get(User, int(payload["sub"]))
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        role = user.role

    await service.manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected", "data": {"role": role}})
        while True:
            # Keeps the connection open; client pings are echoed back.
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong", "data": {}})
    except WebSocketDisconnect:
        service.manager.disconnect(websocket)
    except Exception:
        service.manager.disconnect(websocket)
