from sqlalchemy.orm import Session

from app.models.http_activity import HttpActivity


class HttpActivityService:

    @staticmethod
    def get_all_http(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):
        return (
            db.query(HttpActivity)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_http_by_id(
        db: Session,
        http_id: int
    ):
        return (
            db.query(HttpActivity)
            .filter(
                HttpActivity.id == http_id
            )
            .first()
        )

    @staticmethod
    def get_http_by_user(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 100
    ):
        return (
            db.query(HttpActivity)
            .filter(
                HttpActivity.user_id == user_id
            )
            .offset(skip)
            .limit(limit)
            .all()
        )