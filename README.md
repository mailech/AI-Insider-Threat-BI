# ITBIS Insider Threat Behavioral Intelligence System

End-to-end insider-threat platform integrating endpoint telemetry and CERT Insider Threat Dataset r4.2 workflows with behavioral analytics, UEBA, anomaly detection, insider-risk scoring, alerts, investigations, reporting and Docker deployment.

## Implemented modules

- **SOC Overview:** operational KPIs, threat alerts, risk trend, risk ranking and investigation queue.
- **Security Events:** searchable/filterable event stream with risk/anomaly indicators and event evidence drawer.
- **Behavior & UEBA:** activity profiling, risk-indicator frequency, behavioral signals and Isolation Forest recalculation.
- **Risk Scoring:** project-specified weighted model: anomalies 35%, privilege misuse 25%, data access 20%, access deviations 10%, historical events 10%.
- **Alerts:** status workflow (open, acknowledged, investigating, resolved, closed), alert evidence and one-click investigation creation.
- **Investigations:** create/update investigations, assign analysts, preserve notes and inspect evidence timelines.
- **Employees:** employee risk profiles with behavioral summaries, recent events, alerts and linked investigations.
- **Threat Intelligence:** locally observed network/HTTP indicators extracted from telemetry.
- **Reports:** authenticated CSV, PDF and Excel exports.
- **Security Manager:** organizational risk posture and compliance metrics.
- **Administration:** RBAC-aware user administration, endpoint-agent enrollment/revocation and audit activity.
- **Notifications & Escalation:** alert notifications, unread/read workflow and analyst escalation.
- **UEBA extensions:** peer-group comparison and a transparent recent-risk trend heuristic.
- **Windows Endpoint Agent:** authorized telemetry collector for process/network metadata and selected Windows Security events, authenticated with per-device keys.

## Architecture

`ITBIS Windows Agent -> HTTPS ingestion -> FastAPI -> PostgreSQL -> Risk/UEBA -> Alerts/Investigations -> Next.js SOC`

CERT r4.2 is an offline training/evaluation source. The dataset is not committed to Git because of its size/licensing. The pipeline creates user-day behavioral features and can train Isolation Forest and a labeled Random Forest classifier when authorized labels are available.

## Run

1. Copy `.env.example` to `.env` and change every secret. The repository includes `.env.example`; never commit the real `.env`.
2. Install Docker Desktop.
3. Run:

```bash
docker compose up --build
```

4. Open `http://localhost:3000`.
5. Default demo credentials are controlled by `.env`.
6. Generate deterministic demonstration telemetry:

```bash
docker compose exec backend python seed_demo.py
```

The seed is demo data and must not be presented as CERT ground-truth results.

## API

### Authentication
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/token`
- `GET /api/v1/system/status`

### Endpoint agents and ingestion
- `POST /api/v1/agents/enroll`
- `GET /api/v1/agents`
- `DELETE /api/v1/agents/{device_id}`
- `POST /api/v1/ingestion/events`

### Analytics and SOC
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/events`
- `GET /api/v1/events/{event_id}`
- `GET /api/v1/alerts`
- `GET /api/v1/alerts/{alert_id}`
- `PATCH /api/v1/alerts/{alert_id}`
- `POST /api/v1/alerts/{alert_id}/investigate`
- `POST /api/v1/alerts/{alert_id}/escalate`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `PATCH /api/v1/incidents/{incident_id}`
- `GET /api/v1/incidents/{incident_id}/timeline`
- `GET /api/v1/employees`
- `POST /api/v1/employees`
- `GET /api/v1/employees/{employee_id}/profile`
- `GET /api/v1/risk/users`
- `GET /api/v1/analytics/trends`
- `GET /api/v1/analytics/behavior`
- `GET /api/v1/analytics/peer-groups`
- `GET /api/v1/analytics/prediction`
- `GET /api/v1/analytics/model-metrics`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/analytics/recalculate`
- `GET /api/v1/threat-intelligence`

### Governance and reporting
- `GET /api/v1/compliance/metrics`
- `GET /api/v1/audit`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `GET /api/v1/reports/events.csv`
- `GET /api/v1/reports/events.xlsx`
- `GET /api/v1/reports/events.pdf`

Swagger UI: `http://localhost:8000/docs`

## Windows endpoint agent

The `agent/` directory contains the production-grade ITBIS Windows Endpoint Agent package (`itbis-agent`). It features local SQLite buffering (`C:\ProgramData\ITBIS\agent.db`), exponential backoff retry logic, structured logging, and modular collectors (Windows Security events, process starts, USB insertions, removable drive file events, downloads, and network connections).

### Running on Localhost:
1. Ensure the backend is running (`http://localhost:8000`).
2. Run in an Administrator PowerShell terminal:
```powershell
cd C:\itbis-agent
.\venv\Scripts\itbis-agent.exe --config config.yaml
```
3. The agent will stream Windows Security logon and privilege events directly to the local ingestion endpoint (`POST /api/v1/ingestion/events`) using the development ingestion key (`dev-ingestion-key`).
4. To view queue status:
```powershell
.\venv\Scripts\itbis-agent.exe --config config.yaml --queue-stats
```

## CERT r4.2 pipeline

Place authorized CERT files under:

```text
data/cert/raw/logon.csv
data/cert/raw/device.csv
data/cert/raw/file.csv
data/cert/raw/email.csv
data/cert/raw/http.csv
data/cert/answers/insiders.csv
```

Then run the training pipeline described by the supplied project specification. Generated models and metrics belong under `ml/models/`.

## Security notes

- Real endpoint keys must never be committed to Git.
- The ingestion service accepts an enrolled device key or the configured ingestion key.
- Passwords are stored using PBKDF2-SHA256.
- User sessions use signed JWTs.
- Dashboard mutating actions are role restricted and written to the audit log.
- Browser report downloads attach the authenticated bearer token rather than exposing a credential in a URL.
- The demo bootstrap credentials are development defaults; replace them before any real deployment.
