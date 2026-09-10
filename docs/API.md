# API reference

Base URL: `http://localhost:8000/api/v1` · Interactive docs: `/docs` · Schema: `/openapi.json`

All endpoints except `/auth/register`, `/auth/login`, `/auth/refresh` and the OAuth routes
require `Authorization: Bearer <access_token>`.

## Roles

`security_analyst` · `soc_engineer` · `security_manager` · `administrator`

Administrators pass every guard. The tables below show the minimum role required.

## Authentication

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Register; the first account becomes administrator |
| POST | `/auth/login` | – | Exchange credentials for access + refresh tokens |
| POST | `/auth/refresh` | – | Rotate an expired access token |
| GET | `/auth/me` | any | Current profile |
| PATCH | `/auth/me` | any | Update own profile |
| POST | `/auth/change-password` | any | Rotate own password |
| GET | `/auth/oauth/google/authorize` | – | Begin the Google OAuth2 flow |
| GET | `/auth/oauth/google/callback` | – | Complete it and redirect to the console |

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"analyst@itbis.io","password":"Analyst@12345"}'
```

## Employees and identity (module 2)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/employees` | analyst | Search, filter and sort the workforce |
| POST | `/employees` | manager | Onboard an employee |
| GET | `/employees/{id}` | analyst | Full profile with assets and counts |
| PATCH | `/employees/{id}` | manager | Update an employee |
| DELETE | `/employees/{id}` | manager | Mark as terminated (soft) |
| GET | `/departments` | analyst | List departments with headcount |
| POST | `/departments` | manager | Create a department |
| PATCH | `/departments/{id}` | manager | Update a department |
| GET | `/employees/{id}/assets` | analyst | Devices assigned to an employee |
| POST | `/assets` | manager | Associate a device |
| DELETE | `/assets/{id}` | manager | Remove a device |

Query parameters on `/employees`: `q`, `department_id`, `risk_category`,
`employment_status`, `on_watchlist`, `is_privileged`, `sort` (`risk|name|code|created`),
`page`, `size`.

## Activity monitoring (module 3)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/activity/events` | analyst | Filterable event log |
| POST | `/activity/events` | soc | Ingest a single event |
| POST | `/activity/ingest` | soc | Bulk ingest (up to 5000 events) |
| POST | `/activity/upload` | soc | Upload a CSV log export |
| GET | `/activity/stats` | analyst | Volume, after-hours, external and timeline stats |
| GET | `/activity/employees/{id}/timeline` | analyst | One employee's chronological activity |

Ingestion normalises foreign vocabularies automatically — CERT (`logon`, `file_copy`),
Windows event IDs (`4624`, `4625`, `4672`), DLP and proxy terms — and maps unfamiliar CSV
headers (`user`, `pc`, `filename`, `size`, `date`) onto canonical fields.

```bash
curl -X POST http://localhost:8000/api/v1/activity/ingest \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"run_detection": true, "events": [{
        "employee_code": "EMP1018",
        "activity_type": "file_download",
        "log_source": "proxy",
        "event_time": "2026-09-09T23:14:00Z",
        "resource": "/finance/payroll.csv",
        "bytes_transferred": 524288000,
        "sensitivity": "restricted"}]}'
```

## Behavioural analytics and risk (modules 4, 5, 6, 8)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/baselines/build` | soc | Build baselines and peer groups |
| GET | `/baselines` | analyst | Baseline register with quality scores |
| GET | `/employees/{id}/baseline` | analyst | One baseline with device/app/hour profiles |
| POST | `/detection/run` | soc | Run every detector, then score and alert |
| GET | `/anomalies` | analyst | Filter by category, method, severity, score |
| GET | `/anomalies/{id}` | analyst | One anomaly with contributing features |
| POST | `/anomalies/{id}/review` | analyst | Confirm or mark a false positive |
| POST | `/risk/recompute` | soc | Recompute risk scores |
| GET | `/risk/distribution` | analyst | Employee counts per risk band |
| GET | `/risk/organisation` | analyst | Organisational posture summary |
| GET | `/employees/{id}/risk` | analyst | Score with the full weighted breakdown |
| GET | `/employees/{id}/risk/history` | analyst | Score history for trending |
| GET | `/ueba/employees/{id}` | analyst | Peer comparison, trend and prediction |
| GET | `/ueba/predictions` | analyst | Workforce ranked by escalation probability |
| GET | `/ueba/entities` | analyst | Device, application and destination analytics |
| GET | `/ueba/peer-groups` | analyst | Peer group statistics |

