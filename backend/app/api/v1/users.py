"""User management endpoints with RBAC."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.auth import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=list[UserRead],
    summary="List all users (Administrator, Security Manager)",
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role(Role.ADMINISTRATOR, Role.SECURITY_MANAGER)),
) -> list[User]:
    return list(
        db.scalars(
            select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        )
    )


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (Administrator only)",
)
def create_user(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role(Role.ADMINISTRATOR)),
) -> User:
    # UserUpdate fields are all optional — validate minimal required info
    if not payload.full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="full_name is required when creating a user.",
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Use POST /auth/register to create users with email/password.",
    )


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Get a user by ID",
)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    # Users can view themselves; admins/managers can view anyone
    if (
        current_user.id != user_id
        and current_user.role not in (Role.ADMINISTRATOR, Role.SECURITY_MANAGER)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Update a user (Administrator only)",
)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role(Role.ADMINISTRATOR)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user (Administrator only)",
)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMINISTRATOR)),
) -> None:
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    db.delete(user)
    db.commit()
