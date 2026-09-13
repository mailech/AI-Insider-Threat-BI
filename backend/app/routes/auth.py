from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


users = [
    {
        "email": "admin@itbis.io",
        "password": "Admin@12345",
        "name": "Security Administrator",
        "role": "Administrator",
    }
]


@router.post("/login")
def login(request: LoginRequest):
    for user in users:
        if (
            user["email"] == request.email
            and user["password"] == request.password
        ):
            return {
                "message": "Login successful",
                "access_token": "demo-access-token",
                "token_type": "bearer",
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                },
            }

    raise HTTPException(
        status_code=401,
        detail="Invalid email or password",
    )