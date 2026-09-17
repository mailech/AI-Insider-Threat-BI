🛡️ ITBIS — AI Insider Threat Behavioral Intelligence System

«An AI-powered full-stack cybersecurity platform for monitoring employee behavior, detecting anomalous activity, calculating behavioral threat scores, and helping security teams identify potentially risky insider activity.»

React.js · FastAPI · Python · PostgreSQL · MongoDB · Machine Learning · JWT/RBAC · Docker

---

📌 Project Overview

ITBIS (Insider Threat Behavioral Intelligence System) is a full-stack cybersecurity platform designed to analyze employee activity and identify potentially suspicious behavioral patterns.

The system combines structured employee and asset information with activity telemetry, behavioral feature extraction, machine-learning-based anomaly detection, and multi-factor risk scoring.

ITBIS provides security teams with a centralized dashboard to:

- Monitor employee behavioral risk
- Analyze activity and telemetry data
- Detect unusual behavioral patterns
- Calculate threat scores
- Classify employees into LOW, MEDIUM, HIGH, and CRITICAL risk levels
- Manage employees and assets
- Control system access through role-based permissions

---

🎯 Project Objective

Modern organizations generate large volumes of employee activity data through login, file access, device usage, and other security events.

Manually analyzing this information makes it difficult to identify unusual behavior and prioritize potentially risky users.

ITBIS addresses this problem by combining:

🔐 Identity Management

Employee, asset, user, and role information is maintained in PostgreSQL.

📡 Activity & Telemetry Storage

Behavioral activity and telemetry logs are stored in MongoDB, allowing flexible activity records.

🤖 Behavioral Anomaly Detection

Employee activity is converted into behavioral features and analyzed using Isolation Forest.

📊 Risk Scoring

Multiple behavioral factors are combined into a normalized threat score from 0–100.

🛡️ Role-Based Access Control

JWT authentication and RBAC restrict access based on the user's role.

---

✨ Key Features

🔐 Authentication & RBAC

- JWT-based authentication
- Password hashing using bcrypt
- Protected API endpoints
- Role-based authorization
- Role-aware dashboard experience
- Secure logout
- Protected frontend navigation

Supported Roles

Role| Primary Responsibility
👑 "ADMINISTRATOR"| System administration and user management
🛡️ "SECURITY_MANAGER"| Risk monitoring and employee oversight
🚨 "SOC_ENGINEER"| Technical security monitoring and telemetry investigation
📊 "SECURITY_ANALYST"| Behavioral analytics and risk monitoring

---

👥 Employee Management

ITBIS provides employee and asset management capabilities.

The system supports:

- Employee registration
- Employee information retrieval
- Employee search
- Department-based information
- Employee risk classification
- Asset association
- Device information
- IP information

Structured employee and asset information is maintained in PostgreSQL.

---

📡 Telemetry & Activity Monitoring

The system processes behavioral activity data such as:

- Login activity
- File access
- Device connections
- After-hours activity
- Weekend activity
- Unique PCs accessed
- Unique files accessed

Activity logs are stored in MongoDB and can be used for behavioral analysis.

Example telemetry event

{
  "employee_id": "EMP_ADMIN",
  "activity_type": "FILE_ACCESS",
  "description": "Accessed confidential financial files",
  "severity": "HIGH"
}

---

🤖 AI-Based Anomaly Detection

ITBIS uses Isolation Forest for behavioral anomaly detection.

The activity data is transformed into behavioral features before being passed to the anomaly detection model.

Behavioral Features

The current analysis includes:

- "login_count"
- "after_hours_logins"
- "weekend_logins"
- "unique_pcs"
- "device_connections"
- "device_unique_pcs"
- "file_accesses"
- "unique_files"
- "after_hours_file_accesses"

AI Pipeline

Raw Activity Data
        ↓
Data Processing
        ↓
Behavioral Feature Extraction
        ↓
