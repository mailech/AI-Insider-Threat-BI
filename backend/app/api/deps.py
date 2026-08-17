from typing import Generator
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import verify_token
from app.db.models import User

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)) -> User:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in platform profiles")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != 'Administrator':
        raise HTTPException(status_code=403, detail="Administrator privileges required")
    return current_user
