"""Unit tests for host-agent enrollment, API keys, and CanonicalEvent ingestion."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.requests import Request

from app.api.v1.agents import enroll_agent
from app.api.v1.ingestion import _authenticate_agent, ingest_agent_events
from app.core.security import (
    AGENT_API_KEY_PREFIX,
    generate_agent_api_key,
    hash_agent_api_key,
    verify_agent_api_key,
)
from app.db.session import Base
from app.models.domain import (
    AccessLevelEnum,
    Employee,
    EnrolledAgent,
    Incident,
    RiskCategoryEnum,
    RoleEnum,
    User,
)
from app.schemas.agents import AgentEnrollRequest
from app.schemas.canonical_event import CanonicalEvent, EventBatch
from app.services.agent_ingestion import (
    event_is_high_risk,
    resolve_employee,
    severity_for_event,
)


def test_generated_agent_key_is_hashed_not_stored_plaintext() -> None:
    raw = generate_agent_api_key()
    assert raw.startswith(f"{AGENT_API_KEY_PREFIX}_")
    digest = hash_agent_api_key(raw)
    assert digest != raw
    assert len(digest) == 64
    assert verify_agent_api_key(raw, digest)
    assert not verify_agent_api_key(raw + "x", digest)


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = docs

    def sort(self, *_args: object, **_kwargs: object) -> "_FakeCursor":
        return self

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        if length is None:
            return list(self._docs)
        return list(self._docs[:length])


class _FakeCollection:
    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []

    async def find_one(
        self,
        query: dict[str, Any],
        projection: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        key = query.get("idempotency_key")
        if key is None:
            return None
        for doc in self.docs:
            if doc.get("idempotency_key") == key:
                return doc
        return None

    async def insert_one(self, doc: dict[str, Any]) -> Any:
        self.docs.append(doc)

        class _Result:
            inserted_id = "fake-id"

        return _Result()

    def find(self, query: dict[str, Any], projection: dict[str, Any] | None = None) -> _FakeCursor:
        emp_id = query.get("emp_id")
        if emp_id:
            return _FakeCursor([d for d in self.docs if d.get("emp_id") == emp_id])
        return _FakeCursor(list(self.docs))

    async def update_one(self, *_args: object, **_kwargs: object) -> None:
        return None


class _FakeMongo:
    def __init__(self) -> None:
        self._cols: dict[str, _FakeCollection] = {}

    def __getitem__(self, name: str) -> _FakeCollection:
        return self._cols.setdefault(name, _FakeCollection())


def _make_request(api_key: str, device_id: str) -> Request:
    headers = [
        (b"authorization", f"Bearer {api_key}".encode("latin-1")),
        (b"x-device-id", device_id.encode("latin-1")),
        (b"content-type", b"application/json"),
    ]
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/v1/ingestion/events",
        "raw_path": b"/api/v1/ingestion/events",
        "query_string": b"",
        "headers": headers,
        "client": ("127.0.0.1", 123),
        "server": ("test", 80),
    }
    return Request(scope)


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    session.add_all(
        [
            User(
                email="admin@itbis.internal",
                hashed_password="hashed",
                role=RoleEnum.ADMINISTRATOR,
                is_active=True,
            ),
            Employee(
                emp_id="emp_4091",
                first_name="Ada",
                last_name="Lovelace",
                department="Engineering",
                designation="Engineer",
                device_id="WS-001",
                access_level=AccessLevelEnum.WRITE,
                risk_score=0.0,
                risk_category=RiskCategoryEnum.LOW,
            ),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_enroll_returns_api_key(db: Session) -> None:
    admin = db.query(User).filter(User.email == "admin@itbis.internal").one()
    result = enroll_agent(
        payload=AgentEnrollRequest(device_id="WS-001", device_name="Workstation 001"),
        db=db,
        _=admin,
    )
    assert result.api_key.startswith("itbis_ag_")
    assert result.device.device_id == "WS-001"
    stored = db.query(EnrolledAgent).filter(EnrolledAgent.device_id == "WS-001").one()
    assert stored.api_key_hash != result.api_key
    assert stored.employee_id is not None


def test_ingest_rejects_wrong_device(db: Session) -> None:
    admin = db.query(User).filter(User.email == "admin@itbis.internal").one()
    enrolled = enroll_agent(
        payload=AgentEnrollRequest(device_id="WS-001", device_name="Workstation 001"),
        db=db,
        _=admin,
    )
    with pytest.raises(HTTPException) as exc:
        _authenticate_agent(db, enrolled.api_key, "WS-OTHER")
    assert exc.value.status_code == 403


def test_ingest_accepts_batch_and_stores_high_risk_alert(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _Inference:
        threat_score = 82
        emp_id = "emp_4091"

    async def _fake_score(**_kwargs: Any) -> _Inference:
        return _Inference()

    monkeypatch.setattr(
        "app.services.scoring.evaluate_and_persist_realtime_risk",
        _fake_score,
    )

    admin = db.query(User).filter(User.email == "admin@itbis.internal").one()
    enrolled = enroll_agent(
        payload=AgentEnrollRequest(device_id="WS-001", device_name="Workstation 001"),
        db=db,
        _=admin,
    )
    mongo = _FakeMongo()
    event = CanonicalEvent(
        event_id=uuid4(),
        event_type="usb_insert",
        source_dataset="win_endpoint",
        raw_event_id="usb-1",
        timestamp=datetime.now(timezone.utc),
        user_id="emp_4091",
        device_id="WS-001",
        risk_level="high",
    )
    batch = EventBatch(agent_id="WS-001", events=[event])
    request = _make_request(enrolled.api_key, "WS-001")

    ack = asyncio.run(
        ingest_agent_events(
            payload=batch,
            request=request,
            db=db,
            mdb=mongo,  # type: ignore[arg-type]
            authorization=f"Bearer {enrolled.api_key}",
            x_api_key=None,
            x_device_id="WS-001",
        )
    )
    assert ack.accepted == 1
    assert ack.rejected == 0
    assert len(mongo["canonical_events"].docs) == 1
    assert mongo["activity_logs"].docs[0]["emp_id"] == "emp_4091"

    dup = asyncio.run(
        ingest_agent_events(
            payload=batch,
            request=request,
            db=db,
            mdb=mongo,  # type: ignore[arg-type]
            authorization=f"Bearer {enrolled.api_key}",
            x_api_key=None,
            x_device_id="WS-001",
        )
    )
    assert dup.duplicates == 1
    assert db.query(Incident).count() == 1


def test_resolve_employee_and_severity_helpers(db: Session) -> None:
    agent = EnrolledAgent(
        device_id="WS-001",
        device_name="Workstation 001",
        api_key_hash="abc",
        api_key_hint="itbis_ag_test",
        is_active=True,
    )
    event = CanonicalEvent(
        event_type="logon_failed",
        source_dataset="win_endpoint",
        timestamp=datetime.now(timezone.utc),
        user_id="emp_4091",
        device_id="WS-001",
        risk_level="high",
    )
    employee = resolve_employee(db, event, agent)
    assert employee is not None
    assert employee.emp_id == "emp_4091"
    assert severity_for_event(event) == "HIGH"
    assert event_is_high_risk(event) is True
