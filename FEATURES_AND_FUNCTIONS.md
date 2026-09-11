# AI-Insider Threat Behavioral Intelligence System - Features & Functions Report

## Executive Summary

The **AI-Insider Threat Behavioral Intelligence (ITBIS)** System is a comprehensive enterprise security platform designed to detect and investigate insider threats through continuous employee activity monitoring, behavioral profiling, anomaly detection, and risk scoring. The system integrates advanced machine learning algorithms with human-driven investigation workflows to identify potential security risks before they escalate.

**Technology Stack:** Python 3.12 (60.2%) | React 18 (37.5%) | CSS (1.5%) | Other (0.8%)

---

## Architecture Overview

```
Log Sources → Ingestion Pipeline → Behavioral Profiling → Anomaly Detection 
    ↓               ↓                      ↓                    ↓
(AD, VPN, DLP)  (Processing)         (Baselines,           (Rules +
(Endpoint)      (Normalization)      Peer Groups)          ML + Stats)
    ↓
Risk Scoring → Alerts & Incidents → Investigation & Response
    ↓              ↓                        ↓
(Weighted     (Management)          (Workflows)
Model)
```

---

# BACKEND FEATURES & FUNCTIONS

## 1. Authentication & Authorization Module
**Location:** `backend/app/api/v1/auth.py`, `backend/app/api/deps.py`

### Core Functions:
- **User Authentication**
  - Email/password login with bcrypt hashing
  - JWT-based token generation (access + refresh tokens)
  - 60-minute token expiration with refresh mechanism
  - OAuth2 integration (Google authentication)
  
- **Role-Based Access Control (RBAC)**
  - Four role hierarchy: Administrator, Security Manager, Security Analyst, SOC Engineer
  - Server-side permission enforcement on all endpoints
  - Role-specific dashboard and feature visibility
  - Immutable audit logging of all state-changing actions

- **Session Management**
  - Token validation and revocation
  - Concurrent session handling
  - Secure credential storage

---

## 2. Employee Identity & Profile Management
**Location:** `backend/app/api/v1/employees.py`, `backend/app/models/employee.py`

### Core Functions:
- **Employee Profile Management**
  - Complete employee directory with department assignment
  - Job role and access level tracking
  - Manager assignment and reporting hierarchy
  - HR status monitoring (active, terminated, on-leave)
  - Risk flag annotations for prior incidents
  - Custom metadata storage

- **Peer Group Classification**
  - Automatic grouping by department and function
  - Behavioral baseline comparison within peer groups
  - Contextual anomaly detection based on role

- **Identity Resolution**
  - Cross-system identity correlation (AD, VPN, email)
  - Unique employee identifier generation
  - Legacy employee data import/migration

---

## 3. Activity Monitoring & Ingestion Engine
**Location:** `backend/app/services/ingestion.py`, `backend/app/api/v1/activity.py`, `backend/app/models/activity.py`

### Core Functions:
- **Multi-Source Log Ingestion**
  - Accepts events from: Active Directory, VPN access logs, DLP systems, endpoint security, email gateways, proxy/firewall logs
  - Real-time streaming ingestion with batch processing
  - Supports multiple log formats and normalization rules
  - Deduplication and data quality validation

- **Activity Categorization**
  - Network access attempts (failed/successful)
  - File operations (create, modify, delete, transfer, download, upload)
  - Data access patterns (exfiltration indicators)
  - Privilege escalation attempts
  - Device usage and removable media access
  - Abnormal login times and locations
  - Bulk data transfers

- **Log Archive**
  - MongoDB storage for raw event history
  - Redis caching layer for frequently accessed events
  - 90+ day retention policy with configurable archival

---

## 4. Behavioral Profiling Engine
**Location:** `backend/app/ml/baseline.py`, `backend/app/ml/features.py`

### Core Functions:
- **Baseline Establishment**
  - Per-employee daily behavioral profiles
  - 24-dimension feature vector creation:
    - Login time patterns (hour of day)
    - Data download volume (GB/day)
    - File transfer count and size
    - Access frequency by resource type
    - Privilege usage patterns
    - Working hours deviation
    - Weekend access frequency
    - Device usage anomalies
    - Failed authentication attempts
    - Geographical access patterns (when available)
    - And 14+ additional statistical features

