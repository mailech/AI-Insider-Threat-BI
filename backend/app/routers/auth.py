from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserLogin, Token, UserResponse
from app.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "name": user.full_name, "id": user.id}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

from pydantic import BaseModel, Field
from app.audit_service import log_audit_event

class SSOLoginRequest(BaseModel):
    role: str = Field(..., description="Target role to authenticate as (Administrator, Security Manager, SOC Engineer, Security Analyst)")
    provider: str = Field("Corporate_SSO_Demo", description="Identity Provider descriptor")

ROLE_TO_EMAIL = {
    "Administrator": "admin@ams.internal",
    "Security Manager": "manager@ams.internal",
    "SOC Engineer": "soc@ams.internal",
    "Security Analyst": "analyst@ams.internal",
}

@router.post("/sso-login", response_model=Token)
def sso_login(req: SSOLoginRequest, db: Session = Depends(get_db)):
    """
    Enhancement 4: Simulated Corporate SSO Fast-Path OAuth2 Grant.
    Authenticates strictly against one of the 4 real seeded persona accounts.
    Issues genuine signed JWT access token and logs an immutable audit event.
    """
    target_email = ROLE_TO_EMAIL.get(req.role)
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid SSO persona role '{req.role}'. Must be one of: {list(ROLE_TO_EMAIL.keys())}"
        )

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona user for role '{req.role}' ({target_email}) not found."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive persona user account"
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "name": user.full_name, "id": user.id}
    )

    log_audit_event(
        db=db,
        user=user,
        action="SSO_LOGIN_SUCCESS",
        target_resource="Corporate_SSO_Demo_IdP",
        details={
            "provider": req.provider,
            "simulated_demo": True,
            "role": user.role,
            "email": user.email
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
