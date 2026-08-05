from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.auth.oauth2 import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ----------------------------
# User Registration
# ----------------------------
@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash the password
    hashed_password = hash_password(user.password)

    # Create new user
    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password=hashed_password,
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ----------------------------
# User Login
# ----------------------------
@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):

    # Find user by email
    db_user = db.query(User).filter(User.email == user.email).first()

    # Check whether user exists
    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT Token
    access_token = create_access_token(
        {
            "sub": db_user.email,
            "role": db_user.role
        }
    )

    # Return token
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ----------------------------
# Current Logged-in User
# ----------------------------
@router.get("/me", response_model=UserResponse)
def get_logged_in_user(
    current_user: User = Depends(get_current_user)
):
    return current_user