# Insider Threat Behavioral Intelligence System

A working implementation of the project described in your milestone document:
an AI-powered platform that monitors employee activity, builds behavioral
baselines, detects anomalies, scores insider risk, and raises alerts for
security teams to investigate.

This is a **runnable MVP scaffold** covering the full pipeline end-to-end —
auth & RBAC, employee & activity data model, behavioral profiling, anomaly
detection (rule-based + Isolation Forest), the weighted insider risk scoring
engine from your spec, alerting, investigation workflows, and four
role-based dashboards. It's meant to be a solid, extensible foundation you
build on for each weekly milestone, not a finished enterprise product.

## What's included

| Spec module | Where it lives |
|---|---|
| 1. Auth & Role-Based Access | `backend/app/routers/auth.py`, JWT + bcrypt |
| 2. Employee Identity & Profile | `backend/app/routers/employees.py` |
| 3. Activity Monitoring Engine | `backend/app/routers/activities.py` |
| 4. Behavioral Profiling Engine | `backend/app/services/baseline_service.py` |
| 5. Anomaly Detection Engine | `backend/app/services/anomaly_service.py` (rules + Isolation Forest) |
| 6. Insider Risk Scoring Engine | `backend/app/services/risk_service.py` (weighted model: 35/25/20/10/10) |
| 7. Threat Investigation Module | `backend/app/routers/investigations.py` (incidents + notes) |
| 8. UEBA Intelligence | Peer/behavioral scoring inside `anomaly_service.py` / `risk_service.py` |
| 9. Alert & Incident Management | `backend/app/services/alert_service.py`, `investigations.py` |
| 10. Dashboards | `backend/app/routers/dashboards.py` + `frontend/src/pages/*Dashboard.jsx` |
| 11. Notifications | Alert records drive the UI; wire to email/Slack later |
| 12. Reports & Export | `backend/app/routers/reports.py` (PDF via reportlab, Excel via openpyxl) |
| 13. Deployment | `docker-compose.yml`, Dockerfiles for backend + frontend |

**Stack:** FastAPI + PostgreSQL + SQLAlchemy (backend), React + Vite +
Tailwind + Recharts (frontend), scikit-learn (anomaly detection), Docker
Compose for one-command local deployment — matching the tech stack listed in
section 7 of your document.

## Folder structure

```
insider-threat-system/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app + router registration
│       ├── config.py          # settings, risk-weight constants
│       ├── database.py        # SQLAlchemy engine/session
│       ├── models.py          # all ORM tables
│       ├── schemas.py         # Pydantic request/response models
│       ├── auth.py            # password hashing + JWT
│       ├── deps.py            # current-user + role-guard dependencies
│       ├── seed.py            # demo users + synthetic activity data generator
│       ├── routers/           # one file per API module
│       └── services/          # baseline / anomaly / risk / alert engines
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.jsx, main.jsx
        ├── lib/ (api client, auth context)
        ├── components/ (Layout, RiskPill)
        └── pages/ (Login + 4 dashboards + Employees/Alerts/Incidents)
```

## How to run it

You need **Docker Desktop** (or Docker Engine + Compose) installed. Nothing
else — Python, Node, and Postgres all run inside containers.

1. Unzip the project and open a terminal in the `insider-threat-system` folder.
2. Start everything:

   ```bash
   docker compose up --build
   ```

   First build takes a few minutes (installing Python + npm packages).

3. Once the logs settle, seed the database with demo users and ~45 days of
   synthetic employee activity (including a few employees with deliberately
   injected anomalous behavior, so the pipeline has something to detect):

   ```bash
   docker compose exec backend python -m app.seed
   ```

   This also runs the analytics pipeline once, so risk scores and alerts
   exist immediately.

4. Open the app:
   - Frontend: **http://localhost:5173**
   - Backend API docs (Swagger): **http://localhost:8000/docs**

5. Log in with any of the demo accounts (password for all: `Password123!`):

   | Email | Role |
   |---|---|
   | analyst@company.com | Security Analyst |
   | soc@company.com | SOC Engineer |
   | manager@company.com | Security Manager |
   | admin@company.com | Administrator |

6. From the **Admin dashboard**, click **"Run Full Pipeline"** any time to
   re-run baseline generation → anomaly detection → risk scoring → alert
   generation against current data.

To stop everything: `docker compose down` (add `-v` to also wipe the database volume).

## Running without Docker (optional)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# point DATABASE_URL at a local Postgres, e.g.:
export DATABASE_URL=postgresql://insider:insider@localhost:5432/insider_threat
uvicorn app.main:app --reload
python -m app.seed   # in a second terminal, once the server is up
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Extending this toward your 8-week milestone plan

This scaffold already satisfies Milestones 1–3 functionally (auth, activity
ingestion, behavioral baselines, anomaly detection, risk scoring,
investigation workflows). For Milestone 4 and beyond, natural next steps:

- Swap the synthetic seed data for a real feed (CERT / LANL / CMU insider
  threat datasets, or real log sources like Active Directory / EDR exports).
- Add real log ingestion connectors (Windows Event Logs, VPN, email
  security) in place of the `/api/activities` manual-ingest endpoint.
- Add scheduled pipeline runs (e.g. Celery beat or a cron container) instead
  of the manual "Run Full Pipeline" button.
- Add email/Slack notification delivery in `alert_service.py`.
- Add authentication providers (OAuth2/SSO) if required beyond JWT.
- Tighten the Isolation Forest model with labeled data and add per-department
  peer-group comparison for the UEBA engine.

## Notes

- `JWT_SECRET` in `docker-compose.yml` is a placeholder — change it before
  any real deployment.
- The synthetic seed data is for demonstration only; it is not derived from
  the CERT/LANL/CMU datasets mentioned in the spec, but is structured so you
  can swap those datasets in with minimal changes to `seed.py`.
