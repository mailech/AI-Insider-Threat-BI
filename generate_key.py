"""
Issue a one-time host-agent API key for device WS-001.

Connects to MongoDB, inserts or updates the enrolled-agent document, mirrors
the hashed credential into the SQL enrollment table (the auth source of truth),
prints the plaintext key once, and exits.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"

os.chdir(BACKEND)
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.core.security import generate_agent_api_key, hash_agent_api_key
from app.db.session import SessionLocal
from app.models.domain import EnrolledAgent
from app.services.agent_ingestion import link_employee_for_device

DEVICE_ID = "WS-001"
DEVICE_NAME = "Workstation 001"
DEVICE_TYPE = "workstation"
OPERATING_SYSTEM = "Windows"
MONGO_COLLECTION = "enrolled_agents"


def _upsert_mongo(key_hash: str, hint: str, now: datetime) -> None:
    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        coll = client[settings.MONGO_DB_NAME][MONGO_COLLECTION]
        existing = coll.find_one({"device_id": DEVICE_ID})
        fields = {
            "device_id": DEVICE_ID,
            "device_name": DEVICE_NAME,
            "device_type": DEVICE_TYPE,
            "operating_system": OPERATING_SYSTEM,
            "api_key_hash": key_hash,
            "api_key_hint": hint,
            "is_active": True,
            "updated_at": now,
        }
        if existing is None:
            fields["created_at"] = now
            coll.insert_one(fields)
        else:
            coll.update_one({"device_id": DEVICE_ID}, {"$set": fields})
    finally:
        client.close()


def _upsert_sql(key_hash: str, hint: str, now: datetime) -> None:
    db = SessionLocal()
    try:
        employee = link_employee_for_device(db, DEVICE_ID)
        agent = db.query(EnrolledAgent).filter(EnrolledAgent.device_id == DEVICE_ID).first()
        if agent is None:
            agent = EnrolledAgent(
                device_id=DEVICE_ID,
                device_name=DEVICE_NAME,
                device_type=DEVICE_TYPE,
                operating_system=OPERATING_SYSTEM,
                api_key_hash=key_hash,
                api_key_hint=hint,
                is_active=True,
                employee_id=employee.id if employee else None,
                created_at=now,
                updated_at=now,
            )
            db.add(agent)
        else:
            agent.device_name = DEVICE_NAME
            agent.device_type = DEVICE_TYPE
            agent.operating_system = OPERATING_SYSTEM
            agent.api_key_hash = key_hash
            agent.api_key_hint = hint
            agent.is_active = True
            agent.updated_at = now
            if employee is not None:
                agent.employee_id = employee.id
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> int:
    raw_key = generate_agent_api_key()
    key_hash = hash_agent_api_key(raw_key)
    hint = raw_key[:16]
    now = datetime.now(tz=timezone.utc)

    try:
        _upsert_mongo(key_hash, hint, now)
    except PyMongoError as exc:
        print(f"Failed to connect to MongoDB: {exc}", file=sys.stderr)
        return 1

    try:
        _upsert_sql(key_hash, hint, now)
    except Exception as exc:
        print(f"Failed to persist enrolled agent: {exc}", file=sys.stderr)
        return 1

    print(raw_key)
    return 0


if __name__ == "__main__":
    sys.exit(main())
