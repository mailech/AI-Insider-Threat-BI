from sqlalchemy.orm import Session

from app.models.logon import LogonActivity


class LogonService:

    @staticmethod
    def get_all_logons(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        return (
            db.query(LogonActivity)
            .order_by(
                LogonActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    @staticmethod
    def get_logon_by_id(
        db: Session,
        logon_id: int
    ):

        return (
            db.query(LogonActivity)
            .filter(
                LogonActivity.id == logon_id
            )
            .first()
        )


    @staticmethod
    def get_logons_by_user(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ):

        return (
            db.query(LogonActivity)
            .filter(
                LogonActivity.user_id == user_id
            )
            .order_by(
                LogonActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    @staticmethod
    def get_logons_by_activity(
        db: Session,
        activity: str
    ):

        return (
            db.query(LogonActivity)
            .filter(
                LogonActivity.activity == activity
            )
            .order_by(
                LogonActivity.id.desc()
            )
            .limit(100)
            .all()
        )