from fastapi import APIRouter, HTTPException, status
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest) -> TokenResponse:
    # User lookup and password verification are intentionally deferred to the database integration.
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Authentication requires the user database configuration")
