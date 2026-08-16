import os
import sys
import tempfile
from pathlib import Path


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(project_root))

    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["ITBI_DATABASE_PATH"] = os.path.join(tmpdir, "smoke.db")
        os.environ["ITBI_SECRET_KEY"] = "smoke-test-secret"

        from fastapi.testclient import TestClient

        from backend.app.main import app

        with TestClient(app) as client:
            health = client.get("/api/health")
            assert health.status_code == 200, health.text

            login = client.post(
                "/api/auth/login",
                json={"email": "admin@soc.local", "password": "Admin@12345"},
            )
            assert login.status_code == 200, login.text
            token = login.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            summary = client.get("/api/dashboard/summary", headers=headers)
            assert summary.status_code == 200, summary.text
            assert summary.json()["kpis"]["employees"] >= 8

            employees = client.get("/api/employees", headers=headers)
            assert employees.status_code == 200, employees.text
            employee_ref = employees.json()[0]["employee_id"]

            ingest = client.post(
                "/api/activity/ingest",
                headers=headers,
                json={
                    "source": "Smoke Test Feed",
                    "events": [
                        {
                            "employee_id": employee_ref,
                            "event_type": "File Access",
                            "severity": "Medium",
                            "description": "Smoke test event accepted by ingestion pipeline.",
                            "asset": "test/share/report.csv",
                        }
                    ],
                },
            )
            assert ingest.status_code == 201, ingest.text
            assert ingest.json()["accepted"] == 1

    print("Smoke test passed: health, auth, dashboard, employees, and ingestion are operational.")


if __name__ == "__main__":
    main()
