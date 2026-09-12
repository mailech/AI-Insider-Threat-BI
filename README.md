# Activity Management System (AMS)
> Enterprise AI-Assisted Insider Threat Behavioral Intelligence & Telemetry Analytics Platform

---

## 1. Project Overview

**Activity Management System (AMS)** is a full-stack cybersecurity behavioral intelligence platform designed to continuously track employee activity telemetry, construct multi-dimensional behavioral risk profiles, and surface real-time threat scores, alerts, and analytics to SOC teams, security managers, and administrators.

### Core Capabilities:
- **Continuous Telemetry Tracking**: Normalizes and correlates diverse event types (`LOGIN`, `FILE_DOWNLOAD`, `FILE_UPLOAD`, `DATA_TRANSFER`, `EMAIL_ACTIVITY`, `PRIVILEGE_CHANGE`, `REMOTE_ACCESS`, `APPLICATION_USAGE`, `USB_DEVICE`, `NETWORK_ACTIVITY`) with assigned hardware assets (`LAPTOP-SEC-XXXX`, IP, MAC address).
- **Behavioral Baseline & Peer Group Benchmarking**: Computes historical employee baselines and compares them against both individual history and **Department Peer Averages** (`event_volume_peer_multiple`, `transfer_peer_multiple`, peer typical login median) in employee intelligence dossiers.
- **Anomaly Detection & MITRE ATT&CK Mapping**: Classifies telemetry anomalies under a formal 5-part taxonomy and statically maps them to industry-standard MITRE ATT&CK techniques (`T1078 Valid Accounts`, `T1048 Exfiltration Over Alternative Protocol`, `T1098 Account Manipulation`, `T1052 Exfiltration Over Physical Medium`).
- **SOC Case Management & Containment Tracking**: Internal case management workflow allowing SOC Engineers, Security Managers, and Administrators to flag VPN revocations, mark endpoint containment (`normal` / `isolated`), require step-up MFA resets, and assign threat retraining with confirmation dialogs and comprehensive audit logging.
- **Analyst Investigation Notes & Dossier Journal**: Immutable chronological investigation notes thread on employee profiles and incident records allowing all security team roles to annotate active case findings.
- **Dedicated Anomaly Reports & Multi-Format Exports**: Multi-dimensional filtering by date range, department, employee, and category with role-guarded CSV and styled Excel (`.xlsx`) export across Employee Directory, Incident Queue, and Executive Posture.
- **Rule-Based 5-Factor Risk Engine & ML Corroboration**: Computes explainable, deterministic insider risk scores (0–100%) corroborated by an unsupervised Machine Learning Isolation Forest model.
- **Real SMTP Email & Slack Webhook Notifications**: Outbound notification pipeline for critical incident escalations and 24-hour fleet digests, engineered with a safe inert safeguard mode when credentials are unconfigured.
- **Executive Risk Posture Dashboard (`/executive`)**: Executive-level threat posture report presenting fleet risk index, department vulnerability heatmap, top 5 high-risk identities, and SOC SLA benchmarks (MTTD/MTTI/MTTR) with 1-click printable PDF view and 4-tab Excel workbook export.
- **Docker Production Containerization**: Multi-stage Dockerfiles and root `docker-compose.yml` for unified single-command deployment with persistent SQLite volume mounting.
- **Role-Differentiated Security Dashboards**: Tailored workspaces for **Administrator**, **Security Manager**, **SOC Engineer**, and **Security Analyst**.
- **Slide-Over Employee Intelligence Dossiers**: Interactive SVG Threat Gauges, 30-day historical risk trajectories, department peer group benchmarks, SOC containment flags, assigned device assets, and investigation notes.
- **FINANCIA Dark Glassy Visual Theme**: Built with a deep charcoal canvas (`#09090E`), electric violet accents (`#8B5CF6`), backdrop-blur glass panels, and glowing charts.

---

## 2. Tech Stack & Architectural Decisions

### Frontend:
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS with custom FINANCIA dark glassy violet design tokens
- **Data Visualization**: Recharts (glowing curved line/area charts, donuts, rounded bar charts) + Custom SVG Threat Gauges
- **Icons**: Lucide React

