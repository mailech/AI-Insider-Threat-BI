# 🛡️ INSIDER/IQ
### *Insider Threat Behavioral Intelligence System*

<p>
  <img src="https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=next.js&logoColor=c5ff4a" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-000000?style=for-the-badge&logo=fastapi&logoColor=c5ff4a" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-000000?style=for-the-badge&logo=postgresql&logoColor=c5ff4a" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Scikit_Learn-000000?style=for-the-badge&logo=scikitlearn&logoColor=c5ff4a" alt="Scikit-learn" />
  <img src="https://img.shields.io/badge/Python-000000?style=for-the-badge&logo=python&logoColor=c5ff4a" alt="Python" />
</p>

<p>
  <img src="https://img.shields.io/badge/MILESTONE_1-COMPLETE-c5ff4a?style=flat-square" alt="M1" />
  <img src="https://img.shields.io/badge/MILESTONE_2-COMPLETE-c5ff4a?style=flat-square" alt="M2" />
  <img src="https://img.shields.io/badge/MILESTONE_3-COMPLETE-c5ff4a?style=flat-square" alt="M3" />
  <img src="https://img.shields.io/badge/MILESTONE_4-IN_PROGRESS-8a8a8a?style=flat-square" alt="M4" />
</p>

> A behavioral intelligence platform designed to detect, analyze, investigate, and respond to suspicious insider activity before it becomes a security incident.

---

## `[ WHY THIS EXISTS ]`

Traditional security systems are heavily focused on external threats.

**INSIDER/IQ focuses on the behavior happening inside the organization.**

The platform brings employee identity, activity telemetry, behavioral profiling, anomaly detection, machine-learning-based risk scoring, investigations, alerts, and reporting into a single security intelligence platform.

The objective is simple:

> **Detect unusual behavior → understand why it matters → investigate the employee → quantify the risk → take action.**

---

## `[ ARCHITECTURE ]`

INSIDER/IQ is built as a **three-service application architecture**:

```text
┌─────────────────────────────────────────────┐
│              INSIDER/IQ UI                  │
│         Next.js + React + TypeScript        │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│              INSIDER/IQ API                 │
│         FastAPI + SQLAlchemy + JWT          │
└───────────────┬─────────────────┬───────────┘
                │                 │
                │                 │ ML Requests
                ▼                 ▼
┌────────────────────────┐   ┌──────────────────────┐
│      PostgreSQL        │   │     ML Service       │
│                        │   │                      │
│ Employees              │   │ Isolation Forest     │
│ Activities             │   │ Anomaly Detection    │
│ Risk Scores            │   │ Behavioral Analysis  │
│ Investigations         │   │ Risk Signals         │
│ Alerts                 │   │                      │
└────────────────────────┘   └──────────────────────┘
```

### Services

| Service | Technology | Port |
|---|---|---:|
| Frontend | Next.js / React / TypeScript | `3000` |
| Backend API | FastAPI / Python | `8000` |
| ML Service | Python / Scikit-learn | `8001` |
| Database | PostgreSQL | `5432` |

---

## `[ CORE CAPABILITIES ]`

### 🔐 Authentication & RBAC

Secure authentication with role-based access control.

Supported security roles include:

- **Administrator**
- **Security Manager**
- **SOC Engineer**
- **Security Analyst**

Authentication is handled through JWT-based sessions with protected API endpoints and role-aware access.

---

### 👤 Employee Intelligence

INSIDER/IQ maintains a centralized employee security profile containing information such as:

- Employee identity
- Department
- Role
- Access level
- Employment status
- Devices and access context
- Behavioral information
- Risk information

The employee profile acts as the central entity connecting behavioral activity, anomalies, and security investigations.

---

### 📡 Activity Monitoring

The platform models employee activity across multiple categories, including:

- Login activity
- File access
- File transfers
- USB/device connections
- Email activity
- Privileged operations
- After-hours activity
- Authentication-related behavior

Activity data provides the behavioral signals used by the detection and risk-analysis pipeline.

---

### 🧠 Behavioral Profiling

INSIDER/IQ establishes behavioral baselines for employees and tracks deviations from their normal activity patterns.

Behavioral indicators include signals such as:

```text
Login Frequency
After-hours Activity
File Access Behaviour
USB Usage
Email Activity
Privilege-related Activity
```

This allows suspicious changes to be examined relative to an employee's own historical behavior rather than relying only on static thresholds.

---

### 🚨 Anomaly Detection

The system identifies anomalous behavior across multiple threat categories.

Examples include:

- Unusual login behavior
- Excessive file access
- Suspicious file transfers
- Abnormal USB activity
- After-hours access
- Privilege-related anomalies
- Unusual communication patterns

The ML service uses **Isolation Forest** to identify statistically unusual behavioral patterns.

---

### 📊 Insider Risk Scoring

INSIDER/IQ converts security signals into an employee-level risk score.

The risk model combines multiple dimensions of behavior:

```text
Risk Score
    │
    ├── Behavioral Anomalies
    ├── Activity Signals
    ├── Threat Indicators
    ├── Access / Privilege Context
    └── Historical Risk
```

