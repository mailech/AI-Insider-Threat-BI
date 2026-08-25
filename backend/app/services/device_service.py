from sqlalchemy.orm import Session

from app.models.device import DeviceActivity


class DeviceService:

    @staticmethod
    def get_all_devices(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        return (
            db.query(DeviceActivity)
            .order_by(
                DeviceActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    @staticmethod
    def get_device_by_id(
        db: Session,
        device_id: int
    ):

        return (
            db.query(DeviceActivity)
            .filter(
                DeviceActivity.id == device_id
            )
            .first()
        )


    @staticmethod
    def get_devices_by_user(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ):

        return (
            db.query(DeviceActivity)
            .filter(
                DeviceActivity.user_id == user_id
            )
            .order_by(
                DeviceActivity.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )