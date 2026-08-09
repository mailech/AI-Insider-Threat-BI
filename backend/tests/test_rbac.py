"""Every guarded endpoint must reject under-privileged roles."""

import pytest

from app.models import UserRole


@pytest.mark.parametrize(
    "role", [UserRole.SECURITY_MANAGER, UserRole.SOC_ENGINEER, UserRole.SECURITY_ANALYST]
)
def test_only_admin_can_list_users(client, auth_headers, role):
    assert client.get("/api/v1/users", headers=auth_headers(role)).status_code == 403


def test_admin_can_list_users(client, auth_headers):
    response = client.get("/api/v1/users", headers=auth_headers(UserRole.ADMIN))
    assert response.status_code == 200


@pytest.mark.parametrize("role", [UserRole.SOC_ENGINEER, UserRole.SECURITY_ANALYST])
def test_analysts_and_soc_cannot_create_employees(client, auth_headers, role):
    response = client.post(
        "/api/v1/employees",
        headers=auth_headers(role),
        json={
            "employee_code": "EMP900",
            "full_name": "Blocked Hire",
            "email": "blocked@test.io",
            "designation": "Analyst",
        },
    )
    assert response.status_code == 403


def test_analyst_cannot_ingest_activity(client, auth_headers, seed_org):
    seed_org()
    response = client.post(
        "/api/v1/activities",
        headers=auth_headers(UserRole.SECURITY_ANALYST),
        json={"employee_id": 1, "event_type": "LOGIN"},
    )
    assert response.status_code == 403


def test_soc_engineer_can_ingest_activity(client, auth_headers, seed_org):
    org = seed_org()
    response = client.post(
        "/api/v1/activities",
        headers=auth_headers(UserRole.SOC_ENGINEER),
        json={"employee_id": org["report_id"], "event_type": "LOGIN"},
    )
    assert response.status_code == 201


@pytest.mark.parametrize(
    "role",
    [
        UserRole.ADMIN,
        UserRole.SECURITY_MANAGER,
        UserRole.SOC_ENGINEER,
        UserRole.SECURITY_ANALYST,
    ],
)
def test_every_role_can_read_the_dashboard(client, auth_headers, role):
    assert client.get("/api/v1/dashboard/summary", headers=auth_headers(role)).status_code == 200


def test_deactivated_user_is_locked_out(client, auth_headers, db):
    from app.models import User

    headers = auth_headers(UserRole.SECURITY_ANALYST)
    user = db.query(User).filter(User.role == UserRole.SECURITY_ANALYST).first()
    user.is_active = False
    db.commit()

    assert client.get("/api/v1/auth/me", headers=headers).status_code == 403


def test_admin_cannot_demote_themselves(client, auth_headers, db):
    from app.models import User

    headers = auth_headers(UserRole.ADMIN)
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()

    response = client.patch(
        f"/api/v1/users/{admin.id}", headers=headers, json={"role": "SECURITY_ANALYST"}
    )
    assert response.status_code == 400
