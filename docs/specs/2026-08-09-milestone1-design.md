# Milestone 1 — Project Initialization, Auth, Employee Management & Activity Monitoring

**Date:** 2026-08-09
**Author:** Lakshmikanth M
**Branch:** `Lakshmikanth-M`
**Status:** Approved

## 1. Goal

Deliver the foundation of the Insider Threat Behavioral Intelligence System:
a working full-stack application with authentication, role-based access control,
employee identity management, and an activity monitoring pipeline — plus the
security analyst dashboard that surfaces all of it.

Milestone 1 explicitly does **not** implement behavioral profiling, anomaly
detection, risk scoring, UEBA, or alerting. Those are Milestones 2 and 3. The
database schema is shaped to receive them without rework; the code does not
stub or fake them.

## 2. Architecture

```
frontend/   React 18 + Vite + Tailwind + Recharts    →  nginx (production image)
                    │  REST over HTTPS, JWT Bearer
backend/    FastAPI + SQLAlchemy 2.0 + Pydantic v2   →  PostgreSQL 16
                    │
                    └─ ingestion service (CSV / JSON batch → activity_events)

docker-compose.yml orchestrates: postgres · api · web
```

`DATABASE_URL` is settings-driven. Under Docker Compose it points at Postgres;
locally it falls back to SQLite so the API can be run with a bare `uvicorn`
invocation for a quick demo without a database server.

### Backend layout

```
backend/app/
  core/        config, security (JWT + bcrypt), dependencies (RBAC guards)
  db/          session, base, init_db, seed
  models/      SQLAlchemy ORM models
  schemas/     Pydantic request/response models
  api/v1/      auth, users, employees, departments, devices, activities, dashboard
  services/    ingestion (CSV parsing → ActivityEvent rows)
  tests/       pytest suite
```

### Frontend layout

```
frontend/src/
  api/         axios client, token refresh interceptor, per-resource modules
  auth/        AuthContext, ProtectedRoute, role guards
  components/  layout shell, tables, filters, charts, forms
  pages/       Login, Dashboard, Employees, EmployeeDetail, Activity, AdminUsers, Profile
  lib/         formatters, constants (roles, event types)
```

## 3. Data model

| Table | Fields |
|---|---|
| `users` | id, email (unique), hashed_password, full_name, role, is_active, created_at |
| `departments` | id, name, code (unique) |
| `employees` | id, employee_code (unique), full_name, email, department_id → departments, designation, manager_id → employees (self-FK, nullable), status, joined_at, created_at |
| `devices` | id, employee_id → employees, hostname, device_type, os, mac_address, is_managed |
| `access_privileges` | id, employee_id → employees, name, level |
| `activity_events` | id, employee_id → employees, device_id → devices (nullable), event_type, timestamp, source, ip_address, bytes_transferred, is_after_hours, details (JSON) |

**Enums**

- `UserRole`: `ADMIN`, `SECURITY_MANAGER`, `SOC_ENGINEER`, `SECURITY_ANALYST`
- `EmployeeStatus`: `ACTIVE`, `ON_LEAVE`, `SUSPENDED`, `TERMINATED`
- `PrivilegeLevel`: `READ`, `WRITE`, `ADMIN`
- `EventType`: `LOGIN`, `LOGOUT`, `FAILED_LOGIN`, `FILE_DOWNLOAD`, `FILE_UPLOAD`,
  `DATA_TRANSFER`, `EMAIL_SENT`, `USB_CONNECT`, `PRIVILEGE_CHANGE`, `REMOTE_ACCESS`

**Indexes:** `activity_events(employee_id, timestamp)` and
`activity_events(event_type, timestamp)`. Milestone 2's anomaly engine reads this
table by employee-over-time and by type-over-time, so both access paths are
indexed now.

`is_after_hours` is computed at write time (outside 08:00–19:00 local) rather
than at query time, because every dashboard aggregate filters on it.

## 4. API surface (`/api/v1`)

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Self-registration; first user becomes ADMIN, rest default to SECURITY_ANALYST |
| POST | `/auth/login` | OAuth2 password form → `{access_token, refresh_token}` |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | Update own profile |

