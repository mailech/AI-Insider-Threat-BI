# AI-Powered Insider Threat Behavioral Intelligence System (SOC 2.0)

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_Vite-61DAFB.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS_Dark_SOC-38B2AC.svg)](https://tailwindcss.com/)
[![PyTorch](https://img.shields.io/badge/Deep%20Learning-PyTorch%20GNN-EE4C2C.svg)](https://pytorch.org/)
[![Tests](https://img.shields.io/badge/Tests-13%20Passed-brightgreen.svg)]()

An enterprise-grade, AI-powered Insider Threat Behavioral Intelligence Platform designed for Security Operations Centers (SOCs), enterprise security teams, and cyber risk officers. The system continuously monitors multi-source telemetry, learns employee behavioral baselines, detects multi-modal anomalies, computes mathematically-weighted insider threat risk scores, and orchestrates incident investigations.

---

## 🎯 Executive Overview & Capabilities

- **Role-Based Access Control (RBAC):** Dedicated dashboards for **Security Analyst**, **SOC Engineer**, **Security Manager**, and **Administrator**.
- **Multi-Source Activity Monitoring:** Ingestion across 9 activity channels: Logins, File Operations, USB Peripherals, Emails (NLP Keyword Flags), Network Outbound Egress, Applications, Remote VPN Sessions, Privilege Changes, and Data Transfers.
- **5-Model AI Anomaly Detection Suite:**
  1. **Isolation Forest:** Tree-depth partitioning for spatial outliers.
  2. **One-Class SVM:** Non-linear RBF kernel decision boundary.
  3. **Neural Autoencoder:** Bottleneck MSE reconstruction loss.
  4. **Graph Centrality:** Degree & Betweenness centrality across bipartite entity graphs.
  5. **PyTorch Graph Neural Network (GNN):** Graph Convolution Network (GCN) autoencoder for node embeddings.
- **Explainable AI (XAI):** SHAP feature attributions and LIME local surrogate weights directly accessible in the UI.
- **Official Weighted Insider Risk Scoring Engine:** Exact PDF mathematical formula:
  $$\text{Insider Risk Score} = 0.35 \times \text{Behavioral} + 0.25 \times \text{Privilege} + 0.20 \times \text{Data Access} + 0.10 \times \text{Access Pattern} + 0.10 \times \text{Historical Events}$$
- **Threat Case & Investigation Workspace:** Correlated chronological activity timelines, forensic evidence vault (PCAP, Memory, Registry hashes), investigator journals, and one-click containment actions (quarantine host, suspend account).
- **Automated Report Generation:** Real-time generation of styled **PDFs** (ReportLab), formatted multi-tab **Excel spreadsheets** (OpenPyXL), and **CSVs**.

---

## 🗺️ Milestone Implementation Mapping

| Milestone | Modules & Features Implemented | Implementation Status |
| :--- | :--- | :---: |
| **Milestone 1: Core Setup & Ingestion** (Weeks 1-2) | JWT Auth, RBAC (4 roles), Employee/Identity Profiles, Asset & Privilege mapping, Multi-source Activity Ingestion | ✅ **Complete** |
| **Milestone 2: Behavioral Intelligence & ML** (Weeks 3-4) | UEBA Profiling, Peer Group Baselines, Isolation Forest, One-Class SVM, Autoencoders, PyTorch GNN, SHAP/LIME XAI | ✅ **Complete** |
| **Milestone 3: Risk Scoring & Threat Management** (Weeks 5-6) | 5-Factor Weighted Risk Scoring, Alert Generation & Triage, Incident Workflows, Case Timelines, Forensic Vault | ✅ **Complete** |
| **Milestone 4: Dashboards, Reports & Deployment** (Weeks 7-8) | Role-Aware Dashboards (4 personas), PDF/Excel/CSV Exporters, Pytest Test Suite, Docker & Docker Compose | ✅ **Complete** |

---

## 👥 Default Operator Credentials (RBAC)

The system comes pre-seeded with 4 default personas. You can log in using any of them, or switch instantly using the top navigation persona selector:

| Role | Email | Password | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Security Analyst** | `analyst@soc.corp` | `analyst123` | Triage alert feed, inspect XAI SHAP/LIME diagnostics, investigate incidents |
| **SOC Engineer** | `soc@soc.corp` | `soc123` | Inspect raw telemetry stream, interactive entity graph, ML model health |
| **Security Manager** | `manager@soc.corp` | `manager123` | Enterprise risk posture, compliance metrics, department threat trends |
| **Administrator** | `admin@soc.corp` | `admin123` | User administration, ML retraining trigger, live Red Team attack simulator |

---

## 🚀 Quickstart & Run Instructions

### Option 1: Standalone Local Run (Zero-Config SQLite / Python)

#### 1. Start the FastAPI Backend
```bash
# From project root:
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Start the React Frontend
```bash
cd frontend
npm run dev
```
- Open your browser at: [http://localhost:5173](http://localhost:5173)

---

### Option 2: Docker Compose (PostgreSQL + FastAPI + Nginx Frontend)

```bash
docker-compose up --build
```
- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API:** [http://localhost:8000](http://localhost:8000)
- **PostgreSQL Database:** `localhost:5432` (`insider_threat_db`)

---

## 🧪 Running Automated Test Suite

Run the full end-to-end integration and unit test suite:
```bash
$env:PYTHONPATH="backend"
python -m pytest tests -v
```
All 13 test suites verify:
- JWT Authentication & RBAC restrictions
- Mathematical validity of the 5-factor weighted risk formula
- Multi-source activity ingestion
- Multi-model anomaly score generation and SHAP/LIME explainability
- Incident investigation lifecycle and forensic note journal
- PDF, Excel (.xlsx), and CSV report binary exports

---

## 📂 Architecture & Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & lifespan startup
│   │   ├── config.py                   # App settings (Postgres / SQLite fallback)
│   │   ├── database.py                 # SQLAlchemy engine & session maker
│   │   ├── models.py                   # Complete relational database models
│   │   ├── schemas.py                  # Pydantic request/response schemas
│   │   ├── auth.py                     # JWT token encode/decode & RBAC dependencies
│   │   ├── seed_data.py                # Database seed for employees, logs, users, ML
│   │   ├── ml_engine/
│   │   │   ├── simulator.py            # Multi-source log generator (9 event types)
│   │   │   ├── feature_engineering.py  # Behavioral feature extraction
│   │   │   ├── models.py               # Isolation Forest, SVM, Autoencoder suite
│   │   │   ├── graph_analytics.py      # NetworkX bipartite graph & centrality
│   │   │   ├── gnn_model.py            # PyTorch Graph Neural Network (GCN Autoencoder)
│   │   │   └── explainability.py       # SHAP feature attributions & LIME weights
│   │   ├── services/
│   │   │   ├── risk_service.py         # Exact 5-factor weighted insider risk formula
│   │   │   ├── ueba_service.py         # UEBA baseline & peer group deviations
│   │   │   ├── ml_service.py           # ML orchestration pipeline
│   │   │   ├── simulation_service.py   # Live interactive Red Team attack injections
│   │   │   └── report_service.py       # PDF, Excel, and CSV binary report builders
│   │   └── routers/                    # Complete REST API endpoints (12 routers)
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.jsx     # JWT Auth state & role switcher
│   │   ├── services/api.js             # Axios client for all backend endpoints
│   │   ├── components/                 # Navbar, Sidebar, StatsCard, EntityGraph, XAI Modal
│   │   └── pages/                      # 12 role-aware SOC pages & dashboards
├── tests/                              # Comprehensive Pytest test cases
├── docker-compose.yml                  # Docker Compose configuration
├── Dockerfile.backend                  # Backend Dockerfile
├── Dockerfile.frontend                 # Frontend Dockerfile
├── requirements.txt                    # Python dependencies
└── README.md
```
