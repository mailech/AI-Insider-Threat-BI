# Insider Threat Behavioral Intelligence System

AI-powered platform for monitoring employee activity, profiling behaviour,
detecting anomalies and scoring insider risk for enterprise SOC teams.

**Branch `Lakshmikanth-M` — Milestone 1 (Weeks 1–2) is complete:** project
initialisation, authentication, role-based access control, employee identity
management, the activity monitoring pipeline and the analyst dashboard.

---

## What works today

| Module | Status |
|---|---|
| 1. User authentication & RBAC | ✅ JWT access/refresh, OAuth2 password flow, 4 roles |
| 2. Employee identity & profile management | ✅ CRUD, departments, managers, devices, privileges |
| 3. Activity monitoring engine | ✅ 10 event types, filtering, CSV batch ingestion |
| 10. Dashboard & analytics | ✅ Security analyst dashboard |
| 4–9, 11–12 | ⏳ Milestones 2–4 |

Behavioral profiling, anomaly detection, risk scoring, UEBA, alerting and
reporting are **not** implemented yet. The schema is shaped to receive them; no
part of the code stubs or fakes them.

---

## Stack

**Backend** FastAPI · SQLAlchemy 2.0 · Pydantic v2 · PostgreSQL 16 · python-jose · passlib
**Frontend** React 18 · Vite 5 · Tailwind CSS 3 · Recharts · axios · React Router 6
**Ops** Docker · Docker Compose · nginx

---

## Quick start

### Docker Compose (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

The API creates its tables and seeds demo data on first boot.

Compose runs with working defaults out of the box. For anything beyond local
development, create a `.env` beside `docker-compose.yml` and override:

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production` | **Must be replaced.** Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `itbis` / `itbis_password` / `itbis` | Database credentials |
| `DATABASE_URL` | built from the above | Unset outside Docker, the API falls back to local SQLite |
| `CORS_ORIGINS` | `http://localhost,http://localhost:5173` | Comma-separated allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `BUSINESS_HOUR_START` / `BUSINESS_HOUR_END` | `8` / `19` | UTC window; activity outside it is flagged after-hours on write |
| `SEED_ON_STARTUP` | `true` | Set `false` for a real deployment |

### Running it locally without Docker

```bash
# Backend -- falls back to a local SQLite file, no database server needed
cd backend
python -m venv .venv && .venv/Scripts/activate      # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal) -- Vite proxies /api to localhost:8000
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

### Demo accounts

All use the password **`Insider@2026`**.

| Email | Role | Can do |
|---|---|---|
| `admin@insiderthreat.io` | Administrator | Everything, including user management |
| `manager@insiderthreat.io` | Security Manager | Manage employees, departments, ingest |
| `soc@insiderthreat.io` | SOC Engineer | Ingest activity, manage devices |
| `analyst@insiderthreat.io` | Security Analyst | Read-only across the platform |

Seed data: 6 departments, 25 employees, 41 devices, 49 privileges and 5,000
activity events across the trailing 30 days — CERT-dataset-shaped, with a small
elevated-risk cohort skewed toward after-hours access, USB use and large
transfers.

---

## Tests

```bash
cd backend  && .venv/Scripts/python -m pytest    # 42 tests
cd frontend && npm test                          # 15 tests
```

Backend coverage: registration/login/refresh, RBAC denial for every guarded
endpoint, employee CRUD and cascades, activity filtering, CSV ingestion
including malformed input.

---

## API

Full interactive docs at `/docs`. Base path `/api/v1`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/login/json` · `POST /auth/refresh` · `GET\|PATCH /auth/me` |
| Employees | `GET\|POST /employees` · `GET\|PATCH\|DELETE /employees/{id}` · `/employees/{id}/activities` · `/devices` · `/privileges` |
| Departments | `GET\|POST /departments` · `PATCH\|DELETE /departments/{id}` |
| Devices | `GET\|POST /devices` · `PATCH\|DELETE /devices/{id}` |
| Activities | `GET\|POST /activities` · `POST /activities/ingest` |
| Dashboard | `GET /dashboard/summary?days=30` |
| Users (admin) | `GET /users` · `GET\|PATCH\|DELETE /users/{id}` |

### Log ingestion format

`POST /api/v1/activities/ingest` takes a multipart CSV upload:

```csv
employee_code,event_type,timestamp,source,ip_address,bytes_transferred,details
EMP1001,FILE_DOWNLOAD,2026-08-05T23:15:00,ENDPOINT_AGENT,10.0.0.7,90000,payroll.xlsx
EMP1001,USB_CONNECT,2026-08-05T02:40:00,ENDPOINT_AGENT,10.0.0.7,0,
```

Required: `employee_code`, `event_type`, `timestamp`. Malformed rows are
reported in the response rather than aborting the batch, so one bad line in a
large export does not cost the upload.

---

## Design notes

- **Access tokens live in memory only.** Only the refresh token is persisted, so
  a bearer token is not sitting in `localStorage` for injected scripts to read.
  An axios interceptor retries a 401 exactly once after refreshing.
- **RBAC is enforced server-side.** Frontend route guards mirror the backend but
  only decide whether a control is worth rendering; the API is the boundary.
- **Roles are named per endpoint**, not derived from a hierarchy, so widening
  access is always a visible one-line change.
- **`is_after_hours` is computed at write time** (outside 08:00–19:00) because
  every dashboard aggregate filters on it. **All timestamps are stored and
  displayed in UTC** so the flag and the shown hour never disagree; per-employee
  timezones are a later-milestone concern.
- **Charts use single-series encoding.** Ten event types is past the point where
  categorical color stays readable, so identity lives on the axis labels and
  every bar shares one hue. Severity badges pair an icon and a label with the
  color, so meaning survives colorblindness, print and forced-colors mode. A
  table view of the chart data is available on the dashboard.

Full design: [`docs/specs/2026-08-09-milestone1-design.md`](docs/specs/2026-08-09-milestone1-design.md)

---

## Layout

```
backend/
  app/
    core/       config, security (JWT + bcrypt), RBAC dependencies
    db/         session, schema creation, demo seed
    models/     SQLAlchemy models + domain enums
    schemas/    Pydantic request/response models
    api/v1/     auth, users, employees, departments, devices, activities, dashboard
    services/   CSV ingestion
  tests/        pytest suite
frontend/
  src/
    api/        axios client with refresh interceptor, per-resource modules
    auth/       AuthContext, route guards
    components/ layout shell, table, charts, badges, modal
    pages/      Login, Dashboard, Employees, EmployeeDetail, Activity, AdminUsers, Profile
    lib/        constants (roles, event types, chart ink), formatters
    test/       vitest suite
docs/           design specs
docker-compose.yml
```

---

## Roadmap

| Milestone | Weeks | Scope |
|---|---|---|
| 1 ✅ | 1–2 | Auth, RBAC, employee management, activity monitoring, dashboard |
| 2 | 3–4 | Behavioral profiling, baselines, anomaly detection |
| 3 | 5–6 | Insider risk scoring, UEBA, threat investigation |
| 4 | 7–8 | Executive dashboards, reports/export, deployment hardening |
