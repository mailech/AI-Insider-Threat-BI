# AI Insider Threat BI

An AI-powered insider-threat behavioral intelligence prototype for employee activity monitoring, anomaly detection, risk scoring, UEBA analysis, and threat investigation workflows.

## Current Scope

The `Rahul-Badam` branch includes the workflow through Milestone 3:

- JWT-style authentication and role-based access control
- Employee identity, device, and privilege profiles
- Activity ingestion and monitoring dashboard
- CERT Insider Threat Dataset import
- Behavioral feature extraction and baseline profiles
- Isolation Forest anomaly detection
- Supplied `insider_threat_model.joblib` integration
- Employee risk scoring and department peer-group UEBA
- Anomaly findings and investigation case management

## Technology

- Backend: Python, FastAPI, SQLite
- Frontend: HTML, CSS, JavaScript
- Machine learning: scikit-learn, pandas, NumPy, joblib
- Authentication: signed bearer tokens with role controls

## Run Locally

From the repository root:

```powershell
C:/Python314/python.exe -m pip install -r requirements.txt
C:/Python314/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000>.

Demo administrator credentials:

```text
Email: admin@soc.local
Password: Admin@12345
```

The database is created automatically at `data/insider_threat.db` and demo users, employees, and activity records are seeded on first startup.

## Dashboard Workflows

1. Sign in as an administrator or analyst.
2. Use **Activity** to review telemetry and **Ingestion** to submit an event.
3. Open **Intelligence** and select **Import CERT** after the local CERT files are available.
4. Select **Run analysis** to create behavioral profiles, anomalies, and updated risk scores.
5. Use **Investigations** to open and review threat cases.

## CERT Dataset

The importer expects the extracted CERT answer-set structure at:

```text
data/datasets/cert/answers/insiders.csv
data/datasets/cert/answers/<release>/*.csv
```

The local CERT dataset is intentionally ignored by Git because the extracted files are large. The archive should be extracted locally before using the **Import CERT** action. Imported events are stored in SQLite with CERT event IDs, source filenames, and ground-truth scenario labels in metadata.

The backend endpoint is `POST /api/analytics/datasets/import-cert`. Repeated imports are idempotent.

## Machine Learning Model

Place the supplied model at `data/insider_threat_model.joblib`.

The application validates the bundle keys and feature count, then maps activity data to these expected features:

```text
logon_count
after_hours_logon_count
usb_connect_count
file_copy_count
email_count
```

The model is loaded at analysis time. If it is unavailable or incompatible, the application uses a transparent heuristic fallback and reports the active model version in the analysis response.

## API Highlights

```text
POST /api/auth/login
POST /api/activity/ingest
POST /api/analytics/datasets/import-cert
POST /api/analytics/run
GET  /api/analytics/profiles
GET  /api/analytics/anomalies
GET  /api/analytics/risk
GET  /api/analytics/ueba
GET  /api/analytics/investigations
POST /api/analytics/investigations
```

All analytics and activity endpoints require a bearer token. Ingestion, analysis, dataset import, and investigation creation require an SOC Engineer, Security Manager, or Administrator role.

## Validation

```powershell
C:/Python314/python.exe scripts/smoke_test.py
```

The health endpoint reports `milestone: 3` when the application is running.