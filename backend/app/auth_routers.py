from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import Employee
from app.auth import verify_password, create_access_token
from app.audit import log_audit


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    clean_email = login_data.email.strip().lower()

    user = db.execute(
        text(
            "SELECT id, employee_id, email, password_hash, role "
            "FROM users WHERE LOWER(email) = :email AND is_active = TRUE"
        ),
        {"email": clean_email}
    ).mappings().first()

    if not user:
        alt_email = (
            clean_email.replace("@company.com", "@itbis.internal")
            if "@company.com" in clean_email
            else clean_email.replace("@itbis.internal", "@company.com")
        )
        user = db.execute(
            text(
                "SELECT id, employee_id, email, password_hash, role "
                "FROM users WHERE LOWER(email) = :email AND is_active = TRUE"
            ),
            {"email": alt_email}
        ).mappings().first()

    if not user:
        log_audit(
            db,
            actor=login_data.email,
            action="LOGIN_FAILED",
            target="SYSTEM",
            status="FAILED",
            details="User not found or inactive"
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        login_data.password,
        user["password_hash"]
    ):
        log_audit(
            db,
            actor=login_data.email,
            action="LOGIN_FAILED",
            target="SYSTEM",
            status="FAILED",
            details="Incorrect password"
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"]
    })

    log_audit(
        db,
        actor=user["email"],
        action="LOGIN_SUCCESS",
        target="SYSTEM",
        status="SUCCESS",
        details=f"Role: {user['role']}"
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"]
    }