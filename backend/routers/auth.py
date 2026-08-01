from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models.schemas import Token, UserLogin, UserProfile
from config import ROLES

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# In-memory mock database of system users for authentication & RBAC
USERS_DB = {
    "analyst": {
        "id": "USR-001",
        "username": "analyst",
        "password": "password123",
        "name": "Alex Reyes",
        "email": "a.reyes@aegis-security.io",
        "role": "Security Analyst",
        "department": "SOC Operations",
        "avatar": "AR"
    },
    "soc_eng": {
        "id": "USR-002",
        "username": "soc_eng",
        "password": "password123",
        "name": "Jordan Vance",
        "email": "j.vance@aegis-security.io",
        "role": "SOC Engineer",
        "department": "Cyber Defense",
        "avatar": "JV"
    },
    "manager": {
        "id": "USR-003",
        "username": "manager",
        "password": "password123",
        "name": "Elena Rostova",
        "email": "e.rostova@aegis-security.io",
        "role": "Security Manager",
        "department": "Enterprise Risk",
        "avatar": "ER"
    },
    "admin": {
        "id": "USR-004",
        "username": "admin",
        "password": "password123",
        "name": "Marcus Vance",
        "email": "m.vance@aegis-security.io",
        "role": "Administrator",
        "department": "IT Governance",
        "avatar": "MV"
    }
}

@router.post("/login", response_model=Token)
def login(login_req: UserLogin):
    user = USERS_DB.get(login_req.username)
    if not user or user["password"] != login_req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Hint: use username 'analyst' and password 'password123'"
        )
    
    return Token(
        access_token=f"token_{user['username']}_secret",
        token_type="bearer",
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
        name=user["name"]
    )

@router.get("/me", response_model=UserProfile)
def get_current_user(username: str = "analyst"):
    user = USERS_DB.get(username, USERS_DB["analyst"])
    return UserProfile(
        id=user["id"],
        username=user["username"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        department=user["department"],
        avatar=user.get("avatar")
    )

@router.get("/roles")
def get_available_roles():
    return {"roles": ROLES}