### Resources
| Method | Path | Min role |
|---|---|---|
| GET | `/employees` | ANALYST — filters: `q`, `department_id`, `status`; paginated |
| POST/PATCH/DELETE | `/employees[/{id}]` | MANAGER (delete: ADMIN) |
| GET | `/employees/{id}` · `/activities` · `/devices` · `/privileges` | ANALYST |
| GET/POST/PATCH/DELETE | `/departments[/{id}]` | ANALYST read / MANAGER write |
| GET/POST/PATCH/DELETE | `/devices[/{id}]` | ANALYST read / SOC_ENGINEER write |
| GET | `/activities` | ANALYST — filters: `employee_id`, `event_type`, `start`, `end`, `after_hours` |
| POST | `/activities` | SOC_ENGINEER |
| POST | `/activities/ingest` | SOC_ENGINEER — multipart CSV upload |
| GET | `/dashboard/summary` | ANALYST |
| GET/PATCH/DELETE | `/users[/{id}]` | ADMIN |

### RBAC

A single `require_roles(*roles)` FastAPI dependency guards every non-public
route. Role hierarchy is flat, not nested — each endpoint names the roles it
accepts explicitly, so widening access is a visible one-line change rather than
a side effect of an inheritance chain.

### `/dashboard/summary` response

```json
{
  "total_employees": 25,
  "active_employees": 22,
  "total_events": 5000,
  "events_last_24h": 168,
  "after_hours_events": 412,
  "usb_events": 96,
  "events_over_time": [{"date": "2026-07-11", "count": 163}],
  "events_by_type": [{"event_type": "LOGIN", "count": 1240}],
  "top_active_employees": [{"employee_id": 3, "full_name": "...", "count": 312}],
  "recent_events": [ActivityEvent, ...]
}
```

## 5. Frontend

| Route | Contents | Guard |
|---|---|---|
| `/login` | Email + password → JWT | public |
| `/` | Dashboard: KPI tiles, events-over-time area chart, event-type donut, after-hours callout, recent activity feed | any role |
| `/employees` | Filterable/sortable table, create + edit modal | any role (write UI hidden below MANAGER) |
| `/employees/:id` | Profile card, devices, privileges, personal activity timeline | any role |
| `/activity` | Event stream with multi-filter bar, CSV ingest upload | any role (upload SOC_ENGINEER+) |
| `/admin/users` | User list, role assignment, activate/deactivate | ADMIN |
| `/profile` | Own profile | any role |

**Auth handling:** access token held in React state (memory only); refresh token
in `localStorage`. An axios response interceptor retries once on 401 by
refreshing, and hard-logs-out if the refresh fails.

**Theme:** dark SOC console — slate background, cyan accent, severity colors
reserved for event semantics so they stay meaningful when Milestone 3 adds
alerts.

## 6. Seed data

A seed script generates a realistic starting corpus so the dashboard is not
empty on first boot:

- 6 departments, ~25 employees with manager relationships
- 1–2 devices per employee, 1–3 privileges per employee
- ~5,000 activity events spread over the trailing 30 days, weighted toward
  business hours with a realistic minority after-hours tail
- 4 demo users, one per role, with documented credentials

The event distribution is CERT-dataset-shaped (login-heavy, with a long tail of
file and transfer events) so Milestone 2's baselines have something meaningful
to learn from.

## 7. Testing

**Backend (`pytest`)** — runs against a throwaway SQLite database:
- registration, login, refresh, `/auth/me`
- RBAC: each guarded endpoint rejects an under-privileged role with 403
- employee CRUD including manager self-reference and cascade behavior
- activity filtering by employee, type, and date range
- CSV ingestion: valid rows persisted, malformed rows reported not crashed

**Frontend (`vitest`)** — auth context token lifecycle, and a table render smoke
test.

## 8. Deployment

- `backend/Dockerfile` — python:3.12-slim, uvicorn
- `frontend/Dockerfile` — node build stage → nginx:alpine serving static assets,
  proxying `/api` to the API container
- `docker-compose.yml` — postgres (named volume), api (waits on DB healthcheck,
  runs table creation + seed on start), web
- `.env.example` documenting every setting

## 9. Out of scope for Milestone 1

Behavioral baselines, anomaly detection, insider risk scoring, UEBA peer
grouping, alerting and escalation, investigation workflows, PDF/Excel export,
Elasticsearch. Milestone 1 ends when a user can log in, manage employees, ingest
and browse activity, and see it aggregated on a dashboard.
