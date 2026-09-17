"""
ITBIS — PostgreSQL Session Factory (SQLAlchemy 2.x)
Provides:
  - engine        : SQLAlchemy Engine connected to PostgreSQL
  - SessionLocal  : Session factory (call to get a DB session)
  - Base          : Declarative base for all ORM models
  - get_db()      : FastAPI dependency that yields a session and auto-closes it
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator

from app.core.config import settings


# ── Engine ───────────────────────────────────────────────────────────────────
# SQLite and PostgreSQL require different engine kwargs:
#   • SQLite  — no pool_size / max_overflow; needs check_same_thread=False
#   • PostgreSQL — full connection pool with pre-ping health checks
_is_sqlite: bool = settings.DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},  # needed for FastAPI's thread model
        echo=settings.DEBUG,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,       # drop stale connections before use
        pool_size=10,             # max persistent connections in pool
        max_overflow=20,          # extra connections beyond pool_size
        echo=settings.DEBUG,      # log SQL only in DEBUG mode
    )

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── Declarative base ─────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All SQLAlchemy ORM models must inherit from this Base."""
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session and guarantee it is closed afterwards.

    Usage in a FastAPI endpoint:
        def some_endpoint(db: Session = Depends(get_db)): ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