Employee Behavioral Profile
        ↓
Isolation Forest
        ↓
Anomaly Score
        ↓
Risk Scoring
        ↓
Threat Classification
        ↓
Dashboard / Security Monitoring

---

📊 Threat Risk Scoring

ITBIS combines multiple behavioral factors to calculate a normalized threat score.

Threat Score =
100 × (
    0.35 × Anomaly
  + 0.25 × Frequency
  + 0.25 × Asset Criticality
  + 0.15 × Severity
)

🚦 Risk Classification

Threat Level| Score Range
🟢 LOW| "0 – 29.99"
🟡 MEDIUM| "30 – 59.99"
🟠 HIGH| "60 – 79.99"
🔴 CRITICAL| "80 – 100"

This converts complex behavioral analysis into an understandable security indicator for monitoring and investigation.

---

🏗️ High-Level Architecture

                    ┌──────────────────────┐
                    │       Security       │
                    │        Users         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │                      │
                    │ Dashboard            │
                    │ Employees            │
                    │ Telemetry            │
                    │ Analytics            │
                    │ Reports              │
                    │ Settings             │
                    └──────────┬───────────┘
                               │
                         REST API + JWT
                               │
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    │                      │
                    │ Authentication       │
                    │ RBAC                 │
                    │ Employee APIs        │
                    │ Telemetry APIs       │
                    │ Analytics APIs       │
                    └───────┬───────┬──────┘
                            │       │
                 ┌──────────┘       └──────────┐
                 ▼                             ▼
        ┌─────────────────┐           ┌─────────────────┐
        │   PostgreSQL    │           │     MongoDB     │
        │                 │           │                 │
        │ Users           │           │ Activity Logs   │
        │ Roles           │           │ Telemetry       │
        │ Employees       │           │ Behavioral Data │
        │ Assets          │           │                 │
        └─────────────────┘           └────────┬────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ Feature Extraction  │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  Isolation Forest   │
                                    │ Anomaly Detection   │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │    Risk Scoring     │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ LOW / MEDIUM / HIGH │
                                    │      / CRITICAL     │
                                    └─────────────────────┘

---

🖥️ Application Pages

Page| Purpose
🔐 Login| Secure authentication and role-based access
📊 Dashboard| Overall security and behavioral risk overview
👥 Employees| Employee information and risk monitoring
📡 Telemetry| Activity and telemetry monitoring
🤖 Analytics| Behavioral analysis and anomaly information
📑 Reports| Security information and summarized results
⚙️ Settings| System and configuration information
👤 User Info| Current user and role information

---

📊 Dashboard

The dashboard provides a centralized security overview.

It includes:

- Total monitored users
- LOW / MEDIUM / HIGH / CRITICAL distribution
- Top behavioral risk users
- Anomaly scores
- Login activity
- File access activity
- Risk tables
- Security charts

The dashboard is also designed around user roles so different security roles can have different operational focus.

---

👥 Employees Page

The Employees section provides employee-level information used by the security system.

It allows authorized users to:

- View employee records
- Search employees
- Review risk levels
- View employee-related information
- Associate assets with employees

Employee and asset information is maintained in PostgreSQL.

---

📡 Telemetry Page

The Telemetry page provides visibility into employee activity data.

It represents events such as:

LOGIN
FILE_ACCESS
DEVICE_ACTIVITY
AFTER_HOURS_ACTIVITY

Telemetry information is stored in MongoDB and forms the input for behavioral analysis.

---

🤖 Analytics Page

The Analytics section focuses on behavioral intelligence.

The analysis pipeline is:

Activity Data
      ↓
Feature Extraction
      ↓
Behavioral Profile
      ↓
Isolation Forest
      ↓
Anomaly Score
      ↓
Threat Score
      ↓
Risk Level

This allows security teams to identify users whose observed behavior differs significantly from expected patterns.

---

📑 Reports Page