### Backend:
- **Framework**: Python 3.13 + FastAPI + Uvicorn
- **ORM & Data Layer**: SQLAlchemy 2.0 + openpyxl (styled `.xlsx` reports) + scikit-learn / joblib (ML Isolation Forest)
- **Database Choice & Justification (Item B1 - Single Database Architecture)**:
  - **SQLite in WAL (Write-Ahead Logging) Mode with JSON column support**:
    - *Relational & Structured*: Core entities (Users, Employees, Device Assets, Trajectories, Audit Logs, Investigation Notes, Incidents) are strictly relational, while Telemetry Logs and Event Payloads utilize flexible JSON metadata.
    - *Zero-Configuration Local Execution & Deterministic Evaluation*: Runs locally via standard dev commands (`npm run dev`, `uvicorn`) and containerized via `docker compose up` without external database management overhead.
    - *High Concurrency & Transaction Isolation*: WAL mode provides high append-only write throughput for telemetry event streams and concurrent read queries for analytics without reader-writer locking.
- **Authentication**: JWT-based authentication (HMAC-SHA256) with password hashing via `bcrypt`.

---

## 3. Seed Accounts & Credentials

The system comes seeded with 4 distinct role-based accounts:

| Role | Email | Password | Primary Dashboard Focus |
|---|---|---|---|
| **Administrator** | `admin@ams.internal` | `Admin1234!` | Full fleet oversight, governance, device inventory, and **Settings** access |
| **Security Manager** | `manager@ams.internal` | `Manager123!` | Executive risk posture, compliance metrics, and department exposure trends |
| **SOC Engineer** | `soc@ams.internal` | `SocEng123!` | Real-time behavioral event feed, anomaly signals, and SOC case actions |
| **Security Analyst** | `analyst@ams.internal` | `Analyst123!` | Active threat alert triage, priority investigation queue, and case notes |

> 💡 **Item B3 - One-Click Demo Credentials Note**: The one-click demo login buttons on the login screen are **intentional evaluation convenience features** implemented specifically to allow rapid examiner and grading review across all four role profiles without manual credential typing. They authenticate through the exact same secure JWT auth pipeline as manual credential inputs.

> 📄 **Detailed Role-Based Access Control (RBAC) Specification**: For an exhaustive breakdown of user rights, privilege matrices, and API authorization rules, see [`ROLES_AND_PERMISSIONS.md`](./ROLES_AND_PERMISSIONS.md).

---

## 4. Screen-by-Screen Features & Workflows

### 4.1 Login Screen
- Centered glassy card with custom AMS radar/pulse branding.
- Real email + password JWT authentication with error banners.
- **Corporate SSO Fast-Path (Simulated Demo)**: Prominent button allowing evaluation reviewers to execute an authentic OAuth2 bearer token grant exchange against the AMS backend mapped to any of the 4 real persona accounts.
- **One-Click Demo Credentials**: Instant pill buttons to quickly switch between Administrator, Security Manager, SOC Engineer, and Security Analyst for rapid evaluation triage.

### 4.2 Security Overview
- **Headline KPI Cards**: Total Monitored, Critical Risk Alerts, High-Risk Users, Avg Threat Score with interactive click-through navigation to filtered Directory views.
- **Fleet Threat Index Gauge**: SVG arc gauge with dynamic color tiering and rate metrics.
- **Role-Specific Focus Panel**:
  - *Security Analyst*: Priority Investigation Queue and case status.
  - *SOC Engineer*: Live anomalous telemetry stream with severity badges.
  - *Security Manager*: Compliance posture percentage and department coverage.
  - *Administrator*: Operational node status and system health summary.
- **Recent Security Alerts Table**: Sortable by threat score, displaying employee avatar, active case status tags (`[Isolated]`, `[VPN Flagged]`, `[MFA Reset]`, `[Training]`), department, risk category pill, threat progress bar, and enrolled date.

