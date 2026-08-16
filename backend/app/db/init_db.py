"""
ITBIS — Database Initialisation Helper
Creates all PostgreSQL tables defined in the ORM models if they do not
already exist. Safe to call on every application startup.

Usage:
    # In main.py lifespan handler:
    from app.db.init_db import init_db
    init_db()

    # Or run standalone:
    python -m app.db.init_db
"""

import logging
from sqlalchemy import inspect, text

from app.db.session import engine, Base

# Ensure all ORM models are imported so Base.metadata is populated
import app.models.domain  # noqa: F401

logger = logging.getLogger(__name__)


def init_db() -> None:
    """
    Create all tables that are registered on Base.metadata.
    Existing tables are left untouched (checkfirst=True behaviour
    is implicit in create_all).
    """
    logger.info("Initialising PostgreSQL schema …")

    try:
        # Verify the database is reachable before attempting DDL
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception as exc:
        logger.error("Cannot reach the database: %s", exc)
        raise

    # Reflect existing tables so we can log which ones are new
    inspector   = inspect(engine)
    existing_tb = set(inspector.get_table_names())
    defined_tb  = set(Base.metadata.tables.keys())
    new_tables  = defined_tb - existing_tb

    Base.metadata.create_all(bind=engine)

    if new_tables:
        logger.info("Created new tables: %s", ", ".join(sorted(new_tables)))
    else:
        logger.info("All tables already exist — no DDL changes applied.")

    logger.info("PostgreSQL schema initialisation complete.")


def drop_all_tables() -> None:
    """
    ⚠️  DESTRUCTIVE — drops every table managed by this project.
    Intended for use in automated test teardown ONLY.
    Never call in production code.
    """
    logger.warning("Dropping all ITBIS tables — THIS IS DESTRUCTIVE!")
    Base.metadata.drop_all(bind=engine)
    logger.warning("All tables dropped.")


if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    )

    if "--drop" in sys.argv:
        confirm = input("Type YES to confirm dropping all tables: ")
        if confirm.strip() == "YES":
            drop_all_tables()
        else:
            print("Aborted.")
            sys.exit(1)
    else:
        init_db()