Risk levels are represented using four bands:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

This gives security teams a prioritized view of employees requiring investigation.

---

### 🔎 Threat Investigation

Security teams can investigate suspicious employees and security events through a dedicated investigation workflow.

Investigations can include:

- Employee context
- Severity
- Investigation status
- Related anomalies
- Investigation notes
- Resolution information
- Supporting evidence

The objective is to move from automated detection to a structured human investigation process.

---

### 🕵️ UEBA

The platform follows a **User and Entity Behavior Analytics (UEBA)** approach by correlating:

```text
Identity
   +
Activity
   +
Behavioral Baseline
   +
Anomalies
   +
Risk
   =
Security Intelligence
```

This correlation helps security analysts understand not only **what happened**, but also **how unusual the behavior is for that user**.

---

### 🔔 Alerts & Incidents

Detected anomalies can be surfaced as security alerts for investigation and response.

Alert information includes:

- Severity
- Status
- Employee
- Detection category
- Description
- Timestamp
- Risk context

This provides a centralized workflow for handling suspicious activity.

---

### 📈 Security Dashboard

The dashboard provides a high-level operational view of the environment.

Key metrics include:

```text
Total Employees
Active Employees
High / Critical Risk Employees
Open Alerts
Detected Anomalies
Active Investigations
Fleet Risk Overview
```

The dashboard is designed to give security teams a quick understanding of the current insider-threat posture.

---

### 📄 Reports & Export

INSIDER/IQ supports security reporting and data export.

Available report categories include:

- Insider Threat Reports
- Behavioral Reports
- Compliance Reports
- Risk Assessment Reports
- Investigation Reports

Supported export formats include:

```text
PDF
Excel
```

---

## `[ MACHINE LEARNING PIPELINE ]`

The ML service is based on **Isolation Forest** anomaly detection.

### Behavioral Features

The current detection pipeline uses behavioral signals including:

```text
logon_count
after_hours_logon_count
usb_connect_count
file_copy_count
email_count
```

The ML service evaluates these features to identify employees whose activity differs significantly from expected behavioral patterns.

```text
Employee Activity
       │
       ▼
Feature Extraction
       │
       ▼
Behavioral Feature Vector
       │
       ▼
Isolation Forest
       │
       ▼
Anomaly Detection
       │
       ▼
Risk Analysis
```

---

## `[ DATA FLOW ]`

```text
Employee Activity
       │
       ▼
Activity Storage
       │
       ▼
Behavioral Profiling
       │
       ▼
Anomaly Detection
       │
       ▼
Risk Scoring
       │
       ▼
Alerts / Investigations
       │
       ▼
Dashboard / Reports
```

---

## `[ PROJECT STRUCTURE ]`

```text
AI-Insider-Threat-BI/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── reports/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── ...
│   ├── package.json
│   └── package-lock.json
│
├── ml-service/
│   ├── app/
│   ├── model/
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   └── README.md
│
└── README.md
```

---

## `[ LOCAL DEVELOPMENT ]`

### 1. Start PostgreSQL

Make sure PostgreSQL is running and the `insider_iq` database is available.

---

### 2. Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend API:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

### 3. Start the ML Service

```bash
cd ml-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

ML service:

```text
http://localhost:8001
```

---

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## `[ API ]`

The backend exposes REST APIs for:

```text
Authentication
Employees
Activities
Behavioral Indicators
Anomalies
Risk Scores
Investigations
Alerts
Users
Reports
```

Interactive API documentation is available through FastAPI Swagger:

```text
http://localhost:8000/docs
```

---

## `[ SECURITY MODEL ]`

INSIDER/IQ follows a layered security-analysis model:

```text
IDENTITY
   ↓
ACTIVITY
   ↓
BEHAVIOR
   ↓
ANOMALY
   ↓
RISK
   ↓
INVESTIGATION
   ↓
RESPONSE
```

Each layer contributes context to the next, allowing security teams to investigate behavior rather than isolated events.

---

## `[ CURRENT STATUS ]`

<p>
  <img src="https://img.shields.io/badge/Backend-COMPLETE-c5ff4a?style=flat-square" alt="Backend" />
  <img src="https://img.shields.io/badge/Database-INTEGRATED-c5ff4a?style=flat-square" alt="Database" />
  <img src="https://img.shields.io/badge/ML%20Service-INTEGRATED-c5ff4a?style=flat-square" alt="ML" />
  <img src="https://img.shields.io/badge/Frontend-INTEGRATED-c5ff4a?style=flat-square" alt="Frontend" />
</p>

The current implementation includes the core platform, backend API, PostgreSQL persistence, ML-based anomaly detection, risk scoring, investigations, dashboards, alerts, and report generation.

---

## `[ PROJECT OBJECTIVE ]`

INSIDER/IQ is intended to provide a unified platform for:

> **Detecting abnormal insider behavior, quantifying risk, investigating threats, and giving security teams the context needed to respond.**

---

## `[ LICENSE ]`

Developed as an academic / internship project for Insider Threat Behavioral Intelligence research and implementation.

