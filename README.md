# SENTINEL — Insider Threat Behavioral Intelligence System

Professional academic SOC implementation aligned to the supplied project specification.

## Project flow
Activity ingestion → Behavioral profiling → Anomaly detection → Insider risk scoring → UEBA → Alert → Investigation → Reporting.

## PDF milestone coverage
- **Milestone 1 (Weeks 1–2):** architecture/database setup, React/FastAPI environments, JWT/OAuth2-compatible authentication, RBAC, employee profiles, activity ingestion.
- **Milestone 2 (Weeks 3–4):** behavioral baselines, profiling, Isolation Forest anomaly detection, anomaly reporting.
- **Milestone 3 (Weeks 5–6):** weighted risk scoring, UEBA analytics, investigations, risk dashboards.
- **Milestone 4 (Weeks 7–8):** executive/SOC dashboards, PDF/XLSX reports, tests, Docker deployment, documentation.

## Main modules
1. Authentication & RBAC
2. Employee Identity & Profile Management
3. Activity Monitoring Engine
4. Behavioral Profiling Engine
5. Anomaly Detection Engine
6. Insider Risk Scoring Engine
7. Threat Investigation Module
8. UEBA Intelligence Engine
9. Alert & Incident Management
10. Dashboard & Analytics
11. Notification/Escalation foundation
12. Reports & Export
13. Integration, Testing & Deployment

## Run locally
### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal. Demo credentials: **admin / Admin@123**.

### Docker
```bash
docker compose up --build
```

## Production database
Set `DATABASE_URL` to PostgreSQL. The default local setup uses SQLite for zero-friction academic demonstration.

## Notes
This is a defensive security analytics platform. Demo telemetry is synthetic and is intended for academic demonstration/testing.
