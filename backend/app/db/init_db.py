"""Schema creation and optional seeding on startup."""

import logging

from sqlalchemy import select

from app.db.seed import seed_database
from app.db.session import Base, SessionLocal, engine
from app.models.user import User  # noqa: F401  (import registers every model)
from app.models import ActivityEvent, Department, Device, Employee  # noqa: F401

logger = logging.getLogger(__name__)


def init_db(seed: bool = True) -> None:
    Base.metadata.create_all(bind=engine)

    if not seed:
        return

    with SessionLocal() as db:
        # Seeding is idempotent by absence: if anyone has ever registered, the
        # database is considered owned by real data and left alone.
        if db.scalar(select(User.id).limit(1)) is not None:
            logger.info("Database already populated -- skipping seed")
            return
        seed_database(db)
        logger.info("Database seeded with demo data")
