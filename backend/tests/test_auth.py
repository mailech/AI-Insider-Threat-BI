from app.models import UserRole

from tests.conftest import PASSWORD


def test_first_registered_user_becomes_admin(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "founder@test.io", "full_name": "Founder", "password": PASSWORD},
    )
    assert response.status_code == 201
    assert response.json()["role"] == UserRole.ADMIN.value


def test_subsequent_users_default_to_analyst(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "founder@test.io", "full_name": "Founder", "password": PASSWORD},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "second@test.io", "full_name": "Second", "password": PASSWORD},
    )
    assert response.status_code == 201
    assert response.json()["role"] == UserRole.SECURITY_ANALYST.value


def test_duplicate_email_is_rejected(client):
    payload = {"email": "dupe@test.io", "full_name": "Dupe", "password": PASSWORD}
    client.post("/api/v1/auth/register", json=payload)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


def test_login_returns_token_pair_and_me_resolves(client, make_user):
    user = make_user(UserRole.SECURITY_ANALYST)

    login = client.post(
        "/api/v1/auth/login/json", json={"email": user.email, "password": PASSWORD}
    )
    assert login.status_code == 200
    tokens = login.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    me = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == user.email


def test_login_with_wrong_password_is_401(client, make_user):
    user = make_user(UserRole.SECURITY_ANALYST)
    response = client.post(
        "/api/v1/auth/login/json", json={"email": user.email, "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_refresh_token_yields_new_access_token(client, make_user):
    user = make_user(UserRole.SECURITY_ANALYST)
    tokens = client.post(
        "/api/v1/auth/login/json", json={"email": user.email, "password": PASSWORD}
    ).json()

    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_access_token_is_not_accepted_as_a_refresh_token(client, make_user):
    user = make_user(UserRole.SECURITY_ANALYST)
    tokens = client.post(
        "/api/v1/auth/login/json", json={"email": user.email, "password": PASSWORD}
    ).json()

    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )
    assert response.status_code == 401


def test_protected_route_rejects_missing_and_garbage_tokens(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code
        == 401
    )