The Reports section provides summarized security information that can be used to review:

- High-risk users
- Threat levels
- Behavioral risk information
- Security trends
- Analytical results

---

⚙️ Settings Page

The Settings section provides system-related configuration and account information.

It is designed to support administrative and security configuration as the project evolves.

---

🛠️ Technology Stack

Frontend

Technology| Purpose
React.js| UI development
Vite| Frontend development/build tool
JavaScript| Application logic
CSS| UI styling
React Router| Frontend routing
Recharts| Data visualization

Backend

Technology| Purpose
Python| Backend & ML development
FastAPI| REST API framework
Uvicorn| ASGI server
Pydantic| Data validation
SQLAlchemy| PostgreSQL ORM
JWT| Authentication
bcrypt| Password hashing

Databases

Database| Purpose
PostgreSQL| Users, roles, employees and assets
MongoDB| Activity and telemetry logs

Machine Learning

Technology| Purpose
Pandas| Data processing
NumPy| Numerical operations
Scikit-learn| Machine learning
Isolation Forest| Anomaly detection

Deployment

- Docker
- Docker Compose

---

📁 Project Structure

AI-Insider-Threat-BI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── telemetry.py
│   │   ├── risk.py
│   │   └── ...
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── ...
│   │
│   ├── package.json
│   └── Dockerfile
│
├── data/
│   └── cert_r4_2/
│       ├── device.csv
│       ├── file.csv
│       ├── insiders.csv
│       └── logon.csv
│
├── docker-compose.yml
├── README.md
└── .gitignore

---

🔐 Authentication Flow

User
 ↓
Login Page
 ↓
FastAPI Authentication API
 ↓
Email + Password Verification
 ↓
JWT Token Generation
 ↓
Frontend Authentication State
 ↓
Protected API Request
 ↓
JWT Validation
 ↓
Role-Based Authorization
 ↓
Dashboard / Protected Resource

---

🛡️ Role-Based Access Control

Role| Employees| Telemetry| Analytics| Administration
"ADMINISTRATOR"| ✅| ✅| ✅| ✅
"SECURITY_MANAGER"| ✅| ✅| ✅| Limited
"SOC_ENGINEER"| ❌| ✅| ✅| ❌
"SECURITY_ANALYST"| View| View| ✅| ❌

«Frontend role checks improve the user experience, while backend authorization is responsible for enforcing protected operations.»

---

🗄️ Database Architecture

ITBIS uses two databases for different data requirements.

PostgreSQL

Used for structured relational information:

Users
Roles
Employees
Assets

PostgreSQL provides relationships and structured storage for core application entities.

MongoDB

Used for activity and telemetry information:

Database: itbis_logs
Collection: activity_logs

MongoDB is suitable for flexible behavioral event documents where activity payloads can vary between events.

---

🔌 API Overview

Authentication

POST /api/v1/auth/login

Employees

GET  /api/v1/employees
POST /api/v1/employees

Telemetry

POST /api/v1/telemetry/ingest

Analytics

GET /api/v1/analytics/risk/{employee_id}
GET /api/v1/analytics/alerts

Health

GET /health

---

🚀 Local Development Setup

Prerequisites

Install:

- Python 3.11+
- Node.js
- npm
- PostgreSQL
- MongoDB
- Git

Docker is optional for containerized deployment.

---

1. Clone Repository

git clone <YOUR-GITHUB-REPOSITORY-URL>
cd AI-Insider-Threat-BI

---

2. Backend Setup

cd backend

Create virtual environment:

python -m venv venv

Activate on Windows:

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Run backend:

python -m uvicorn app.main:app --reload --port 8000

Backend:

http://localhost:8000

Swagger documentation:

http://localhost:8000/docs

---

3. Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Start development server:

npm run dev

The Vite development URL will be displayed in the terminal.

---

🐳 Docker

Docker is included for containerized deployment.

Build and start the services:

