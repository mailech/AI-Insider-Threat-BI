"""Tests for /api/v1/notifications endpoints."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.anomaly import Severity
from app.models.notification import Notification
from app.services import notification_service


BASE_URL = "/api/v1/notifications"


def _make_notification(db: Session, *, is_read: bool = False, title: str = "Test") -> Notification:
    notif = notification_service.create_notification(
        db,
        notification_type="anomaly_detected",
        severity=Severity.MEDIUM,
        title=title,
        message="A test notification message.",
    )
    if is_read:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


# ---------------------------------------------------------------------------
# GET /api/v1/notifications
# ---------------------------------------------------------------------------

class TestListNotifications:
    def test_list_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_created_notification(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        notif = _make_notification(db, title="Unique title 42")
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [n["id"] for n in resp.json()]
        assert str(notif.id) in ids

    def test_unread_only_filter_excludes_read(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        _make_notification(db, is_read=True, title="Read notif")
        _make_notification(db, is_read=False, title="Unread notif")

        resp = client.get(BASE_URL, params={"unread_only": True}, headers=auth_headers)
        assert resp.status_code == 200
        for n in resp.json():
            assert n["is_read"] is False

    def test_unread_only_false_returns_all(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        _make_notification(db, is_read=True)
        _make_notification(db, is_read=False)

        resp = client.get(BASE_URL, params={"unread_only": False}, headers=auth_headers)
        assert resp.status_code == 200
        statuses = {n["is_read"] for n in resp.json()}
        assert True in statuses  # read notifications included

    def test_limit_param(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        for i in range(3):
            _make_notification(db, title=f"Limit test {i}")
        resp = client.get(BASE_URL, params={"limit": 2}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    def test_list_response_fields(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        _make_notification(db)
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        if resp.json():
            n = resp.json()[0]
            assert "id" in n
            assert "title" in n
            assert "is_read" in n
            assert "occurred_at" in n
            assert "severity" in n

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/v1/notifications/{notification_id}/read
# ---------------------------------------------------------------------------

class TestMarkNotificationRead:
    def test_mark_read_success(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        notif = _make_notification(db, is_read=False)
        assert notif.is_read is False

        resp = client.patch(f"{BASE_URL}/{notif.id}/read", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(notif.id)
        assert data["is_read"] is True

    def test_mark_read_persisted(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        notif = _make_notification(db, is_read=False)
        client.patch(f"{BASE_URL}/{notif.id}/read", headers=auth_headers)
        db.refresh(notif)
        assert notif.is_read is True

    def test_mark_read_idempotent(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        """Marking an already-read notification read again should not error."""
        notif = _make_notification(db, is_read=True)
        resp = client.patch(f"{BASE_URL}/{notif.id}/read", headers=auth_headers)
        assert resp.status_code == 200

    def test_mark_read_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.patch(f"{BASE_URL}/{uuid.uuid4()}/read", headers=auth_headers)
        assert resp.status_code == 404

    def test_mark_read_requires_auth(self, client: TestClient, db: Session):
        notif = _make_notification(db)
        resp = client.patch(f"{BASE_URL}/{notif.id}/read")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/v1/notifications/read-all
# ---------------------------------------------------------------------------

class TestMarkAllRead:
    URL = f"{BASE_URL}/read-all"

    def test_mark_all_read_returns_count(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        for i in range(3):
            _make_notification(db, is_read=False, title=f"Unread {i}")

        resp = client.patch(self.URL, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "updated" in data
        assert isinstance(data["updated"], int)

    def test_mark_all_read_empty_db(self, client: TestClient, auth_headers: dict):
        resp = client.patch(self.URL, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["updated"] >= 0

    def test_mark_all_read_requires_auth(self, client: TestClient):
        resp = client.patch(self.URL)
        assert resp.status_code == 401
