# conftest.py - points the app at a throwaway test database BEFORE anything imports
# it, so running the test suite never touches the real database.db used by local dev
# or a Docker volume. Each test gets a freshly reset database (via the client fixture)
# so tests don't depend on execution order or leak state into each other.

import os
import sys
import tempfile

_tmp_dir = tempfile.mkdtemp()
os.environ["DB_PATH"] = os.path.join(_tmp_dir, "test.db")
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from app import app as flask_app  # noqa: E402
from db import init_db  # noqa: E402


@pytest.fixture()
def client():
    init_db(employee_count=15, reset=True)  # small count keeps the suite fast - each test reseeds from scratch
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def login(client, email, password):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def auth_headers(client, email, password):
    resp = login(client, email, password)
    token = resp.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}
