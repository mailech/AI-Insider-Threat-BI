import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.config import normalize_role
from backend.app.database import get_connection, row_to_dict
from backend.app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from backend.app.security import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    public_user,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?) AND status = 'active'",
            (payload.email.strip(),),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        user = row_to_dict(row)
        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        connection.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
        connection.commit()
        refreshed = row_to_dict(connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone())

    clean_user = public_user(refreshed)
    return {
        "access_token": create_access_token(clean_user["id"], clean_user["role"]),
        "token_type": "bearer",
        "user": clean_user,
    }


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, current_user: dict | None = Depends(get_optional_user)) -> dict:
    role = normalize_role(payload.role)
    with get_connection() as connection:
        user_count = connection.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if user_count > 0 and (current_user is None or current_user["role"] != "administrator"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create additional platform users.",
            )

        try:
            cursor = connection.execute(
                """
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (?, lower(?), ?, ?)
                """,
                (payload.full_name.strip(), payload.email.strip(), hash_password(payload.password), role),
            )
            connection.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.") from exc

        row = connection.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return public_user(row_to_dict(row))


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user
