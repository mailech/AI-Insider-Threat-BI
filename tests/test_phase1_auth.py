import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "CERT" in data["dataset_engine"]


def test_login_and_auth_flow(client):
    # 1. Login with seeded admin
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"username": "admin", "password": "Password123!"}
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "Administrator"
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get /auth/me
    me_res = client.get(f"{settings.API_V1_STR}/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "admin"

    # 3. Test /dashboard/summary
    dash_res = client.get(f"{settings.API_V1_STR}/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["cards"]["total_employees"] > 0
    assert len(dash_data["risk_distribution"]) == 4

    # 4. Test /employees
    emp_res = client.get(f"{settings.API_V1_STR}/employees", headers=headers)
    assert emp_res.status_code == 200
    employees = emp_res.json()
    assert len(employees) > 0
    assert any(e["user_id"] == "AAE0190" for e in employees)

    # 5. Test /employees/AAE0190
    aae_res = client.get(f"{settings.API_V1_STR}/employees/AAE0190", headers=headers)
    assert aae_res.status_code == 200
    aae_detail = aae_res.json()
    assert aae_detail["user_id"] == "AAE0190"
    assert aae_detail["current_severity"] == "CRITICAL"
    assert len(aae_detail["activity_timeline"]) > 0

    # 6. Test /alerts
    alerts_res = client.get(f"{settings.API_V1_STR}/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    # 7. Test /incidents
    incidents_res = client.get(f"{settings.API_V1_STR}/incidents", headers=headers)
    assert incidents_res.status_code == 200
    incidents = incidents_res.json()
    assert len(incidents) > 0


def test_rbac_roles_login(client):
    for role_user in ["manager", "soc_engineer", "analyst"]:
        res = client.post(
            f"{settings.API_V1_STR}/auth/login",
            json={"username": role_user, "password": "Password123!"}
        )
        assert res.status_code == 200
        assert "access_token" in res.json()