`GET /employees/{id}/risk` returns the explainable breakdown:

```json
{
  "score": 70.47, "category": "high", "trend": "rising",
  "raw_components": {
    "behavioral_anomalies": 97.2, "privilege_misuse": 22.0,
    "data_access_violations": 100.0, "access_pattern_deviations": 46.3,
    "historical_security_events": 61.4
  },
  "weights": {"behavioral_anomalies": 0.35, "privilege_misuse": 0.25,
              "data_access_violations": 0.2, "access_pattern_deviations": 0.1,
              "historical_security_events": 0.1},
  "contributing_factors": [
    {"component": "data_access_violations", "title": "Potential data exfiltration pattern",
     "severity": "critical", "contribution": 27.3}
  ]
}
```

## Alerts and investigations (modules 7, 9)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/alerts` | analyst | Prioritised alert queue |
| POST | `/alerts` | analyst | Raise an alert manually |
| GET | `/alerts/{id}` | analyst | One alert |
| PATCH | `/alerts/{id}` | analyst | Status, severity, assignment, resolution |
| POST | `/alerts/{id}/acknowledge` | analyst | Acknowledge |
| GET | `/investigations` | analyst | Incident queue |
| POST | `/investigations` | analyst | Open an investigation and build its timeline |
| GET | `/investigations/{id}` | analyst | Timeline, evidence, correlation, device analysis |
| PATCH | `/investigations/{id}` | analyst | Update fields or transition status |
| POST | `/investigations/{id}/escalate` | analyst | Escalate and notify |
| POST | `/investigations/{id}/assign` | analyst | Assign an analyst |
| POST | `/investigations/{id}/notes` | analyst | Add an investigator note |
| POST | `/investigations/{id}/evidence` | analyst | Attach hashed evidence |
| POST | `/investigations/{id}/timeline` | analyst | Add a timeline entry |
| POST | `/investigations/{id}/rebuild-timeline` | analyst | Regenerate from current data |

## Dashboards, notifications, reports, admin (modules 10, 11, 12)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/dashboards/analyst` | analyst | Alerts, risk scores, investigation queue |
| GET | `/dashboards/soc` | soc | Events, anomalies, investigations, intel |
| GET | `/dashboards/manager` | manager | Posture, trends, department risk, compliance |
| GET | `/dashboards/admin` | admin | Users, platform analytics, health, audit |
| GET | `/dashboards/me` | any | The dashboard matching the caller's role |
| GET | `/dashboards/metrics` | analyst | MTTD, MTTI, MTTR, precision, FP rate |
| GET | `/dashboards/timeline` | analyst | Daily event/anomaly/alert series |
| GET | `/notifications` | any | In-app inbox |
| GET | `/notifications/unread-count` | any | Badge count |
| POST | `/notifications/{id}/read` | any | Mark one read |
| POST | `/notifications/read-all` | any | Mark all read |
| POST | `/notifications/broadcast` | manager | Send to users or roles |
| WS | `/notifications/ws?token=` | any | Live alert stream |
| GET | `/reports/types` | analyst | Available reports |
| GET | `/reports/{type}` | analyst | JSON preview |
| GET | `/reports/{type}/export` | analyst | Download (`format=pdf` or `format=excel`) |
| GET | `/users` | admin | Manage console users |
| POST | `/users` | admin | Create a user |
| GET | `/users/assignable` | analyst | Directory for assignment and escalation |
| PATCH | `/users/{id}` | admin | Change role or status |
| DELETE | `/users/{id}` | admin | Deactivate (soft) |
| GET | `/users/audit/logs` | admin | Audit trail |

Report types: `insider_threat`, `behavioral_analytics`, `investigation`, `compliance`,
`risk_assessment`.

## Conventions

- **Pagination** — list endpoints take `page` and `size` and return
  `{items, total, page, size, pages}`.
- **Errors** — `{"detail": "..."}`; validation failures return `422` with an `errors` array.
- **Status codes** — `401` missing/invalid token, `403` role not permitted, `404` not found,
  `409` conflict (duplicate, or an illegal workflow transition).
- **Timing** — every response carries an `X-Process-Time-ms` header.
