"""
ITBIS — Async MongoDB Client (Motor)
Provides:
  - mongo_client  : AsyncIOMotorClient singleton
  - mongo_db      : Reference to the configured database
  - get_mongo_db(): FastAPI dependency that yields the Motor database handle
  - connect_mongo() / disconnect_mongo(): lifecycle helpers for app startup/shutdown
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Module-level singleton (initialised at startup) ───────────────────────────
_mongo_client: AsyncIOMotorClient | None = None
_mongo_db: AsyncIOMotorDatabase | None = None


async def connect_mongo() -> None:
    """
    Initialise the Motor connection pool and verify connectivity.
    Gracefully degrades if MongoDB is not running — the server will
    continue to start but Mongo-dependent endpoints will return errors.
    """
    global _mongo_client, _mongo_db
    try:
        _mongo_client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=3000,   # fail-fast for local dev
        )
        _mongo_db = _mongo_client[settings.MONGO_DB_NAME]

        # Verify the connection is alive — Motor is lazy, so we must ping explicitly
        await _mongo_client.admin.command("ping")
        logger.info("✅ MongoDB connected: %s / %s", settings.MONGO_URI, settings.MONGO_DB_NAME)

    except Exception as exc:
        # Log the warning but do NOT raise — lets FastAPI start without Mongo
        logger.warning(
            "⚠️  MongoDB not reachable (%s). "
            "Mongo-dependent endpoints will be unavailable until the server restarts "
            "with MongoDB running.  Error: %s",
            settings.MONGO_URI,
            exc,
        )
        _mongo_client = None
        _mongo_db = None


async def disconnect_mongo() -> None:
    """
    Close the Motor connection pool.
    Call this inside the FastAPI lifespan shutdown handler.
    """
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
        logger.info("MongoDB connection closed.")


def get_mongo_db() -> AsyncIOMotorDatabase:
    """
    Return the active Motor database handle.
    Raises RuntimeError if called before connect_mongo() or if MongoDB
    was unavailable at startup.

    Usage in a FastAPI endpoint:
        async def some_endpoint(mdb: AsyncIOMotorDatabase = Depends(get_mongo_db)): ...
    """
    if _mongo_db is None:
        raise RuntimeError(
            "MongoDB has not been initialised. "
            "Ensure MongoDB is running and connect_mongo() completed successfully."
        )
    return _mongo_db
