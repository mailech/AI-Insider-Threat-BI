# AI Insider Threat Behavioral Intelligence System (AEGIS)

An AI-powered Insider Threat Behavioral Intelligence Platform that continuously monitors employee activities, analyzes behavioral patterns, detects anomalies using Machine Learning (Isolation Forest & statistical rules), calculates weighted insider risk scores, and provides multi-role SOC & executive security dashboards.

---

## 🌟 Key Features & Architecture

1. **AI Insider Risk Scoring Engine**:
   - **Weighted Formula**:
     $$\text{Insider Risk Score} = 0.35 \times \text{Behavioral} + 0.25 \times \text{Privilege} + 0.20 \times \text{Data} + 0.10 \times \text{Access} + 0.10 \times \text{Historical}$$
   - Categorizes risk into **Low (0-30)**, **Medium (31-60)**, **High (61-85)**, and **Critical (86-100)**.

2. **Machine Learning Anomaly Engine**:
   - Isolation Forest & threshold heuristics for detecting unusual login times, abnormal data volume downloads, unauthorized access attempts, and unregistered USB peripheral insertions.

3. **User & Entity Behavior Analytics (UEBA)**:
   - Peer group comparative benchmarking, user baseline deviation modeling, and predictive threat risk assessment.

4. **Multi-Role Dashboards & Governance**:
   - **Security Analyst**: Real-time threat alert queue, risk score breakdown bars, timeline analysis, and status workflows.
   - **SOC Engineer**: Real-time event stream ticker, DEFCON threat status indicator, and department anomaly density heatmap.
   - **Security Manager**: Organizational risk posture gauge, 7-day risk trend chart, department risk ranking, and compliance scorecard (ISO 27001, SOC 2, NIST SP 800-53).
   - **Administrator**: Role-based access control matrix (RBAC), system health metrics, risk model weights configuration, and audit logs.

5. **Activity Monitoring Pipeline**:
   - Ingestion across Login, File Access, File Download, Data Transfer, USB Devices, Remote Access, and Privilege Changes.

6. **Reports & Export System**:
   - Automated PDF and CSV intelligence report generation.

---

## 🛠️ Quick Start

### 1. Launch Python API Backend Server
```bash
python backend/server.py
```
*(Runs on `http://localhost:8000`)*

### 2. Launch React Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173` or `http://localhost:5174`)*

---

## 📂 Project Structure
```
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── server.py            # Standard library API server
│   ├── config.py            # Risk weights & JWT settings
│   ├── models/schemas.py    # Pydantic & Data schemas
│   ├── engines/             # Risk, Anomaly, & UEBA ML engines
│   └── routers/             # Auth, Alerts, Activities, Reports
├── frontend/
│   ├── src/
│   │   ├── components/      # UI Layout & Dashboard components
│   │   ├── pages/           # Analyst, SOC, Manager, Admin dashboards
│   │   ├── services/api.js  # Unified API client with fallback
│   │   └── styles/          # Dark mode SOC theme
└── README.md
```
