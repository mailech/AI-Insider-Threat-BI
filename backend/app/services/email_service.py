from sqlalchemy.orm import Session

from app.models.email import EmailActivity


class EmailService:

    @staticmethod
    def get_all_emails(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        return (
            db.query(EmailActivity)
            .order_by(
                EmailActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    @staticmethod
    def get_email_by_id(
        db: Session,
        email_id: int
    ):

        return (
            db.query(EmailActivity)
            .filter(
                EmailActivity.id == email_id
            )
            .first()
        )


    @staticmethod
    def get_emails_by_user(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ):

        return (
            db.query(EmailActivity)
            .filter(
                EmailActivity.user_id == user_id
            )
            .order_by(
                EmailActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )