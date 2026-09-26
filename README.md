# AI-Powered Insider Threat Behavioral Intelligence & SOC Platform

An enterprise-grade, explainable AI cybersecurity platform designed for Security Operations Centers (SOC) to detect, investigate, and mitigate malicious insider activity and intellectual property exfiltration. Engineered from the ground up on the official **CERT Insider Threat Dataset Release 4.2**.

---

## Architecture Overview

```
                          ┌─────────────────────────────────────────────────────────┐
                          │         CERT Insider Threat Dataset Release 4.2         │
                          │  (Logon, Device/USB, File, HTTP, Email, LDAP, Psycho)   │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │       Memory-Optimized Chunked Preprocessing Pipeline   │
                          │       (ml/preprocessing/*.py -> Daily User Aggregates)  │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │        Behavioral Feature Engineering & Baselines       │
                          │  (Rolling 7-day shifts, Z-scores, Activity Deviation)   │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                         ┌─────────────────────────────┴─────────────────────────────┐
                         ▼                                                           ▼
         ┌────────────────────────────────┐                         ┌────────────────────────────────┐
         │ Unsupervised Isolation Forest  │                         │   Supervised XGBoost Model     │
         │  (ml/models/isolation_forest)  │                         │   (ml/models/xgboost_model)    │
         │  Calibrated Anomaly Scores     │                         │  Ground Truth Separation       │
         └───────────────┬────────────────┘                         └────────────────┬───────────────┘
                         │                                                           │
                         └─────────────────────────────┬─────────────────────────────┘
                                                       ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │            5-Factor Explainable Risk Engine             │
                          │      Risk Score = 35% ML + 25% Role + 20% Data +        │
                          │                 10% Access + 10% Baseline               │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         ▼                             ▼                             ▼
         ┌────────────────────────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐
         │ Automated SOC Alert Engine     │  │ Incident Cases   │  │ Forensic Timeline Generator     │
         │ (Rules + Explainable Drivers)  │  │ (MITRE ATT&CK)   │  │ (Multi-Channel Event Sequence)  │
         └───────────────┬────────────────┘  └────────┬─────────┘  └────────────────┬────────────────┘
                         │                            │                             │
                         └────────────────────────────┼─────────────────────────────┘
                                                      ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │               FastAPI High-Performance Backend          │
                          │    (JWT Authentication, RBAC, REST APIs, SQLite/Postgres)│
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼
                          ┌─────────────────────────────────────────────────────────┐
                          │         SOC Cyber Dark Modern React / Vite UI           │
                          │   (Dashboard, Employees, Activities, Alerts, Incidents) │
                          └─────────────────────────────────────────────────────────┘
```

---

## Key Features

1. **CERT R4.2 Ingestion & Feature Engineering**:
   - Memory-efficient chunked ingestion (`chunk_size=100,000`).
   - Extracts 49 multi-channel behavioral indicators across Logon, USB, File, Web, and Email.
   - Computes rolling historical averages (7-day window with shift(1)), statistical z-scores, and composite activity deviation scores.

2. **Dual-Model ML Architecture**:
   - **Unsupervised Isolation Forest**: Calibrated `[0.0, 1.0]` anomaly scoring with feature deviation explainability.
   - **Supervised XGBoost Classifier**: Trained on CERT ground truth malicious scenarios with 100% insider recall on validation cases.

3. **5-Factor Explainable Risk Engine**:
   - $\text{Risk Score} = 0.35 \times F_{\text{ML}} + 0.25 \times F_{\text{Role}} + 0.20 \times F_{\text{Data}} + 0.10 \times F_{\text{Access}} + 0.10 \times F_{\text{Baseline}}$
   - Granular score breakdowns and human-readable key drivers for SOC triage.

4. **Forensic Timeline & Incident Correlation**:
   - Multi-channel chronological event reconstruction (`LOGON`, `DEVICE`, `FILE`, `HTTP`, `EMAIL`).
   - MITRE ATT&CK technique mapping (`T1052.001`, `T1567`, `T1078`, `T1005`, `T1048`).
   - Automated incident case creation and analyst comment workflows.

5. **Enterprise Role-Based Access Control (RBAC)**:
   - Security Analyst (Tier 1/2 Triage & Case Notes)
   - SOC Engineer (ML Model Training & Pipeline Configuration)
   - Security Manager (Incident Approval & Executive Risk Reports)
   - Administrator (System Audits & User Provisioning)

---

## Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose

### 1. Run via Automated Script (Windows)
```powershell
.\start_app.ps1
```
or
```cmd
start_app.bat
```

### 2. Manual Startup

#### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run ML Pipeline & Train Models
python -m ml.preprocessing.pipeline
python -m ml.training.train --model-type all

# Initialize Database
python -c "from backend.app.db.init_db import init_database; init_database()"

# Start FastAPI Backend Server
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be live at:
- **Frontend SOC Dashboard**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Default Demo Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `Password123!` |
| **SOC Manager** | `manager` | `Password123!` |
| **SOC Engineer** | `soc_engineer` | `Password123!` |
| **Security Analyst** | `analyst` | `Password123!` |

*(Use the 1-click Persona Switcher on the Login page for quick testing).*

---

## Running the Automated Test Suite

To run all 26 unit and integration test suites covering Phases 1 through 9:
```bash
python -m pytest -v
```

---

## Docker Deployment

To launch the complete containerized stack:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:8000`

---

## MITRE ATT&CK Insider Threat Matrix Mapping

| ID | Technique | Detection Indicator |
| :--- | :--- | :--- |
| **T1052.001** | Exfiltration via Removable Media | USB connect spikes, abnormal after-hours file copy volume |
| **T1567** | Exfiltration Over Web Service | HTTP POST requests to unapproved cloud storage (e.g. mega.nz) |
| **T1078** | Valid Accounts: Off-Hours Activity | Unscheduled weekend / after-hours logins (outside 08:30–17:30) |
| **T1005** | Data from Local System | Abnormal access and copying of sensitive/confidential source code |
| **T1048** | Exfiltration Over Alternative Protocol | Outbound email attachment bursts sent to personal webmail addresses |
