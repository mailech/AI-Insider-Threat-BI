# Activity Management System
### (Insider Threat Behavioral Intelligence System)

Final year project - an AI-powered insider threat / workplace activity monitoring
dashboard. React + Vite frontend, backed by a real Flask + SQLite + JWT backend with
role based access control (RBAC) enforced on the server, not just hidden in the UI.

## Quick start - Docker (recommended)

```bash
cp .env.example .env          # then edit SECRET_KEY to something random
docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| API health check | http://localhost:5000/api/health |

The database seeds itself automatically on first run (105 employees, 4 alerts, 3
staff accounts). To reseed with a different employee count:
```bash
docker compose exec api python -m scripts.seed --employees 40 --reset
```
See [DEPLOYMENT.md](DEPLOYMENT.md) for AWS and Azure deployment steps.

## Quick start - manual (two terminals)

**Terminal 1 - frontend**
```
npm install
npm run dev
```
Open the localhost link (usually http://localhost:5173).

**Terminal 2 - backend**
```
cd server
pip install -r requirements.txt
python app.py
```
Starts the API on http://localhost:5000. A `database.db` SQLite file is created and
seeded automatically the first time you run it (105 employees, 4 alerts, 3 staff
accounts, notifications). Or seed it explicitly with a chosen employee count:
```bash
python -m scripts.seed --employees 40 --reset
```

The frontend needs the backend running to do anything - login itself is a real API
call now, not a local check.

Needs Node.js 18+ and Python 3 (or just Docker, for the quick start above).

## Running the test suite

```bash
cd server
pip install -r requirements.txt
pytest
```
16 tests covering login, RBAC (every role/endpoint combination), containment
blocking a real login, brute-force lockout, and audit log access. Uses a throwaway
test database, never touches your real `database.db`.

## API reference

See [API.md](API.md) for all 19 endpoints with example `curl` requests. Flask
doesn't auto-generate a Swagger/OpenAPI UI the way FastAPI does, so this is a plain
written reference instead.

## Objective

An AI-powered platform that continuously monitors employee activity, builds
behavioral baselines, detects anomalies, scores insider risk, and drives
investigation workflows for security teams - built for the kind of organization
(enterprise, financial, healthcare, government, SOC) that needs to catch insider
threats before they become breaches.

## What's actually implemented, against each project outcome

| Outcome | Status | Where |
|---|---|---|
| AI-powered insider threat detection platform | ✅ | Real Isolation Forest model (`server/insider_threat_model.joblib`), served via `/api/predict` and `/api/activity/ingest` |
| Secure authentication and role-based access control | ✅ | JWT + bcrypt-style password hashing + `require_role()` enforced server-side on every sensitive route, see the RBAC table below |
| Employee activity monitoring and behavioral profiling | ✅ | Activity Monitor page, per-employee behavioral signal breakdown, log-source tagging (logon/device/http/email/file) |
| Anomaly detection and insider risk scoring engine | ✅ | `/api/predict` + `/api/activity/ingest`, 0-100 risk score, High/Medium/Low banding |
| User/entity behavior analytics (UBA/UEBA) | ✅ (baseline level) | Per-employee score history with a real sparkline (Profile page), department-level peer comparison (Risk Analysis) |
| Threat investigation and incident management | ✅ | Per-alert Investigation page with its own timeline/evidence, resolve/reopen workflow, employee containment |
| Dashboards for analysts and SOC teams | ✅ | Role-differentiated Dashboard/Risk Analysis/Reports, live metrics, dynamic trend chart |
| Deployed via Docker | ✅ | `docker-compose.yml` + Dockerfiles for both services, tested end-to-end (see below) |
| Cloud deployment (AWS/Azure) | 📝 documented, not hosted | [DEPLOYMENT.md](DEPLOYMENT.md) has real, correct steps for both - not run against a live account from here, since that needs your own cloud credentials |

The UBA/UEBA row is intentionally marked "baseline level": this project compares an
employee to their own history and their department's average, which is genuine
behavioral analytics, but it's not the full multi-week statistical baselining +
peer-group clustering a dedicated UEBA engine would do. That would be a substantial
follow-on project, not something to overstate here.

## Login details

| Role | Email | Password |
|---|---|---|
| Admin | admin@activity.local | admin123 |
| Security Manager | manager@activity.local | manager123 |
| Analyst | analyst@activity.local | analyst123 |

Employee logins (any of these + password `employee123`):
ravi@company.com, sneha@company.com, arjun@company.com, priya@company.com, dev@company.com

The login page itself no longer shows or auto-fills any of these - it's a plain
email/password form (with a show/hide toggle on the password field). Type the
credentials in from this table.

If Admin adds a new employee, the backend generates a password for them and returns
it once after saving - copy it and hand it over (there's no real email server here).

**Brute-force protection:** 5 wrong passwords in a row locks that account for 15
minutes, tracked server-side in the database (not just in memory, so it survives a
restart). Every failed attempt and lockout is recorded in the audit log.

## The security fix this update is about

The finding: JWT authentication existed, but several sensitive endpoints (activity
ingestion, alert modification, employee containment) didn't consistently check the
authenticated user's role - a valid login alone was enough to do things that should
have been role-restricted.

**Fix:** every sensitive route in `server/app.py` is wrapped in `require_role(...)`
from `server/auth.py`, which decodes and verifies the JWT, then checks its `role`
claim against an allow-list for that specific route - server-side, before the
handler runs. A valid token from a lower-privileged role gets a `403`, not access.

| Endpoint | Method | Allowed roles |
|---|---|---|
| /api/auth/login | POST | Public |
| /api/auth/me | GET | Any authenticated user |
| /api/employees | GET | Any authenticated (Employee role only sees their own record) |
| /api/employees | POST | **Admin only** |
| /api/employees/\<id\> | DELETE | **Admin only** |
| /api/employees/\<id\>/contain | POST | Admin, Security Manager |
| /api/employees/\<id\>/release | POST | Admin, Security Manager |
| /api/alerts | GET | Admin, Security Manager, Analyst |
| /api/alerts/\<id\>/resolve | POST | Admin, Security Manager |
| /api/alerts/\<id\>/reopen | POST | Admin, Security Manager |
| /api/activity/ingest | POST | **Admin only** (represents the monitoring pipeline's own privilege) |
| /api/predict | POST | Admin, Security Manager, Analyst |
| /api/notifications | GET/POST | Admin, Security Manager, Analyst |
| /api/reports/\<name\> | GET | Admin, Security Manager, Analyst |
| /api/audit-log | GET | **Admin only** |

Every denied attempt is written to the audit log too (see below), not just allowed
actions - so a real `ACCESS_DENIED` row shows up whenever someone tries to hit an
endpoint their role isn't allowed to touch.

Two other things worth mentioning: passwords are hashed with Werkzeug's
`generate_password_hash`/`check_password_hash` (never stored in plain text in the
database), and the employee's risk score is always computed by the backend from the
activity numbers - the frontend can preview a prediction, but never sends a score
value the server just trusts and stores as-is.

## New: 4 roles instead of 3

| | Admin | Security Manager | Analyst | Employee |
|---|---|---|---|---|
| View Dashboard/Employees/Alerts/Reports | ✅ | ✅ | ✅ | ❌ (own portal only) |
| Add / delete employees | ✅ | ❌ | ❌ | ❌ |
| Contain / release an employee's account | ✅ | ✅ | ❌ | ❌ |
| Resolve / reopen alerts | ✅ | ✅ | ❌ (investigate only) | ❌ |
| Ingest activity data | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |

Maps to the standard security team split: Admin dashboard (user management, audit),
Security Manager dashboard (org risk posture, compliance reports, containment),
Security Analyst / SOC dashboard (alerts, investigation, risk analysis).

## New features in this update

- **No more demo shortcuts** - the login page's "View demo accounts" panel and the
  Add Employee / Activity Ingestion "Fill example" / "Randomize" buttons are gone.
  Every risk prediction now comes from activity numbers someone actually typed in
  and sent to the real model - nothing pre-filled or canned.
- **Login lockout** - 5 wrong passwords locks the account for 15 minutes, enforced
  and tracked server-side, with every attempt recorded in the audit log.
- **Real score history** - every time activity is ingested for an employee, it's
  saved to an `activity_history` table (each employee also starts with 5 seeded
  historical points). The Profile page now has a real "Score history" panel with an
  actual sparkline chart and a list of past scores - not a fabricated illustration.
- **Password visibility toggle** on the login form.
- **Real per-alert investigation** - each alert links to its own case, with its own
  timeline/evidence, instead of a single hardcoded story for every alert.
- **Dynamic risk activity trend chart** - the line graph on the Dashboard is now
  calculated from the real average risk score across all current employees, so it
  visibly shifts when employees are added, removed, contained, or rescored.
- **Employee containment** - Admin/Security Manager can "contain" an employee's
  account (lock icon on Employees table, or a button on their Profile page). A
  contained employee's login is rejected server-side immediately, even with the
  correct password - this isn't just a visual badge, it actually blocks access.
- **Activity ingestion endpoint** - Admin-only endpoint (also exposed as a small form
  on the Employee Profile page) that simulates the monitoring pipeline sending fresh
  activity counts for one employee, scores it with the real model, and raises a
  notification if it's anomalous.
- **Audit log** - Admin-only page showing every sensitive action taken (and every
  denied attempt), with timestamp, actor, role, action, and target.
- **Working global search** - the header search bar now actually searches employees
  and alerts and jumps straight to the result.
- **Department risk breakdown** - average risk score per department on Risk Analysis.
- **Print report** - a print-friendly view on the Investigation page.
- **Server-generated reports** - CSV reports are now generated and served by the
  backend (and logged in the audit trail), not built in the browser.

## Pages

- Login
- Dashboard
- Employees (search + filters + export + delete + contain/release)
- Add Employee (Admin) with AI risk prediction preview
- Employee Profile (contain/release, real score history panel, Admin-only activity ingestion form)
- Activity Monitor
- Threat Alerts (resolve/reopen + real per-alert investigation)
- Risk Analysis (leaderboard + department breakdown)
- Reports (server-generated CSV)
- Settings (profile/password UI - not yet wired to a backend endpoint)
- Audit Log (Admin only)
- Employee Portal (for Employee role)

## AI risk model

`server/insider_threat_model.joblib` is a real Isolation Forest trained on 5 behavior
features (logon count, after-hours logons, USB connects, file copies, email count).
It's loaded once when the Flask app starts and used by `/api/predict`,
`/api/employees` (POST, if you supply `features`), and `/api/activity/ingest`.

The model expects large cumulative numbers (hundreds to thousands, totals over a
monitoring period) rather than daily counts. There are no pre-filled example values
anymore - type real numbers in. A few reference points if you want to sanity-check
it: an average employee in this dataset sits around 855 logons / 74 after-hours
logons / 405 USB connects / 446 file copies / 2630 emails over the monitoring
period; pushing file copies and after-hours logons far above that while emails stay
low is the kind of pattern the model flags as anomalous.

**Why manual entry at all?** In a real deployment, monitoring agents on each
employee's computer would log this activity automatically, feed it into a central
log system, and a scheduled job would compute these 5 numbers and call
`/api/activity/ingest` on its own - no human typing involved. This project has no
real monitoring agents, so the ingestion form on the Profile page (and the fields on
Add Employee) stand in for that missing pipeline, while still calling the exact same
role-restricted endpoint a real pipeline would use.

## About the employee data

The 105 employees are synthetic data (5 named "flagship" ones used by the alerts,
plus 100 generated ones spread across departments) structured loosely around the
CERT Insider Threat Dataset (r4.2) log categories - logon, device, http, email, file.
The real CERT dataset is a restricted research release requested from CMU SEI, not
something redistributable here - this is only modeled on its structure.

## Technical notes

- Backend: Flask, SQLite (file-based, auto-created and auto-seeded), PyJWT for
  tokens, Werkzeug for password hashing, scikit-learn/joblib for the ML model,
  gunicorn as the production-style server inside Docker.
- Frontend: React + Vite + React Router, calling the backend over `fetch` with a
  `Authorization: Bearer <token>` header on every request after login.
- `SECRET_KEY` is read from an environment variable (`server/.env` locally, or
  `.env` at the project root for Docker Compose) - the fallback value in
  `auth.py` only exists so `python app.py` still works with zero setup, and is
  obviously named so nobody mistakes it for a real secret.
- Docker: two containers (`api`, `web`), a named volume so the SQLite database
  survives restarts, both actually built and smoke-tested (gunicorn command run
  directly, health check and login verified) before shipping.
- 16 automated tests in `server/tests/`, covering the RBAC matrix specifically.
- This is still a student project scope: no HTTPS termination built in (put it
  behind a reverse proxy or cloud load balancer for that), no refresh tokens, no
  rate limiting beyond the login lockout, and the Settings page's password-change
  form isn't wired to a real endpoint yet. These would be the next things to add
  for a genuine production system - see the checklist in DEPLOYMENT.md.

## Project structure

```
activity-management-system/
├── docker-compose.yml       # orchestrates both containers
├── Dockerfile                # frontend (Node build -> nginx)
├── nginx.conf
├── .env.example
├── API.md                    # endpoint reference with curl examples
├── DEPLOYMENT.md             # Docker / AWS / Azure steps
├── index.html, package.json, vite.config.js
├── src/
│   ├── main.jsx               # entire React app
│   └── style.css
└── server/
    ├── Dockerfile             # backend (gunicorn)
    ├── app.py                 # all API routes + RBAC
    ├── auth.py                # JWT + require_role()
    ├── db.py                  # schema + seeding
    ├── seed_data.py            # synthetic employee/alert generators
    ├── insider_threat_model.joblib
    ├── requirements.txt
    ├── scripts/seed.py         # CLI reseed tool
    └── tests/                  # pytest suite (16 tests)
```
