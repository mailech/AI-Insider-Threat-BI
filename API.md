# API Reference

This project uses Flask, not FastAPI, so there's no auto-generated Swagger/OpenAPI UI
built in. This is a plain written reference instead, covering all 19 real endpoints,
with example requests you can run yourself against a running server.

Base URL for local dev / Docker: `http://localhost:5000`

All endpoints except `/api/auth/login` and `/api/health` require a JWT, sent as:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /api/auth/login
Public. Returns a JWT valid for 8 hours.
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@activity.local","password":"admin123"}'
```
Response:
```json
{"token": "eyJhbGci...", "user": {"id":"USR-ADMIN","name":"System Admin","email":"admin@activity.local","role":"Admin","employee_id":null}}
```
5 wrong passwords in a row locks the account for 15 minutes (`403`), even with the
correct password, tracked server-side.

### GET /api/auth/me
Any authenticated user. Returns the decoded token's user info.
```bash
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

---

## Employees

### GET /api/employees
Any authenticated user. Employee role only ever sees their own single record.
```bash
curl http://localhost:5000/api/employees -H "Authorization: Bearer $TOKEN"
```

### POST /api/employees
**Admin only.** Optionally include `features` (the 5 activity counts) to have the
backend compute a real starting risk score with the ML model instead of defaulting
to 0. Also creates a login for the new employee and returns a one-time password.
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@company.com","dept":"Engineering","role":"Engineer",
       "features":{"logon_count":1026,"after_hours_logon_count":1113,"usb_connect_count":8108,"file_copy_count":11140,"email_count":263}}'
```

### DELETE /api/employees/\<id\>
**Admin only.**
```bash
curl -X DELETE http://localhost:5000/api/employees/EMP-1042 -H "Authorization: Bearer $TOKEN"
```

### POST /api/employees/\<id\>/contain
**Admin, Security Manager.** Blocks that employee's login immediately.
```bash
curl -X POST http://localhost:5000/api/employees/EMP-1042/contain -H "Authorization: Bearer $TOKEN"
```

### POST /api/employees/\<id\>/release
**Admin, Security Manager.** Undoes containment.

### GET /api/employees/\<id\>/history
Any authenticated user (Employee role only for their own id). Returns the recorded
score history for one employee.
```bash
curl http://localhost:5000/api/employees/EMP-1042/history -H "Authorization: Bearer $TOKEN"
```

---

## Alerts

### GET /api/alerts
**Admin, Security Manager, Analyst.**

### POST /api/alerts/\<id\>/resolve
**Admin, Security Manager.** (Analyst gets `403` - investigate only, can't close.)

### POST /api/alerts/\<id\>/reopen
**Admin, Security Manager.**

---

## Activity & the ML model

### POST /api/activity/ingest
**Admin only.** Simulates the monitoring pipeline sending fresh activity counts for
one employee. Scores it with the real model, updates that employee's record, appends
to their score history, and raises a notification if flagged anomalous.
```bash
curl -X POST http://localhost:5000/api/activity/ingest \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP-1042","logon_count":1026,"after_hours_logon_count":1113,"usb_connect_count":8108,"file_copy_count":11140,"email_count":263}'
```

### POST /api/predict
**Admin, Security Manager, Analyst.** Runs the model without saving anything - used
for the live preview on Add Employee.
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"logon_count":855,"after_hours_logon_count":74,"usb_connect_count":405,"file_copy_count":446,"email_count":2630}'
```

---

## Notifications

### GET /api/notifications
**Admin, Security Manager, Analyst.**

### POST /api/notifications/\<id\>/read
**Admin, Security Manager, Analyst.**

### POST /api/notifications/read-all
**Admin, Security Manager, Analyst.**

---

## Reports

### GET /api/reports/\<name\>
**Admin, Security Manager, Analyst.** `name` is one of `weekly_threat_summary`,
`high_risk_users`, `detection_model_performance`. Returns a real CSV file, and the
export is written to the audit log.
```bash
curl http://localhost:5000/api/reports/high_risk_users -H "Authorization: Bearer $TOKEN" -o report.csv
```

---

## Audit log

### GET /api/audit-log
**Admin only.** Every sensitive action taken, and every denied attempt, most recent
first (capped at 200 rows).
```bash
curl http://localhost:5000/api/audit-log -H "Authorization: Bearer $TOKEN"
```

---

## Health

### GET /api/health
Public. No auth required.
```bash
curl http://localhost:5000/api/health
```

---

## Status codes used throughout

| Code | Meaning |
|---|---|
| 200 | success |
| 401 | missing/invalid/expired token, or wrong login credentials |
| 403 | valid token, but the role isn't allowed to do this - **this is the RBAC fix in action** |
| 404 | unknown employee/alert/report name |
| 400 | bad request body (e.g. missing required field) |