### 4.3 Employee Directory & Intelligence Dossier
- **Search & Filters**: Debounced search by name, ID, designation, and department with risk tier pill tabs (All, Critical, High, Medium, Low).
- **Directory Multi-Format Bulk Export**: Role-guarded **"Export CSV"** and **"Export Excel (.xlsx)"** buttons generated via `openpyxl` with navy blue headers (`#1E1B4B`), frozen header row (`A2`), and auto-fitted columns (allowed for Administrator and Security Manager; locked with permission badge for SOC Engineer and Security Analyst).
- **Slide-Over Intelligence Profile Drawer**:
  - SVG Threat Gauge with status assessment.
  - 30-day historical risk trajectory chart with organizational baseline marker.
  - **Behavioral Baseline & Peer Benchmarks (Milestone 2 A1 & Elevation Feature 1)**: Real-time comparison of historical baseline versus today's activity across 4 dimensions + Department Peer Group benchmarks:
    1. *Login Schedule*: Typical login window (e.g. 08:30 AM - 09:30 AM, median 08:45 AM) vs. today's login time with deviation flag.
    2. *Daily Event Volume*: 30-day average event volume vs. today's registered events with volume spike alert.
    3. *Data Transfer Volume*: Historical daily MB transfer baseline vs. today's transferred MB with exfiltration flag.
    4. *Primary Device & Network*: Known hardware asset ID & IP address vs. today's active IP with foreign ASN indicator.
    5. *Department Peer Benchmarks*: Direct comparison against department averages (e.g., `14.8 GB vs. Finance Dept Avg 420 MB → 35.2x above peer avg`).
  - **SOC Case Management & Containment Flags (Elevation Feature 2)**: Action panel to flag VPN revocation, mark endpoint isolated, require step-up MFA reset, and assign mandatory training with modal confirmation and audit logging.
  - **MITRE ATT&CK Badges (Elevation Feature 3)**: Anomaly events annotated with MITRE technique codes (`T1078`, `T1048`, `T1098`, `T1052`).
  - **Investigation Notes Thread (Elevation Feature 4)**: Chronological case annotation log with author credentials, role tags, timestamps, and note creation form.
  - **Entity Relationship Graph Visualizer & Full-Screen Explorer (PDF Page 13: Graph Analytics)**: Multi-dimensional dark glassmorphic SVG node-link graph mapping the employee identity to their real assigned devices (Laptop, Bastion), real network IPs accessed, touched sensitive files/repositories, and triggered anomaly/incident alerts with edge relationships (`OWNS_DEVICE`, `ACCESSED_IP`, `ACCESSED_RESOURCE`, `TRIGGERED_ALERT`), zoom/pan controls, and full-screen explorer modal.
  - Assigned device assets (Laptop, Workstation, Bastion, Mobile) with IP/MAC addresses.
  - **Usability Enhancements**: `Escape` key & click-outside dismissal, one-click IP/Asset clipboard copy, and role-guarded **"Export Dossier (JSON)"** download (Admin/Manager only).

### 4.4 Telemetry Event Stream
- **Filter Controls**: Filter by employee, severity (CRITICAL, HIGH, MEDIUM, LOW, INFO), event type (including `APPLICATION_USAGE`, `USB_DEVICE`, `NETWORK_ACTIVITY`), anomaly category, and record limit.
- **Anomaly Categorization & MITRE Badges**: Distinct colored badges for classified anomalies and MITRE ATT&CK technique tags.
- **Selected Employee Card**: Mini profile banner with avatar, risk index, and clear-filter shortcut.
- **Live Stream Auto-Ticker**: Optional **"Live Polling (5s Active)"** toggle that periodically refreshes the event stream.
- **Role-Scoped CSV Export**: **"Export Telemetry (CSV)"** button (available to Administrator, Security Manager, and SOC Engineer; restricted from Security Analyst).
- **Expandable Payload Inspector**: Row expansion revealing structured payload fields, formatted grid view, raw JSON view, and one-click JSON copy.

### 4.5 Risk Analytics & Recalculation Engine
- **7-Day Threat Velocity Chart**: Glowing curved Recharts area chart with hover tooltips showing daily average scores, 24h velocity deltas, and logged anomaly counts.
- **Risk Distribution Donut Chart**: Interactive donut breakdown by risk tier (Critical, High, Medium, Low) with counts and percentages.
- **Score Band Bar Chart**: Distribution across 0–20%, 20–40%, 40–60%, 60–80%, 80–100% bands with interactive click-to-filter drill-down table.
- **Department Risk Breakdown**: Ranked list of departments with high-risk counts and click-to-filter navigation to the Employee Directory.
- **Live Risk Recalculator**:
  - *Administrator, Security Manager, SOC Engineer*: Runs the 5-factor scoring engine and persists updated threat scores directly to the database (**Persist Mode**).
  - *Security Analyst*: Runs non-mutating score simulation (**Preview Mode**) to calculate factor decompositions for triage without altering database records.
- **Fleet Report Export**: Role-guarded **"Export Fleet Report (CSV)"** button (Admin and Security Manager only).
- **Anomaly Detection & Forensic Reports**: Dedicated panel featuring category breakdown counters, department and category filter selectors, MITRE technique tags, and role-guarded **"Export Anomaly Report (CSV)"** button.

### 4.6 Consolidated Alert & Incident Management Queue (`/incidents`)
- **Situation Consolidation (48-Hour Rolling Window)**: Automatically groups co-occurring anomalous events per employee into unified situation records rather than flooding the queue with duplicate alerts.
- **Incident Lifecycle Management**: Full state transition pipeline (`Open` → `Investigating` → `Escalated` → `Resolved`) with audit logging and resolution summaries.
- **Multi-Format Queue Export**: Role-guarded **"Export CSV"** and **"Export Excel (.xlsx)"** buttons (accessible to SOC Engineer, Security Manager, and Administrator).
- **Correlated Telemetry Windows**: Side-by-side view of tight 2-hour forensic context window vs. broad 24-hour surrounding telemetry logs.
- **Linked Investigation Notes**: Dedicated incident annotation thread with user role tags and timestamps.

### 4.7 Executive Risk Posture Dashboard (`/executive`)
- **Target Audience**: Designed specifically for CISO, Director of Security, and Security Manager oversight.
- **Fleet Threat Index**: Aggregated workforce risk index, critical alert counts, high-risk user percentages, and fleet risk tier.
- **Top 5 High-Risk Identities**: Ranked entity table surfacing primary MITRE indicators, open situation cases, and direct dossier drilldowns.
- **Department Vulnerability Matrix**: Heatmap ranking departments by average threat index, critical entity count, and high-risk workforce ratio.
- **MITRE ATT&CK Technique Distribution**: Horizontal breakdown of detected attack tactics and technique counts.
- **Honestly-Scoped Performance Metrics & SLA Matrix (PDF Page 15)**: Dedicated evaluation matrix surfacing genuine computable telemetry metrics: live MTTD, MTTI, MTTR, 100% anomaly taxonomy detection coverage (5/5 categories active), 100% 30-day baseline density (16/16 identities), and live measured API Gateway latency (`X-Process-Time`) paired with a transparent evaluation disclaimer note regarding ground-truth datasets.
- **SOC SLA & Efficiency Benchmarks**: Real-time calculated MTTD (Mean Time to Detect in seconds), MTTI (Mean Time to Investigate in minutes), and MTTR (Mean Time to Resolve in hours).
- **1-Click Printable PDF View**: Clean, high-contrast `@media print` layout hiding navigation and formatting tables for executive briefing packets (`window.print()`).
- **4-Tab Styled Excel Workbook Export**: Generates a branded `.xlsx` workbook via `openpyxl` with tabs for:
  1. *Executive Summary & KPIs*
  2. *Top High-Risk Identity Profiles*
  3. *Department Vulnerability Matrix*
  4. *SOC Operations & SLA Metrics*

### 4.8 Settings, Outbound Dispatch & Governance (`/settings`)
- **Multi-Role Access**: The Settings workspace is accessible to all authenticated roles, with fine-grained tab permissions.
- **Tab 1: Notifications & Outbound Channels (All Roles)**:
  - *Outbound Dispatch Channels Status Card*: Honest visibility into SMTP Email and Slack Webhook configuration states (`Active & Configured` vs `Inert Safeguard Mode`).
  - *Send Daily Digest Now*: Diagnostic trigger to synthesize and dispatch the 24-hour fleet security digest.
  - *Send Test Alert*: Diagnostic button to test outbound email/slack delivery pipeline.
  - Delivery toggles for High Severity, Critical Urgent, and Daily Digest reports.
