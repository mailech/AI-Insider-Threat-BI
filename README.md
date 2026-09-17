# 🛡️ CYBER AI

### Enterprise Insider Threat Behavioral Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-18E66A.svg?style=flat-square)](https://github.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-0D261A.svg?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-2DFF78.svg?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-18E66A.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat-square&logo=python)](https://www.python.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-0D261A.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![SOC Platform](https://img.shields.io/badge/SOC%20v4.2-Certified-18E66A.svg?style=flat-square)](https://github.com)

**CYBER AI** is an enterprise-grade AI behavioral cybersecurity platform and Security Operations Center (SOC) command dashboard designed to continuously analyze employee and machine identity behavior, detect insider anomalies, compute multi-vector risk scores, investigate high-risk activities, and orchestrate real-time defensive containment.

---

## 📂 Project Architecture (Frontend & Backend)

The project is structured with a modular, decoupled architecture featuring a FastAPI backend and a Next.js (App Router) frontend.

```text
project/
├── frontend/                     # Next.js 16 + React 19 + Tailwind CSS v4 Frontend
│   ├── src/
│   │   ├── app/                  # Next.js App Router ((auth), (dashboard) routes)
│   │   ├── components/           # SOC Widgets, Risk Gauges, Sidebar & TopBar
│   │   ├── services/             # Axios REST API Client & Service hooks
│   │   ├── types/                # Shared data schemas & threat types
│   │   └── lib/                  # RBAC controls & security helpers
│   ├── public/                   # Static icons & UI assets
│   ├── next.config.ts            # Next.js configuration
│   └── package.json              # Standalone frontend dependencies & scripts
│
├── backend/                      # Python + FastAPI + SQLAlchemy + MongoDB Backend
│   ├── app/
│   │   ├── api/v1/               # REST API Endpoints (Auth, Employees, Telemetry, etc.)
│   │   ├── core/                 # App configuration & JWT security settings
│   │   ├── db/                   # Database init, SQLAlchemy ORM & Motor Mongo pools
│   │   ├── models/               # Pydantic & SQLAlchemy domain models
│   │   └── services/             # Risk scoring & UEBA intelligence engine
│   ├── cyberai.db                # SQLite database storage
│   ├── seed_data.py              # Data seeding & synthetic log generator script
│   ├── requirements.txt          # Backend Python dependencies
│   └── verify_cyber_backend.py   # Automated backend test suite
│
└── README.md                     # Project documentation
```

---

## 🚀 REST API Endpoints (Backend)

The `backend/app/main.py` service provides RESTful APIs for identity management, log telemetry ingestion, risk scoring analytics, and UEBA anomaly detection:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check & service status |
| `POST` | `/api/v1/auth/login` | Authenticate user credentials & return JWT access token |
| `GET` | `/api/v1/auth/me` | Fetch active user dossier & assigned security roles |
| `GET` | `/api/v1/employees/` | List monitored employee identity dossiers (paginated) |
| `GET` | `/api/v1/employees/{emp_id}` | Retrieve detailed profile & asset inventory for an employee |
| `POST` | `/api/v1/employees/` | Onboard a new monitored employee profile |
| `POST` | `/api/v1/telemetry/ingest` | Ingest real-time security log & behavioral telemetry |
| `GET` | `/api/v1/telemetry/recent` | Stream recent ingested activity logs |
| `GET` | `/api/v1/analytics/overview` | Threat posture overview, risk metrics, and alert counts |
| `GET` | `/api/v1/analytics/timeline` | Compute historical risk score trend & threat timeline |
| `GET` | `/api/v1/ueba/anomalies` | Query UEBA behavioral anomalies & baseline deviations |
| `GET` | `/api/v1/ueba/score/{emp_id}` | Calculate real-time multi-vector risk score for a subject |
| `GET` | `/api/v1/reports/executive` | Generate executive threat intelligence & compliance report |
| `GET` | `/api/v1/reports/export` | Export threat intelligence data (CSV / JSON format) |

---

## ⚡ Getting Started

### 1. Running the Backend (FastAPI REST API)

```bash
# Navigate to backend directory
cd backend

# Create & activate a Python virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Seed the database with sample security data
python seed_data.py

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend REST API will run on [http://localhost:8000](http://localhost:8000).  
Interactive Swagger API Documentation is available at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

---

### 2. Running the Frontend (Next.js Web Client)

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start Next.js development server
npm run dev
```
Frontend web application will run on [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Configuration

### Backend Environment Configuration (`backend/.env`):
```env
APP_NAME="CYBER AI"
SECRET_KEY="your_jwt_secret_key_here"
ACCESS_TOKEN_EXPIRE_MINUTES=480
DATABASE_URL="sqlite:///./cyberai.db"
MONGO_URL="mongodb://localhost:27017"
```

### Frontend Environment Configuration (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
```

---

## ⌨️ Global SOC Modules & Navigation

| Module | Features |
| :--- | :--- |
| **Executive Dashboard** | Security posture gauge, threat level overview, and active alert feeds |
| **UEBA Intelligence** | Peer group behavior benchmarking & anomaly score distribution |
| **Telemetry Monitor** | High-throughput security log ingestion (Authentication, Network, Endpoint, DLP) |
| **Risk Scoring Engine** | Multi-vector risk computation (Access, Data Exfiltration, Anomalous Hours) |
| **Employee Dossiers** | 360° Identity profiling, asset association & risk history breakdown |
| **Reports & Export** | Executive PDF/CSV report generation & automated compliance logging |

---

## 📄 License

Distributed under the **Apache-2.0 License**. See `LICENSE` for more information.

<p align="center">
  <b>CYBER AI</b> • Enterprise Insider Threat Behavioral Intelligence Platform
</p>
