# Frontend Architecture

## 1. Global UI Features
- Responsive sidebar navigation based on User Role.
- Real-time notification bell for High/Critical Alerts.
- Dark/Light Theme support (common in SOC environments).

## 2. Dashboards (Role-Based)
**Security Analyst Dashboard:**
- Focus: Immediate triage.
- Components: Threat Alerts feed, live investigation queue, recent high-risk employees.

**SOC Dashboard:**
- Focus: Tactical monitoring.
- Components: Real-time security events graph, behavioral anomaly feed, map of active investigations.

**Security Manager Dashboard:**
- Focus: Strategic risk.
- Components: Organizational risk posture (pie charts/gauges), risk trends over 30/90 days, compliance posture metrics.

**Admin Dashboard:**
- Focus: Configuration.
- Components: System health, user role management, data ingestion rates.

## 3. Core Modules / Pages
- `/login`: Secure login page.
- `/dashboard`: Routes dynamically based on role.
- `/employees`: Table view of all monitored identities.
- `/employees/:id`: Deep dive into UEBA, peer comparisons, activity timeline, and risk score breakdown.
- `/alerts`: Dedicated queue management, severity filters.
- `/investigations/:id`: Incident workbench (Activity correlation, threat timeline, user risk history, device analysis, evidence management).
- `/reports`: Report builder and export interface (Insider threat, Behavioral analytics, Investigation, Compliance, Risk assessment) with PDF/Excel support.

## 4. Expected Package Dependencies
- `react-router-dom`: Routing
- `axios`: API calls
- `recharts` / `chart.js`: Analytics
- `lucide-react`: Modern iconography
- `date-fns` / `moment`: Time manipulation for logs