- **Statistical Profiling**
  - Mean and standard deviation calculation per feature per employee
  - 7-day baseline hold-back (prevents attack behavior from becoming normalized)
  - Peer group baseline for context
  - Feature normalization (0-100 scale)

- **Adaptive Learning**
  - Baseline updates every 24 hours
  - 14-day half-life decay for anomaly evidence
  - Seasonal adjustment for periodic work patterns
  - Automatic outlier detection in baseline training data

---

## 5. Anomaly Detection Engine
**Location:** `backend/app/ml/anomaly.py`, `backend/app/models/anomaly.py`

### Detection Layers:

**Layer 1 - Rule-Based Detection (8 Categories)**
- Unusual login times (outside employee's normal window)
- Abnormal data downloads (exceeds baseline + 2σ)
- Unauthorized access attempts (directory/permission denied)
- Excessive file transfers (volume or frequency spike)
- Suspicious device usage (new devices, removable media)
- Data exfiltration indicators (sensitive file access patterns)
- Privilege abuse (unauthorized elevation, denied privilege access)
- Access pattern deviations (departmental comparison)

**Layer 2 - Statistical Detection (Z-Score)**
- Gaussian distribution comparison against employee baseline
- Requires both high sigma AND materially larger absolute value
- Filters day-to-day variance while catching genuine outliers
- Normalized against peer groups

**Layer 3 - Unsupervised ML (Isolation Forest)**
- Per-user isolation forest model over 24-dimension feature vector
- Detects multivariate outliers across correlated features
- Catches complex patterns not visible in single rules
- Model retraining every 24 hours

**Layer 4 - Peer Group Comparison**
- Departmental peer deviation scoring
- Capped scoring to avoid false positives
- Contextual behavior assessment

### Findings Output:
- Explainable detection reasoning for each alert
- Raw feature values and thresholds
- Contributing evidence ranked by impact

---

## 6. Insider Risk Scoring Engine
**Location:** `backend/app/ml/risk.py`, `backend/app/models/risk.py`

### Scoring Model:
Weighted model normalizing all components to 0-100 before application:

| Component | Weight | Evidence |
|-----------|--------|----------|
| Behavioral Anomalies | 35% | Deviation findings, unusual login times, peer outliers |
| Privilege Misuse Indicators | 25% | Privilege changes, denied access, account posture, HR status |
| Data Access Violations | 20% | Exfiltration, bulk download, transfers, removable media |
| Access Pattern Deviations | 10% | Working-window departures, weekend access |
| Historical Security Events | 10% | Prior incidents (90-day half-life decay) |

### Features:
- Full explainability: returns raw components, applied weights, contributing evidence
- Evidence decay with 14-day half-life (recent behavior dominates)
- Component saturation prevents unbounded growth
- Real-time score updates as new activities ingested
- Trending analysis (score trajectory)
- Risk level categorization: Critical (80-100), High (60-79), Medium (40-59), Low (0-39)

---

## 7. Threat Investigation & Case Management
**Location:** `backend/app/services/investigations.py`, `backend/app/models/incident.py`

### Core Functions:
- **Investigation Lifecycle**
  - Case creation from alerts
  - Timeline view of all related activities
  - Evidence linking and annotation
  - Status tracking (Open, In Progress, Under Review, Resolved, Escalated)
  - Severity and priority assignment

- **Context Enrichment**
  - Pull employee profile, HR status, reporting chain
  - Activity timeline with full details
  - Related alerts clustering
  - Risk score evolution over time
  - Peer group comparison metrics

- **Investigation Tools**
  - Full-text search across activities
  - Filter by activity type, date range, severity
  - Pivot analysis (find similar patterns)
  - Export capabilities for external tools
  - Evidence tagging and cross-case linking

- **Compliance & Documentation**
  - Immutable case audit trail
  - Case notes and findings documentation
  - Export investigation report
  - Chain of custody for evidence

---

## 8. UEBA (User and Entity Behavior Analytics) Intelligence
**Location:** `backend/app/ml/ueba.py`

### Advanced Analytics:
- **Behavioral Fingerprinting**
  - Unique employee behavior signature
  - Working hours analysis
  - Regular access patterns
  - Peer network mapping
  - Historical trend analysis

- **Threat Scoring Enhancement**
  - Integration with risk model
  - Weighting of behavioral deviations
  - Context-aware anomaly severity

- **Predictive Indicators**
  - Cascade detection (one anomaly triggering related behaviors)
  - Temporal pattern analysis
  - Seasonal and cyclical behavior modeling

---

## 9. Alerts & Incident Management
**Location:** `backend/app/services/alerts.py`, `backend/app/models/alert.py`

### Core Functions:
- **Alert Generation**
  - Automatic creation from anomaly findings
  - Repeat detection roll-up (one open alert per employee per category)
  - Occurrence count tracking
  - Alert deduplication to prevent SOC flooding

- **Alert Lifecycle**
  - Status: Open, Acknowledged, Investigating, Resolved, Dismissed
  - Assignment to analysts
  - Comment/note addition
  - Evidence tagging
  - Escalation routing

- **Alert Tuning**
  - Whitelist management for known good behaviors
  - Threshold adjustments
  - Rule enable/disable
  - False positive feedback loop

- **Alert Routing**
  - RBAC-based visibility
  - Escalation rules (high-risk to management)
  - Integration with incident management

---

## 10. Dashboards & Analytics
**Location:** `backend/app/services/dashboards.py`

### Dashboard Components:

**Executive Dashboard**
- Key metrics: Total employees, active alerts, high-risk users
- Risk distribution charts
- Alert trends over time
- Incident resolution metrics
- Compliance status

**Analyst Dashboard**
- Open alerts grid with filtering/sorting
- Alert timeline and queue
- Employee search and profile quick-view
- Recent investigations
- Custom alert filters

**Risk Dashboard**
- Risk score distribution by employee
- Risk trending for individuals
- High-risk employee tracking
- Department-level risk aggregation
- Historical risk snapshots

**Incident Dashboard**
- Incident status breakdown
- Investigation metrics (duration, resolution)
- Most common incident types
- Incident aging analysis
- Escalation tracking

**Analytics Dashboard**
- Activity heatmaps
- Behavioral deviation trends
- Detection effectiveness metrics
- False positive rates
- Coverage analysis

### Visualization Features:
- Real-time metric updates
- Customizable time windows
- Export to PDF/Excel
- Scheduled report generation
- Drill-down capability to details

---

## 11. Notification & Escalation System
**Location:** `backend/app/services/notifications.py`, `backend/app/models/notification.py`

### Core Functions:
- **Real-Time Notifications**
  - WebSocket-based instant alerts
  - Browser push notifications
  - Email notifications for high-priority alerts
  - Slack/Teams integration (configurable)

- **Notification Rules**
  - Role-based notification filtering
  - Severity thresholds
  - Quiet hours configuration
  - Notification frequency limiting (no alert spam)

- **Escalation Management**
  - Automatic escalation for critical risks
  - Manager notification for direct reports at risk
  - Executive summary for high-level incidents
  - SLA-based escalation tracking

- **Notification Preferences**
  - User-configurable channels
  - Subscription management
  - Alert type preferences

---

## 12. Reports & Export Engine
**Location:** `backend/app/services/reports.py`

### Report Types:

**Automated Reports**
- Daily risk summary (critical/high-risk employees)
- Weekly alert analysis
- Monthly incident review
- Quarterly risk trending
- Annual compliance report

**Custom Reports**
- Date range selection
- Employee/department filtering
- Metric selection
- Visualization preferences
- Scheduled delivery

**Export Formats**
- **PDF Reports**: ReportLab-based rendering
  - Executive summary
  - Risk scoring methodology
  - Detailed findings with charts
  - Appendix with raw data
  
- **Excel Workbooks**: openpyxl-based export
  - Employee risk summary sheet
  - Incident details
  - Alert history
  - Custom pivot tables

**Report Content**
- Risk scores and trends
- Alert summary statistics
- Incident lifecycle data
- Evidence and findings
- Compliance documentation
- Recommendations

---

## 13. Data Models & Schema

### Core Database Models:

**User Model** (`backend/app/models/user.py`)
- Email, full name, hashed password
- Role assignment
- Verification status
- Creation/update timestamps

**Employee Model** (`backend/app/models/employee.py`)
- Department, job title, manager
- HR status (active/terminated/leave)
- Risk flags, custom metadata
- Identity mappings

**Activity Model** (`backend/app/models/activity.py`)
- Employee reference, event timestamp
- Activity type, category
- Source system, raw event data
- Processing status

**Anomaly Model** (`backend/app/models/anomaly.py`)
- Employee, detection category
- Anomaly score, finding details
- Contributing evidence
- Detection timestamp

**Alert Model** (`backend/app/models/alert.py`)
- Employee reference, alert category
- Status, severity, occurrence count
- Related anomalies
- Assignment and notes

**Incident Model** (`backend/app/models/incident.py`)
- Title, description, status
- Severity, priority, risk score
- Investigation timeline
- Resolution details

**Behavioral Model** (`backend/app/models/behavior.py`)
- Employee baseline profiles
- Feature vectors per day
- Statistical parameters
- Peer group associations

**Enums** (`backend/app/models/enums.py`)
- Activity types, categories
- Alert/Incident status and severity
- Risk levels
- Role definitions

---

## 14. Core Infrastructure

### Database Layer (`backend/app/db/`)
- SQLAlchemy 2.0 ORM with async support
- PostgreSQL (primary) or SQLite (development)
- Connection pooling
- Transaction management

### Configuration (`backend/app/core/config.py`)
- Environment-based settings
- Database URL configuration
- JWT secret key management
- CORS origin configuration
- Feature flags

### Security (`backend/app/core/security.py`)
- Password hashing (bcrypt)
- JWT token creation/verification
- RBAC enforcement
- Secure headers

### API Structure (`backend/app/api/v1/router.py`)
- RESTful endpoint organization
- Version management
- 80+ endpoints across all modules
- Swagger/ReDoc documentation

---

# FRONTEND FEATURES & FUNCTIONS

## 1. Authentication & Session Management
**Location:** `frontend/src/components/auth/`, `frontend/src/context/AuthContext.jsx`

### Features:
- **Login Interface**
  - Email/password authentication form
  - OAuth2 Google login button
  - Password reset flow
  - Remember me functionality

- **Session Management**
  - JWT token storage in secure storage
  - Automatic token refresh
  - Session timeout handling
  - Logout with token cleanup

- **Protected Routes**
  - Role-based route guards
  - Redirect to login for unauthenticated users
  - Feature visibility based on permissions

---

## 2. Navigation & Layout System
**Location:** `frontend/src/layouts/`, `frontend/src/components/navigation/`

### Components:
- **Header**
  - Application branding and logo
  - User profile dropdown menu
  - Notification bell with unread count
  - Theme toggle (Light/Dark/System)
  - Logout button

- **Sidebar**
  - Role-based menu items
  - Dashboard, Alerts, Investigations, Reports links
  - Employee search
  - Settings access
  - Help/documentation links

- **Responsive Design**
  - Mobile-optimized layout
  - Collapsible sidebar on small screens
  - Touch-friendly navigation

---

## 3. Dashboard Pages
**Location:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/*/`

### Executive Dashboard
- **Key Metrics**
  - Total employees monitored (big card)
  - Active alerts count
  - High-risk employees count
  - Incidents under investigation

- **Visualizations**
  - Risk distribution pie chart
  - Alert trends line chart (7/30 days)
  - Top at-risk employees table
  - Recent incidents list

**Analyst Dashboard**
- **Alert Queue**
  - Open alerts grid with columns: employee, category, severity, status
  - Real-time count updates
  - Quick filter by severity
  - Sort by latest/oldest/risk

- **Quick Access**
  - Employee search bar
  - Recent investigations
  - Active filters display
  - Create new investigation button

**Risk Dashboard**
- **Risk Heatmap**
  - Employee-risk matrix visualization
  - Risk score distribution
  - Trend indicators (up/down arrows)

- **High-Risk Focus**
  - Ranked employee list
  - Score trends (sparklines)
  - Contributing factor breakdown
  - Investigation status

**Incident Dashboard**
- **Status Overview**
  - Incident funnel chart
  - Resolution time tracking
  - Incident aging visualization

---

## 4. Alert Management Interface
**Location:** `frontend/src/pages/Alerts.jsx`, `frontend/src/components/alerts/`

### Core Functionality:
- **Alert Grid**
  - Columns: Employee, Category, Severity (color-coded), Score, Status, Timestamp
  - Multi-column sorting
  - Inline filtering (employee name, category, severity, date range)
  - Pagination (10/25/50 per page)

- **Alert Details Modal**
  - Full alert information
  - Anomaly evidence breakdown
  - Related activities timeline
  - Investigation linking
  - Comment section

- **Bulk Actions**
  - Select multiple alerts
  - Batch status update
  - Assign to analyst
  - Create investigation from alerts

- **Real-time Updates**
  - WebSocket connection for new alerts
  - Badge with unread count
  - Auto-refresh of alert list
  - Toast notifications for critical alerts

---

## 5. Employee Profile & Search
**Location:** `frontend/src/pages/Employees.jsx`, `frontend/src/components/employees/`

### Features:
- **Employee Directory**
  - Searchable employee table
  - Filter by department, risk level, HR status
  - Sort by name, risk score, email

- **Employee Detail Profile**
  - Photo and basic info
  - Department, manager, role
  - HR status and risk flags
  - Risk score and trend
  - Recent activities (last 10)
  - Alert history
  - Investigation history

- **Risk Score Breakdown**
  - Component breakdown (pie chart)
  - Evidence list ranked by impact
  - Score trend line chart
  - Peer comparison

- **Activity Timeline**
  - Chronological list of activities
  - Filter by activity type
  - Export activity list
  - Drill into specific activities

---

## 6. Investigation Workspace
**Location:** `frontend/src/pages/Investigations.jsx`, `frontend/src/pages/InvestigationDetail.jsx`

### Investigation List
- **Grid View**
  - Columns: Title, Employee, Status, Severity, Risk Score, Assigned To, Created Date
  - Status filter (Open, In Progress, Under Review, Resolved, Escalated)
  - Severity filter
  - Search by title/employee
  - Sort options

- **Action Buttons**
  - Create new investigation
  - Bulk assign
  - Status updates
  - Export selection

### Investigation Detail View
- **Case Header**
  - Title and description
  - Status (dropdown to change)
  - Severity and priority assignment
  - Current risk score
  - Employee profile preview
  - Created/updated dates

- **Timeline View**
  - Chronological activity log
  - Color-coded by activity type
  - Severity indicators
  - Expandable detail cards
  - Evidence highlighting

- **Investigation Canvas**
  - Notes editor (rich text)
  - Evidence tagging
  - Related alert display
  - Linked investigation references

- **Activity Details Panel**
  - Full event information
  - Raw log data
  - Source system metadata
  - Linked entities (files, resources, etc.)

---

## 7. Risk Analysis & Visualization
**Location:** `frontend/src/components/charts/`, `frontend/src/utils/`

### Visualization Components:
- **Risk Heatmap**
  - Employee × Risk dimension matrix
  - Color scale (green → red)
  - Interactive hover for details
  - Drill-down to employee profile

- **Time Series Charts**
  - Line charts for trend analysis
  - Area charts for volume analysis
  - Bar charts for comparisons
  - Recharts library with interactive legends

- **Distribution Charts**
  - Pie charts for status breakdown
  - Donut charts with center labels
  - Percentage annotations

- **Correlation Matrix**
  - Risk component relationships
  - Detection effectiveness over time
  - Anomaly type frequency

---

## 8. Report Generation & Export
**Location:** `frontend/src/pages/Reports.jsx`, `frontend/src/components/reports/`

### Features:
- **Report Builder**
  - Template selection (Executive, Detailed, Custom)
  - Date range picker
  - Employee/department filter
  - Metric selection
  - Visualization preferences

- **Preview Mode**
  - WYSIWYG preview of generated report
  - Theme preview (light/dark)
  - Page break preview

- **Export Options**
  - PDF download
  - Excel download
  - Email delivery
  - Schedule recurring reports

- **Report History**
  - List of generated reports
  - Download/share previously generated
  - Regenerate from template

---

## 9. Search & Discovery
**Location:** `frontend/src/components/search/`, `frontend/src/hooks/useSearch.js`

### Search Functionality:
- **Global Search**
  - Search bar in header
  - Query suggestions/autocomplete
  - Search results modal with filters
  - Quick navigation to results

- **Advanced Search**
  - Multi-field search form
  - Date range picker
  - Activity type filters
  - Risk score range
  - Severity level selection
  - Full-text search on activity data

- **Saved Searches**
  - Save custom search queries
  - Load from history
  - Share search with team members

---

## 10. Notifications & Alerts
**Location:** `frontend/src/components/notifications/`, `frontend/src/context/NotificationContext.jsx`

### Features:
- **Real-Time Alerts**
  - WebSocket connection to backend
  - Toast notifications for critical events
  - Bell icon with badge count
  - Notification center dropdown

- **Notification Types**
  - New high-risk alert
  - Investigation status change
  - Report completion
  - System messages

- **Notification Preferences**
  - Channel selection (browser, email)
  - Severity filtering
  - Quiet hours configuration

---

## 11. User Preferences & Settings
**Location:** `frontend/src/pages/Settings.jsx`, `frontend/src/components/settings/`

### Settings Sections:
- **Profile Settings**
  - Name and email
  - Password change
  - Notification preferences

- **Theme Settings**
  - Light/Dark/System toggle
  - Persisted in localStorage
  - Instant application on change

- **Display Preferences**
  - Items per page
  - Default sort order
  - Timezone selection
  - Date format

---

## 12. Theme System
**Location:** `frontend/src/index.css`, `frontend/tailwind.config.js`

### Theme Features:
- **Light Mode**
  - Warm neutral color palette
  - High contrast for accessibility
  - No heavy shadows, focus on type hierarchy

- **Dark Mode**
  - Professional dark palette
  - Reduced eye strain
  - Same contrast ratios maintained

- **Color Accessibility**
  - CVD (Color Vision Deficiency) validation
  - ΔE 9.1 light / 8.4 dark validation
  - Severity colors distinct from data series
  - Always includes color + label for meaning

### CSS Architecture:
- Tailwind CSS 3 for utility classes
- Custom CSS properties for theming
- No theme flash on reload (set before paint)
- Single HTML attribute for theme switching

---

## 13. Routing & Navigation
**Location:** `frontend/src/App.jsx`, `frontend/src/utils/router.js`

### Route Structure:
```
/                              # Dashboard (role-dependent)
/login                         # Authentication
/employees                     # Employee directory
/employees/:id                 # Employee profile
/alerts                        # Alert queue
/investigations                # Investigations list
/investigations/:id            # Investigation detail
/reports                       # Reports & export
/settings                      # User preferences
/admin                         # Admin panel (admin only)
```

### Route Guards:
- Authentication check
- Role-based access control
- Feature flag checks
- Redirect handling

---

## 14. API Integration Layer
**Location:** `frontend/src/api/`, `frontend/src/hooks/useApi.js`

### HTTP Client:
- Axios instance with base URL configuration
- Automatic JWT token injection
- Error handling and retry logic
- Request/response logging

### API Methods:
- Authentication endpoints (login, logout, refresh)
- Employee CRUD operations
- Alert listing and management
- Investigation CRUD
- Report generation
- Dashboard data fetching

### Data Management:
- Custom hooks for data fetching (useQuery-like)
- Loading, error, and success states
- Automatic caching
- Invalidation on mutations

---

## 15. Components Library
**Location:** `frontend/src/components/`

### Reusable Components:
- **Common**
  - Button with variants (primary, secondary, danger)
  - Input fields (text, email, password, date)
  - Select dropdowns
  - Modals/Dialogs
  - Toast notifications
  - Loading spinners
  - Empty state components

- **Data Display**
  - Data table with sorting/filtering
  - Card components
  - List items
  - Status badges (severity colors)

- **Forms**
  - Form wrapper with validation
  - Field components
  - Submit handlers
  - Error display

- **Charts**
  - Line, Bar, Pie, Area charts (Recharts)
  - Legend with interactive filtering
  - Responsive sizing
  - Custom tooltips

---

## 16. Accessibility Features
**Location:** Throughout `frontend/src/`

### Implemented:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Tab index management
- Screen reader support
- Focus indicators
- Color contrast compliance (WCAG AA)
- Alt text for images
- Proper heading hierarchy

---

## 17. Performance Optimizations
**Location:** `frontend/vite.config.js`, `frontend/src/`

### Techniques:
- Code splitting by route
- Lazy loading components
- Image optimization
- CSS minification (Tailwind)
- Bundle analysis
- Caching strategies
- Debounced search
- Pagination to reduce DOM size

---

## 18. Build & Deployment
**Location:** `frontend/Dockerfile`, `frontend/nginx.conf`

### Build Process:
- Vite 6 for fast development and optimized production builds
- React 18 with modern features
- TypeScript support ready
- PostCSS for CSS processing

### Production Serving:
- Nginx as reverse proxy
- Static file serving with cache headers
- Client-side routing (SPA fallback)
- gzip compression

---

# Integration Points

## Frontend ↔ Backend Communication:
1. **Authentication Flow**
   - Frontend: Login form → Backend: JWT generation → Frontend: Token storage
   - Token injected in all subsequent API calls

2. **Real-Time Updates**
   - WebSocket connection for notifications
   - Alert bell updates instantly
   - Investigation activity feeds live update

3. **Data Flow**
   - Frontend fetches employee/alert data from API
   - Dashboard metrics auto-refresh (30-second intervals)
   - Investigation timeline streams new activities

4. **File Export**
   - Frontend requests PDF/Excel generation
   - Backend processes and streams file
   - Browser downloads file

---

# Deployment & Infrastructure

## Docker Architecture:
- **Frontend Container**: Node.js build → Nginx serving
- **Backend Container**: Python 3.12 with FastAPI → Uvicorn ASGI server
- **Database Container**: PostgreSQL 16
- **Cache Container**: Redis
- **Optional**: OpenSearch for advanced log search

## Environment Configuration:
- `.env.example` defines all settings
- Database URL, JWT secret, admin credentials
- CORS origins, email configuration
- ML model parameters, thresholds

## Testing:
- **Backend**: pytest with 40+ test cases covering:
  - Authentication and RBAC
  - Detection algorithms
  - Risk scoring
  - Investigation workflows
  - Report generation

- **Frontend**: Vitest ready (configuration in place)

---

# Security Implementation

## Authentication & Authorization:
- bcrypt password hashing (12 rounds)
- JWT with HS256 signing (60-minute expiration)
- OAuth2 Google authentication support
- RBAC enforced server-side

## Data Protection:
- HTTPS enforced in production
- CORS origin validation
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (React escaping)
- Sensitive data audit logging

## Compliance:
- HIPAA-ready for healthcare
- PCI-DSS compatible architecture
- SOC 2 audit trail support
- Immutable audit logging

---

# Summary: 13 Core Modules

| Module | Backend | Frontend | Purpose |
|--------|---------|----------|---------|
| 1. Authentication | auth.py, deps.py | auth/, AuthContext | User login, JWT, OAuth2, RBAC |
| 2. Employees | employees.py | Employees.jsx | Directory, profiles, peer grouping |
| 3. Ingestion | ingestion.py | — | Multi-source log collection |
| 4. Behavioral Profiling | baseline.py, features.py | — | Daily baselines, peer groups |
| 5. Anomaly Detection | anomaly.py | — | Rules + statistical + ML |
| 6. Risk Scoring | risk.py | Risk.jsx | Weighted model, full explainability |
| 7. Investigations | investigations.py | Investigations.jsx | Case management, timeline |
| 8. UEBA | ueba.py | — | Advanced behavior analytics |
| 9. Alerts | alerts.py | Alerts.jsx | Alert generation, management |
| 10. Dashboards | dashboards.py | pages/* | Executive, analyst, risk views |
| 11. Notifications | notifications.py | Notifications.jsx | Real-time WebSocket alerts |
| 12. Reports | reports.py | Reports.jsx | PDF/Excel export, scheduling |
| 13. Infrastructure | core/, db/, tests/ | App.jsx, routing | Config, ORM, deployment, CI/CD |

---

**Document Generated:** 2026-09-11  
**Repository:** mailech/AI-Insider-Threat-BI  
**Branch:** sathwik  
**Version:** 1.0.0
