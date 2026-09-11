# Sentinel Insight backend

FastAPI backend architecture for the Insider Threat Behavioral Intelligence System described in the project brief.

## Current scope

- Versioned REST API under `/api`
- JWT-ready, role-aware authentication foundation
- Dashboard and alert endpoints compatible with the existing React frontend
- In-memory repository only for local development until the database is supplied
- Domain boundaries for employees, activity ingestion, behavioral analytics, risk scoring, alerts, investigations, reports, and audit events

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

The frontend should set `VITE_API_URL=http://localhost:8000/api`.

Before database integration, copy `.env.example` to `.env` and populate the PostgreSQL, MongoDB, and search-store values. Do not commit `.env`; it contains credentials.

## Database handoff

Once database access details are available, implement the repository interfaces in `app/repositories/` with a PostgreSQL-backed implementation. Keep the route and service layers unchanged. Store database and JWT secrets only in environment variables or a managed secret store; never commit them.
