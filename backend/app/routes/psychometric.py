from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.psychometric import PsychometricResponse
from app.services.psychometric_service import PsychometricService

router = APIRouter(
    prefix="/psychometric",
    tags=["Psychometric Profiles"]
)


@router.get("/", response_model=list[PsychometricResponse])
def get_profiles(
    db: Session = Depends(get_db),
):
    return PsychometricService.get_all_profiles(db)


@router.get("/{user_id}", response_model=PsychometricResponse)
def get_profile(
    user_id: str,
    db: Session = Depends(get_db),
):
    profile = PsychometricService.get_profile_by_user(db, user_id)

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Psychometric profile not found"
        )

    return profile