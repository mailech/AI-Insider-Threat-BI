from sqlalchemy.orm import Session

from app.models.file_activity import FileActivity


class FileActivityService:

    @staticmethod
    def get_all_files(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        return (
            db.query(FileActivity)
            .order_by(
                FileActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    @staticmethod
    def get_file_by_id(
        db: Session,
        file_id: int
    ):

        return (
            db.query(FileActivity)
            .filter(
                FileActivity.id == file_id
            )
            .first()
        )


    @staticmethod
    def get_files_by_user(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ):

        return (
            db.query(FileActivity)
            .filter(
                FileActivity.user_id == user_id
            )
            .order_by(
                FileActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )