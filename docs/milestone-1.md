# Milestone 1 Completion Notes

## Scope

Milestone 1 covers project initialization, system architecture, database schema, frontend and backend environments, authentication, employee profiles, and activity log ingestion.

## Architecture

```text
Browser dashboard
  |
  | HTTPS/JSON bearer auth
  v
FastAPI application
  |-- Auth and RBAC
  |-- Employee profile APIs
  |-- Activity ingestion APIs
  |-- Dashboard aggregation APIs
  v
SQLite database for local milestone demo
```

The current app is intentionally modular:

- `backend/app/security.py` owns password hashing, signed bearer tokens, and role dependencies.
- `backend/app/database.py` owns schema creation and SQLite connection setup.
- `backend/app/routers/` contains the API boundaries.
- `backend/app/services/seed.py` creates demo SOC users, employees, and telemetry.
- `frontend/` contains the dashboard shell, styling, and API client logic.

## Roles

- Security Analyst: read dashboard, employees, and activity.
- SOC Engineer: read data and ingest activity logs.
- Security Manager: read data, ingest logs, and manage employee profiles.
- Administrator: full Milestone 1 access, including user registration and employee deactivation.

## Workflows Implemented

1. User signs in and receives a signed bearer token.
2. The dashboard loads KPI, trend, watchlist, severity, and feed data from API endpoints.
3. Analysts can review employees and activity.
4. Managers and administrators can create employee profiles.
5. SOC engineers, managers, and administrators can ingest activity logs.
6. Ingested high-severity activity updates the employee triage score for dashboard visibility.

## Database Entities

- `users`: platform accounts, password hashes, role, and status.
- `employees`: workforce identity, department, manager, device, access privileges, risk score, and status.
- `ingestion_batches`: activity import metadata.
- `activity_logs`: monitored events such as logins, downloads, uploads, transfers, email activity, remote access, and privilege changes.

## Milestone 2 Ready Points

- Replace the simple triage score update with behavioral baseline services.
- Add anomaly model outputs to `activity_logs` or a dedicated `anomalies` table.
- Store model versions and scoring explanations for investigations.
- Add dataset import adapters for CERT, LANL, and CMU insider threat data.
