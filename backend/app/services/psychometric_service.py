from sqlalchemy.orm import Session

from app.models.psychometric import PsychometricProfile


class PsychometricService:

    @staticmethod
    def get_all_profiles(db: Session):
        return db.query(PsychometricProfile).all()

    @staticmethod
    def get_profile_by_user(db: Session, user_id: str):
        return (
            db.query(PsychometricProfile)
            .filter(PsychometricProfile.user_id == user_id)
            .first()
        )