docker compose up --build

Run in detached mode:

docker compose up -d

Stop services:

docker compose down

---

🔒 Environment Variables

Sensitive configuration should never be committed to GitHub.

Create a local ".env" file for backend configuration.

Example:

DATABASE_URL=postgresql://<username>:<password>@localhost:5432/itbis

MONGO_URL=mongodb://localhost:27017

SECRET_KEY=<your-secret-key>

ACCESS_TOKEN_EXPIRE_MINUTES=60

For frontend configuration:

VITE_API_URL=http://localhost:8000

⚠️ Never commit

.env
database passwords
JWT secrets
API keys
private credentials
venv/
local database files

---

🧪 Testing & Verification

The project includes backend verification and API testing utilities.

Example:

cd backend
python test_db.py

API testing can be performed using:

Swagger UI
Postman
Browser/API clients

The project also supports verification of:

- Database connectivity
- Authentication
- Protected endpoints
- Employee APIs
- Telemetry APIs
- Risk analysis
- Role-based authorization

---

📈 Risk Analysis Example

Example behavioral output:

Employee       Score       Threat Level
----------------------------------------
AJF0370        100.00      CRITICAL
EIS0041         94.18      CRITICAL
BAL0044         93.97      CRITICAL
IBB0359         93.86      CRITICAL
CCA0046         79.04      HIGH
HSB0196         78.69      HIGH

These scores are generated from the project's behavioral analysis pipeline and are intended to help prioritize security investigation.

---

🔄 End-to-End System Flow

Employee Activity
        ↓
Telemetry / Activity Data
        ↓
MongoDB
        ↓
Behavioral Feature Extraction
        ↓
Isolation Forest
        ↓
Anomaly Score
        ↓
Frequency Analysis
        ↓
Asset Criticality
        ↓
Activity Severity
        ↓
Threat Score
        ↓
LOW / MEDIUM / HIGH / CRITICAL
        ↓
Dashboard & Security Monitoring

---

🎯 Why ITBIS?

ITBIS brings multiple security functions into one platform:

Identity Management
        +
Activity Monitoring
        +
Behavioral Analytics
        +
Machine Learning
        +
Risk Scoring
        +
RBAC
        =
Insider Threat Intelligence Platform

The system transforms raw activity data into a security-oriented behavioral risk view that can help analysts focus their attention on potentially abnormal activity.

---

🔮 Future Enhancements

Potential future improvements include:

- Real-time telemetry streaming
- Advanced behavioral baselines
- Explainable AI for risk factors
- Automated security notifications
- Additional enterprise log sources
- Advanced incident investigation workflows
- Improved report generation
- CI/CD automation
- Production cloud deployment
- Advanced model evaluation and tuning

---

📌 Current Project Status

🟢 Active Development

Implemented

- ✅ React-based security dashboard
- ✅ FastAPI backend
- ✅ PostgreSQL integration
- ✅ MongoDB integration
- ✅ JWT authentication
- ✅ Role-Based Access Control
- ✅ Employee management
- ✅ Telemetry/activity processing
- ✅ Behavioral feature extraction
- ✅ Isolation Forest anomaly detection
- ✅ Multi-factor risk scoring
- ✅ Threat-level classification
- ✅ Security analytics
- ✅ Docker configuration

---

👨‍💻 Project Information

Project: ITBIS — Insider Threat Behavioral Intelligence System
Domain: Cybersecurity + Artificial Intelligence
Architecture: Full-Stack Web Application
Backend: FastAPI + Python
Frontend: React.js + Vite
Databases: PostgreSQL + MongoDB
ML: Isolation Forest
Authentication: JWT + bcrypt
Deployment: Docker / Docker Compose

---

⭐ Repository

If you find the project useful, consider giving the repository a ⭐.

Built as a cybersecurity and artificial intelligence project focused on behavioral risk detection and insider threat monitoring.
