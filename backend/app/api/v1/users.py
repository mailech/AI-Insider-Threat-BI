"""Platform user administration (module 1 / admin dashboard)."""
from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_current_user, require_admin, require_analyst
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.enums import Role
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.user import UserAdminUpdate, UserCreate, UserOut
from app.services import audit

router = APIRouter(prefix="/users", tags=["Users & Administration"])


@router.get("", response_model=Page[UserOut])
def list_users(
    q: Optional[str] = None,
    role: Optional[Role] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(User)
    if q:
        pattern = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.email).like(pattern), func.lower(User.full_name).like(pattern)))
    if role:
        stmt = stmt.where(User.role == role.value)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)).scalars().all()
    return {
        "items": list(rows),
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Any:
    if db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        phone=payload.phone,
        job_title=payload.job_title,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    audit.record(db, "user.create", admin, "user", user.id, f"role={user.role}", client_ip(request))
    db.commit()
    db.refresh(user)
    return user


@router.get("/assignable", response_model=List[dict])
def assignable_users(
    role: Optional[Role] = None,
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Minimal directory of active users, for assignment and escalation pickers.

    Any analyst needs this to escalate an incident, so it exposes only the
    identity fields those workflows require - never contact or account detail.
    """
    stmt = select(User).where(User.is_active.is_(True))
    if role:
        stmt = stmt.where(User.role == role.value)
    rows = db.execute(stmt.order_by(User.full_name)).scalars().all()
    return [{"id": u.id, "full_name": u.full_name, "role": u.role} for u in rows]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> Any:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if "role" in data and data["role"] is not None:
        data["role"] = data["role"].value if isinstance(data["role"], Role) else data["role"]
    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot disable your own account")
    for field, value in data.items():
        setattr(user, field, value)
    audit.record(db, "user.update", admin, "user", user.id, str(data), client_ip(request))
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=Message)
def deactivate_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Any:
    """Soft-delete: the account is disabled so the audit trail stays intact."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    user.is_active = False
    audit.record(db, "user.deactivate", admin, "user", user.id, None, client_ip(request))
    db.commit()
    return {"detail": f"User {user.email} deactivated"}


@router.get("/audit/logs", response_model=Page[dict])
def audit_logs(
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.like(f"%{action}%"))
    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size)
    ).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "action": r.action,
                "actor": r.actor_email,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "detail": r.detail,
                "ip_address": r.ip_address,
                "created_at": r.created_at,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }
