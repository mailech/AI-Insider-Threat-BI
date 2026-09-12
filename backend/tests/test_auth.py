"""Authentication and role-based access control (module 1)."""


def test_login_returns_tokens_and_profile(client, users):
    response = client.post(
        "/api/v1/auth/login", json={"email": "analyst@test.io", "password": "Password@123"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["role"] == "security_analyst"


def test_login_rejects_wrong_password(client, users):
    response = client.post(
        "/api/v1/auth/login", json={"email": "analyst@test.io", "password": "WrongPassword1"}
    )
    assert response.status_code == 401


def test_protected_route_requires_a_token(client):
    assert client.get("/api/v1/employees").status_code == 401


def test_refresh_token_issues_a_new_access_token(client, users):
    login = client.post(
        "/api/v1/auth/login", json={"email": "analyst@test.io", "password": "Password@123"}
    ).json()
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_refresh_rejects_an_access_token(client, users):
    login = client.post(
        "/api/v1/auth/login", json={"email": "analyst@test.io", "password": "Password@123"}
    ).json()
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": login["access_token"]})
    assert response.status_code == 401


def test_analyst_cannot_reach_admin_endpoints(client, analyst_headers):
    assert client.get("/api/v1/users", headers=analyst_headers).status_code == 403
    assert client.get("/api/v1/dashboards/admin", headers=analyst_headers).status_code == 403


def test_analyst_cannot_reach_the_soc_dashboard(client, analyst_headers):
    assert client.get("/api/v1/dashboards/soc", headers=analyst_headers).status_code == 403


def test_soc_engineer_can_reach_the_soc_dashboard(client, soc_headers):
    assert client.get("/api/v1/dashboards/soc", headers=soc_headers).status_code == 200


def test_administrator_reaches_every_dashboard(client, admin_headers):
    for name in ("analyst", "soc", "manager", "admin"):
        assert client.get(f"/api/v1/dashboards/{name}", headers=admin_headers).status_code == 200


def test_password_change_flow(client, admin_headers):
    created = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "rotate@test.io",
            "full_name": "Rotate Me",
            "password": "Original@123",
            "role": "security_analyst",
        },
    )
    assert created.status_code == 201

    login = client.post(
        "/api/v1/auth/login", json={"email": "rotate@test.io", "password": "Original@123"}
    ).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    wrong = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "NotIt@123", "new_password": "Updated@123"},
    )
    assert wrong.status_code == 400

    ok = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Original@123", "new_password": "Updated@123"},
    )
    assert ok.status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "rotate@test.io", "password": "Updated@123"}
        ).status_code
        == 200
    )