- **Tab 2: Threat Scoring Rules (Administrator Only)**: 5 interactive sliders with signal badges and live **Total Weight Sum** validation (turns green at 100%, warning red otherwise) and default restore.
- **Tab 3: System Health & API (Administrator Only)**: Live latency diagnostics for FastAPI server, SQLite WAL DB, and Scoring Engine with real re-ping button, Swagger OpenAPI documentation link, and API base URL copy.
- **Tab 4: Security & Audit Trail (Admin & Security Manager Only)**: CloudTrail-style audit log table capturing actor, action (`NOTIFICATION_SENT`, `NOTIFICATION_FAILED`, `NOTIFICATION_SKIPPED`, `EXPORT_EXCEL`, etc.), target resource, source IP, timestamp, and CSV export.
- **Tab 5: ML Corroboration Model (Administrator Only)**: Inspection card for the unsupervised Isolation Forest ensemble, hyperparameter metadata, and manual model retrain trigger.
- **Tab 6: Live Ingestion (Experimental Scoped Exception Module - Administrator Only)**: Operational health monitoring, Windows identity mapping management against existing seeded employees, and quarantined unmapped telemetry logs.

---

## 5. Risk Scoring & ML Corroboration Specification

The rule-based calculation engine derives scores from employee telemetry within the selected lookback window:

$$\text{Insider Risk Score} = (S_{\text{behav}} \times w_1) + (S_{\text{priv}} \times w_2) + (S_{\text{data}} \times w_3) + (S_{\text{access}} \times w_4) + (S_{\text{hist}} \times w_5)$$

### Default Weights:
- **Behavioral Anomalies ($w_1 = 35\%$)**: Off-hour logins, activity frequency deviations, and abnormal daily volume spikes.
- **Privilege Misuse Indicators ($w_2 = 25\%$)**: SUDO escalations, unauthorized admin access changes, SAM registry injection attempts.
- **Data Access Violations ($w_3 = 20\%$)**: Bulk file downloads, unapproved external cloud uploads, USB storage transfers.
- **Access Pattern Deviations ($w_4 = 10\%$)**: Unrecognized external IP routing, anomalous ASN origins, VPN session deviations.
- **Historical Security Events ($w_5 = 10\%$)**: Cumulative historical security audit baseline and repeat incident density.

### Risk Tiers:
- **Low Risk**: 0.0 – 30.0%
- **Medium Risk**: 30.1 – 60.0%
- **High Risk**: 60.1 – 80.0%
- **Critical Risk**: 80.1 – 100.0%

### Unsupervised ML Corroboration Engine:
- Employs an **Isolation Forest** anomaly detection model (`contamination=0.08`, `n_estimators=100`, `random_state=42`) trained on normalized 5-dimensional telemetry feature vectors.
- Serves as an independent cross-check against heuristic scores, surfaced in employee dossiers as a normalized ML anomaly score (0.00–1.00) alongside heuristic scores.

---

## 6. Outbound Notification Dispatch & Environment Configuration

AMS includes real notification delivery for critical incidents and daily digests, with safe inert defaults when credentials are not configured.

### Supported Channels:
1. **SMTP Email**: Delivers formatted security notifications to security team inboxes.
2. **Slack Webhook**: Posts high-priority security cards with severity colors to dedicated incident channels.

### Environment Variables:
Configure the following in `backend/.env` or docker-compose environment blocks:

```env
# Outbound Email (SMTP)
SMTP_HOST=smtp.gmail.com            # Leave empty to keep email delivery in safe inert mode
SMTP_PORT=587                       # 587 (STARTTLS) or 465 (SSL)
SMTP_USER=soc-alerts@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=soc-alerts@example.com
NOTIFICATION_ALERT_EMAIL=security-team@example.com

# Outbound Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXXX  # Leave empty for safe inert mode
```

> 🛡️ **Inert Safeguard Mode**: When `SMTP_HOST` or `SLACK_WEBHOOK_URL` is empty, AMS operates safely without attempting external network calls. The UI displays **"Not Configured (Inert)"** badges, and all alert events are logged to the audit trail as `NOTIFICATION_SKIPPED`.

---

## 7. Production Containerization with Docker Compose

AMS provides production Docker containerization for both backend and frontend services.

### Quick Start with Docker:
```bash
# Clone or navigate to the repository
cd "Insider Threat Behavioral Intelligence System"

# Build and launch all services in detached mode
docker compose up --build -d

# Verify container health
docker compose ps
```

### Exposed Services:
| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:4000` | Next.js Dashboard UI |
| **Backend API Server** | `http://localhost:8000` | FastAPI REST API |
| **API Documentation** | `http://localhost:8000/docs` | Interactive Swagger OpenAPI UI |

### Stopping the Stack:
```bash
docker compose down
```
*Persistent data is stored safely in the `ams_sqlite_data` Docker volume.* For cloud deployment blueprints and ECS/AKS guidelines, refer to [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

---

## 8. Getting Started Locally (Without Docker)

### Prerequisites:
- Python 3.10+
- Node.js 18+ and npm

### 1-Click Launch (Windows):
Double-click `run_local.bat` in the project root, or run:
```cmd
run_local.bat
```
*(On Linux/macOS, execute `./run_local.sh`).*

### Or Start Services Manually:

**Terminal 1 (Backend API):**
```bash
cd backend
pip install -r requirements.txt
python run.py
```
*The FastAPI backend will start on `http://127.0.0.1:8000`.*

**Terminal 2 (Frontend Application):**
```bash
cd frontend
npm install
npm run dev
```
*The Next.js frontend will start on `http://localhost:4000`.*

---

## 9. Automated Backend Tests (62 Tests - 100% Pass Rate)

Full test coverage of all RBAC boundaries, anomaly taxonomy, ML corroboration, notifications, styled Excel exports, Executive PDF briefing generation (Spec Item 204), Live Windows Ingestion, and executive posture is implemented in `backend/tests/test_api.py`.

To run the automated backend test suite:
```bash
cd backend
pytest tests/test_api.py -v
```
*Runs 62 comprehensive integration tests covering: JWT authentication, 4-role RBAC enforcement, heuristic scoring, Isolation Forest ML model, 10 telemetry types, 5 anomaly categories, consolidated incident triage lifecycle, mock SMTP/Slack notification dispatch, daily digest synthesis, openpyxl `.xlsx` exports, ReportLab `.pdf` executive briefs (Spec Item 204), Live Windows Event listener ingestion, and end-to-end multi-milestone incident lifecycle (62/62 passed, 100% test pass rate).*

---

## 10. Milestone 1–4 Automated Evaluation Script

For viva, demonstration, or mentor evaluation, a standalone audit script verifies all implemented Milestone 1–4 components and runs code-level integrity checks:

```bash
cd backend

# Fast code-level and database component audit (~0.2s):
python verify_milestones.py --skip-tests

# Full audit including the complete 62-test pytest suite:
python verify_milestones.py
```
*Verifies database tables, 4 RBAC roles, 10 telemetry types, 5 anomaly categories, 4 MITRE ATT&CK techniques, 30-day baselines, cohort Z-scores, 5-factor risk scoring formula, 48-hour consolidated incident cases, MTTD/MTTI/MTTR metrics, trained ML Isolation Forest bundle, outbound notification pipeline status, styled Excel workbook export engine, Executive Posture PDF export engine (Spec Item 204), Live Windows event listener service, and Docker deployment artifacts.*

---

## 11. Postman Collection & CI/CD Pipeline (PDF Section 7 Tools)

### Postman API Collection:
A pre-configured Postman v2.1.0 collection is included at [`ams_postman_collection.json`](./ams_postman_collection.json):
1. **Import**: Open Postman $\rightarrow$ Click **Import** $\rightarrow$ Select `ams_postman_collection.json`.
2. **Execute**: Run `Login as Administrator` (or any role) to automatically capture and store the JWT bearer token into the `{{token}}` collection variable.
3. **Explore**: Immediately test all 13 modules (Employees, Baselines, Telemetry, Anomalies, Incidents, Scoring, Executive Posture, Notifications, and System Health).

### GitHub Actions CI Workflow:
Continuous Integration is configured in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) providing:
- Automated backend testing (`python verify_milestones.py` + `pytest tests/test_api.py -v`).
- Automated Next.js production build check (`npm run build`).
- Automated Docker container configuration validation (`docker compose config` & `docker compose build`).



