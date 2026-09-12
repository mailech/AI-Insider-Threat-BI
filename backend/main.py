from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt

from backend.database import engine, Base, SessionLocal
from backend import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "insider-threat-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()


def verify_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    return verify_token(token)

def require_role(allowed_roles):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: insufficient permissions"
            )
        return current_user

    return role_checker

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Insider Threat Behavioral Intelligence System API")


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str
    password: str
    role: str = "Security Analyst"


class UserLogin(BaseModel):
    username: str
    password: str

class EmployeeProfileCreate(BaseModel):
    user_id: int
    employee_id: str
    department: str
    designation: str
    manager: str
    device_info: str
    access_privileges: str


@app.get("/")
def home():
    return {
        "message": "Insider Threat Behavioral Intelligence System API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/users")
def create_user(user: UserCreate):
    db = SessionLocal()

    print("Creating user:", user.username)

    new_user = models.User(
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        password_hash=pwd_context.hash(user.password),
        role=user.role
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        db.close()
    raise HTTPException(
        status_code=400,
        detail="Username or email already exists"
    )


    user_id = new_user.id
    username = new_user.username
    role = new_user.role

    db.close()

    return {
        "message": "User created successfully",
        "user_id": user_id,
        "username": username,
        "role": role
    }


@app.post("/employee-profiles")
def create_employee_profile(
    profile: EmployeeProfileCreate,
    current_user=Depends(get_current_user)
):
    db = SessionLocal()

    new_profile = models.EmployeeProfile(
        user_id=profile.user_id,
        employee_id=profile.employee_id,
        department=profile.department,
        designation=profile.designation,
        manager=profile.manager,
        device_info=profile.device_info,
        access_privileges=profile.access_privileges
    )

    db.add(new_profile)

    try:
        db.commit()
        db.refresh(new_profile)
    except IntegrityError:
        db.rollback()
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists"
        )

    db.close()

    return {
        "message": "Employee profile created successfully",
        "profile_id": new_profile.id,
        "employee_id": new_profile.employee_id
    }

@app.get("/employee-profiles")
def get_employee_profiles(
    current_user=Depends(get_current_user)
):
    db = SessionLocal()

    profiles = db.query(models.EmployeeProfile).all()

    result = []

    for profile in profiles:
        result.append({
            "id": profile.id,
            "user_id": profile.user_id,
            "employee_id": profile.employee_id,
            "department": profile.department,
            "designation": profile.designation,
            "manager": profile.manager,
            "device_info": profile.device_info,
            "access_privileges": profile.access_privileges
        })

    db.close()

    return result


@app.post("/login")
def login(user: UserLogin):
    db = SessionLocal()

    existing_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if not existing_user:
        db.close()
        return {
            "message": "Invalid username or password"
        }

    if not pwd_context.verify(user.password, existing_user.password_hash):
        db.close()
        return {
            "message": "Invalid username or password"
        }

    token_data = {
        "sub": existing_user.username,
        "role": existing_user.role
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    db.close()

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "username": existing_user.username,
        "role": existing_user.role
    }


@app.get("/users")
def get_users(current_user=Depends(get_current_user)):
    db = SessionLocal()

    users = db.query(models.User).all()

    result = []

    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        })

    db.close()


@app.get("/admin")
def admin_dashboard(
    current_user=Depends(require_role(["Administrator"]))
):
    return {
        "message": "Welcome to the Administrator dashboard",
        "username": current_user.get("sub"),
        "role": current_user.get("role")
    }

    return result