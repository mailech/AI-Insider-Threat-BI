# API Architecture

The FastAPI backend will be grouped into distinct router modules for logical separation.

## 1. Authentication & Users
- `POST /api/v1/auth/login`: Authenticate system users, receive JWT.
- `GET /api/v1/users/me`: Get current user profile.
- `GET /api/v1/users`: List all platform users (Admin only).

## 2. Employee Identity Management
- `GET /api/v1/employees`: List employees with filters (department, risk_category).
- `GET /api/v1/employees/{id}`: Get complete employee profile, manager chain, devices.
- `POST /api/v1/employees`: Onboard new employee (Admin/Integration).
- `GET /api/v1/devices`: List all monitored devices and mapped employees.

## 3. Activity Management
- `POST /api/v1/activities/ingest`: Batch endpoint for log ingestion (from syslog/agents).
- `GET /api/v1/employees/{id}/activities`: Timeline of recent activity.

## 4. Analytics & UEBA
- `GET /api/v1/analytics/ueba/peers`: Get peer group comparison data.
- `GET /api/v1/analytics/risk-trends`: Org-wide risk trends over time.
- `GET /api/v1/analytics/profiles/{employee_id}`: Fetch behavioral baselines.
- `GET /api/v1/analytics/anomalies`: List recent anomalies.

## 5. Alerts & Incidents (Investigation)
- `GET /api/v1/alerts`: List alerts (queue view for analysts).
- `GET /api/v1/alerts/{id}`: Get specific alert detail.
- `PATCH /api/v1/alerts/{id}/status`: Update alert status (e.g., Escalated, Resolved).
- `POST /api/v1/alerts/{id}/evidence`: Attach specific log/anomaly to the incident.
- `POST /api/v1/alerts/{id}/assign`: Assign alert to an analyst.

## 6. Reporting
- `GET /api/v1/reports/insider-threat`: Export PDF/Excel summaries.
- `GET /api/v1/reports/compliance`: Generate compliance-related audit of access logs.
- `GET /api/v1/reports/behavioral`: Behavioral analytics reports.
- `GET /api/v1/reports/investigation`: Export investigation documentation.
- `GET /api/v1/reports/risk`: Organizational risk assessment reports.

## 7. Dashboards
- `GET /api/v1/dashboards/analyst`: Load security analyst triage data.
- `GET /api/v1/dashboards/soc`: Load real-time SOC metrics.
- `GET /api/v1/dashboards/manager`: Load strategic manager risk posture.
- `GET /api/v1/dashboards/admin`: Load system health and audit logs.

## 8. Security considerations for API
- Route dependencies: `get_current_active_user`, `require_role(["Admin"])`
- Rate limiting for ingestion API points.
