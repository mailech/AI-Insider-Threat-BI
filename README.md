# CYBER-AI

### Enterprise Insider Threat Behavioral Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-18E66A.svg?style=flat-square)](https://github.com)
[![React](https://img.shields.io/badge/React-19-2DFF78.svg?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-18E66A.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-0D261A.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.2-73FFA5.svg?style=flat-square&logo=vite)](https://vitejs.dev)
[![SOC Platform](https://img.shields.io/badge/SOC%20v4.2-Certified-18E66A.svg?style=flat-square)](https://github.com)

**SENTINEL AI** is an enterprise-grade AI behavioral cybersecurity platform and Security Operations Center (SOC) command dashboard designed to continuously analyze employee and machine identity behavior, detect insider anomalies, compute multi-vector risk scores, investigate high-risk activities, and orchestrate real-time defensive containment.

---

## 📸 Platform Highlights

- **🟢 Green/Black SOC Visual Language:** Engineered with deep SOC black canvases (`#020605`), cyber green accents (`#18E66A`, `#2DFF78`), hairline panel borders, and zero-distraction dark mode ergonomics.
- **🧭 Adjustable & Resizable Navigation Rail:** Fluid drag-to-resize sidebar (56px–380px) with category groupings, live indicators, quick filter search, and mobile drawer support.
- **⚡ Real-Time Ingestion Engine:** High-throughput streaming pipeline aggregating 12.8K+ events/min across Identity Providers (Okta/AD), Endpoints (CrowdStrike), Cloud (AWS CloudTrail), and Secret Managers (Vault).
- **🤖 Autonomous AI Risk Engine:** Multi-factor anomaly scoring combining XGBoost behavior deviation, Isolation Forest telemetry clustering, and UEBA baseline deviation.

---

## 🚀 Key Features & Modules

### 1. 📊 Master SOC Command Center
* **Security Posture Gauge:** Circular 87/100 radial health score with day-over-day threat delta tracking.
* **Top KPI Row:** Instant visibility into Active Threats (17), Critical Incidents (03), High Risk Users (08), Anomalies/Hr (12.4K), and Ingestion EPS (12.8K).
* **Behavioral Threat Surface:** Interactive relationship map tracking employee nodes, S3 egress staging buckets, KMS master keys, USB mass storage devices, and lateral domain controllers.
* **7-Day Risk Trend & Distribution:** Historical anomaly trajectory chart with risk severity breakdown and top high-risk identities list.

### 2. 🧠 UEBA & Behavioral Anomaly Detection
* **Identity Baseline Profiling:** Machine-learning baselines comparing user actions against 30-day peer group behavior.
* **Privilege Misuse Detection:** Immediate flagging of anomalous `sudo`, Kerberos TGT Golden Ticket requests, and out-of-band PAM escalations.
* **Exfiltration Telemetry:** Real-time monitoring of unexpected S3 cloud uploads, encrypted archive egress, and unauthorized USB attachments.

### 3. 🗺️ MITRE ATT&CK Matrix & Global Intel
* **Enterprise Tactics Matrix:** Real-time status mapping across Initial Access, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, and Impact.
* **Global Threat Map:** Geolocation vector map visualizing Zurich/Frankfurt VPN egress routes and suspicious ASN connections.
* **Threat Feed & IOCs:** Live threat actor intelligence (DragonForce, APT29) and correlated CVE indicators.

### 4. 🔬 Investigation Workspace & Playbook Automation
* **Timeline Forensics:** Multi-stream chronological telemetry audit trail for individual suspects (e.g., *Authar Morgan - EMP-1042*).
* **Automated Containment Modal:** One-click EDR network isolation, Kerberos session revocation, FIDO2 MFA challenge step-up, and cloud bucket quarantines.
* **Interactive Sentinel Copilot:** Natural language AI assistant and live terminal console streaming real-time behavioral heuristics and model weights.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript |
| **Styling & Theme** | Tailwind CSS v4, Custom CSS SOC Design Tokens |
| **Icons & UI** | Lucide React |
| **Animations** | Motion (Framer Motion), Canvas-Confetti |
| **Data Visualization** | D3.js, SVG-based Radial Gauges & Matrix Charts |
| **Build & Dev Tooling** | Vite 6, Node.js, ESBuild |
| **Backend & Routing** | Express.js, TypeScript Execution (tsx) |

---

## 📂 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── common/              # Reusable SOC UI components
│   │   │   ├── AICodingConsole.tsx        # Terminal console & ML status
│   │   │   ├── AIRiskEnginePanel.tsx      # Risk vector factor breakdown
│   │   │   ├── BehavioralThreatSurface.tsx# Relationship topology graph
│   │   │   ├── ContainmentModal.tsx       # EDR isolation & response modal
│   │   │   ├── GlobalThreatMap.tsx        # World map & VPN route visualizer
│   │   │   ├── LiveActivityPanel.tsx      # High-density streaming telemetry
│   │   │   ├── MitreMatrix.tsx            # MITRE ATT&CK tactical matrix
│   │   │   ├── RiskAlertsPanel.tsx        # Fast-triage SOC alert queue
│   │   │   ├── RiskTrendChart.tsx         # 7-day trend & user ranking
│   │   │   ├── ScoreGauge.tsx             # Radial circular health gauge
│   │   │   ├── ThreatIntelOverview.tsx    # Threat actors & IOC feeds
│   │   │   └── TopKpiRow.tsx              # Executive SOC metrics bar
│   │   ├── copilot/             # Sentinel Copilot interactive AI assistant
│   │   │   └── SentinelCopilot.tsx
│   │   └── layout/              # Fixed & adjustable layout elements
│   │       ├── BottomStatusBar.tsx        # Ingestion & system telemetry footer
│   │       ├── CommandPalette.tsx         # Global Cmd+K quick launcher
│   │       ├── LeftSidebar.tsx            # Resizable/collapsible navigation rail
│   │       ├── SecondaryNav.tsx           # Horizontal sub-navigation bar
│   │       └── TopCommandBar.tsx          # Master SOC header & status bar
│   ├── context/
│   │   └── SecurityContext.tsx  # Centralized SOC state & simulation engine
│   ├── data/
│   │   └── mockData.ts          # Comprehensive enterprise telemetry mock data
│   ├── pages/                   # Primary SOC application views
│   │   ├── CommandCenter.tsx              # Main command center dashboard
│   │   ├── BehavioralThreatMap.tsx        # Threat topology surface
│   │   ├── AIRiskEngine.tsx               # Anomaly scoring models
│   │   ├── LiveTelemetry.tsx              # Raw streaming event terminal
│   │   ├── EmployeeIntelligence.tsx       # Identity dossier & peer baselines
│   │   ├── AnomalyIntelligence.tsx        # Anomaly clustering engine
│   │   ├── InvestigationWorkspace.tsx     # Incident case management & forensics
│   │   ├── AlertCenter.tsx                # Real-time alert triage queue
│   │   ├── IncidentManagement.tsx         # Active containment cases
│   │   ├── UEBAAnalytics.tsx              # User & Entity Behavior Analytics
│   │   ├── RiskAnalytics.tsx              # Long-term risk forecasting
│   │   ├── ReportingCenter.tsx            # Compliance & executive dossiers
│   │   ├── DataSources.tsx                # Connector health & ingestion status
│   │   ├── AIModelsPipeline.tsx           # ML inference pipeline manager
│   │   ├── SecurityMetrics.tsx            # MTTD, MTTR & SLA scorecards
│   │   └── Administration.tsx             # RBAC & access control policies
│   ├── types.ts                 # TypeScript interfaces & types
│   ├── index.css                # Custom cyber grid, scrollbar & theme variables
│   ├── App.tsx                  # Root layout orchestration
│   └── main.tsx                 # Application entry point
├── metadata.json
├── package.json
└── vite.config.ts
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sentinel-ai.git
   cd sentinel-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   ```bash
   cp .env.example .env
   ```

4. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open SOC Command Palette & Quick Launcher |
| <kbd>Esc</kbd> | Close Modals & Command Palette |
| **Double Click** (Sidebar Edge) | Quick toggle between Compact Icon Rail and Expanded Menu |
| **Drag** (Sidebar Edge) | Smoothly resize navigation bar width (56px – 380px) |

---

## 🔒 Security & Compliance Standards

SENTINEL AI is architected in accordance with enterprise security frameworks:
* **Zero Trust Architecture (NIST SP 800-207)**: Continuous identity verification and least-privilege telemetry enforcement.
* **MITRE ATT&CK for Enterprise**: Standardized tactics and technique mapping for insider threat vectors.
* **SOC2 Type II & GDPR**: Privacy-preserving tokenization of personal employee identifiable information (PII).

---

## 📄 License

Distributed under the **Apache-2.0 License**. See `LICENSE` for more information.

---

<p align="center">
  <b>SENTINEL AI</b> • Enterprise Insider Threat Behavioral Intelligence Platform
</p>
