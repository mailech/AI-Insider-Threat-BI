<<<<<<< HEAD
# Insider Threat Behavioral Intelligence System

An AI-powered platform that continuously monitors employee activity, builds behavioural
baselines, detects anomalies, scores insider risk and drives SOC investigation workflows.

Built for enterprises, financial institutions, healthcare providers, government agencies
and security operations centres.

```
Log sources ──▶ Ingestion ──▶ Behavioural ──▶ Anomaly ──▶ Risk ──▶ Alerts ──▶ Investigation
(AD, VPN, DLP,    pipeline      profiling      detection    scoring    &        & response
 endpoint, email,               (baselines,    (rules +     (weighted  incidents
 proxy, firewall)               peer groups)   ML + stats)   model)
```

## Quick start

### Docker (full stack)

```bash
cp .env.example .env          # then edit SECRET_KEY and passwords
docker compose up -d --build

# seed a demo dataset with planted insider-threat scenarios
docker compose exec api python -m scripts.seed --employees 40 --days 60 --reset
```

| Service | URL |
| --- | --- |
| Console | http://localhost |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| API docs (ReDoc) | http://localhost:8000/redoc |

Add `--profile search` to also start OpenSearch and OpenSearch Dashboards.

### Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m scripts.seed --employees 40 --days 60 --reset
uvicorn app.main:app --reload

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

The console runs on http://localhost:5173 and talks to the API on port 8000.
With no `DATABASE_URL` set the backend uses a local SQLite file, so it runs with
no database server at all.

### Demo accounts

After seeding:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@itbis.io | Admin@12345 |
| Security Analyst | analyst@itbis.io | Analyst@12345 |
| SOC Engineer | soc@itbis.io | SocEng@12345 |
| Security Manager | manager@itbis.io | Manager@12345 |

The seed plants four classic insider-threat scenarios — data exfiltration before
resignation, privilege abuse, credential probing and an after-hours bulk transfer —
so the detection engine has genuine threats to surface.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Primary database | PostgreSQL 16 (SQLite for zero-setup development) |
| Secondary store | MongoDB (raw log archive), Redis (cache) |
| ML / analytics | scikit-learn (Isolation Forest), XGBoost, NumPy, pandas, SciPy |
| Frontend | React 18, Vite 6, Tailwind CSS 3, Recharts, React Router 6 |
| Auth | JWT access/refresh tokens, OAuth2 (Google), bcrypt, RBAC |
| Reporting | ReportLab (PDF), openpyxl (Excel) |
| Search tier | OpenSearch + Dashboards (optional profile) |
| Delivery | Docker, Docker Compose, nginx, GitHub Actions |

## Testing

```bash
cd backend && pytest             # 75 tests: auth, RBAC, detection, classifier,
                                 # infrastructure adapters, workflows, reports
cd frontend && npm run build     # production build
cd frontend && npm run test:ui   # optional; skips cleanly unless playwright is installed
```

## Optional backing services

MongoDB, Redis and OpenSearch are all **optional**. Each adapter probes its
service once at startup; when it is missing, the platform falls back and keeps
working, so `uvicorn app.main:app` and `pytest` need no containers at all.

| Service | Used for | Fallback when absent |
| --- | --- | --- |
| MongoDB | Raw ingested log archive, case notes, evidence, notification delivery log | `document_archive` table in PostgreSQL |
| Redis | Dashboard aggregate and risk-score cache | In-process TTL cache |
| OpenSearch | Ranked full-text investigation search | PostgreSQL `ILIKE` across the same four sources |
| SMTP | Emailing high/critical escalations | Logged exactly as it would have been sent |

**`GET /health/services` reports which mode each adapter is actually in.** This
matters because silent degradation is the real risk: without it, a deployment
can look completely healthy while every document write lands in a fallback
table. Nothing in the platform assumes a cache hit or a reachable cluster.

## The 13 modules

| # | Module | Where it lives |
| --- | --- | --- |
| 1 | Authentication & role-based access | [`api/v1/auth.py`](backend/app/api/v1/auth.py), [`api/deps.py`](backend/app/api/deps.py) |
| 2 | Employee identity & profiles | [`api/v1/employees.py`](backend/app/api/v1/employees.py) |
| 3 | Activity monitoring engine | [`services/ingestion.py`](backend/app/services/ingestion.py), [`api/v1/activity.py`](backend/app/api/v1/activity.py) |
| 4 | Behavioural profiling engine | [`ml/baseline.py`](backend/app/ml/baseline.py), [`ml/features.py`](backend/app/ml/features.py) |
| 5 | Anomaly detection engine | [`ml/anomaly.py`](backend/app/ml/anomaly.py) |
| 6 | Insider risk scoring engine | [`ml/risk.py`](backend/app/ml/risk.py) |
| 7 | Threat investigation | [`services/investigations.py`](backend/app/services/investigations.py) |
| 8 | UEBA intelligence engine | [`ml/ueba.py`](backend/app/ml/ueba.py) |
| 9 | Alert & incident management | [`services/alerts.py`](backend/app/services/alerts.py) |
| 10 | Dashboards & analytics | [`services/dashboards.py`](backend/app/services/dashboards.py) |
| 11 | Notification & escalation | [`services/notifications.py`](backend/app/services/notifications.py) |
| 12 | Reports & export | [`services/reports.py`](backend/app/services/reports.py) |
| 13 | Integration, testing, deployment | [`tests/`](backend/tests), [`docker-compose.yml`](docker-compose.yml), [`ci.yml`](.github/workflows/ci.yml) |

## How detection works

**Five detection layers run over every employee-day**, each producing explainable findings:

1. **Rule detectors** — the eight anomaly categories from the specification: unusual login
   time, abnormal data download, unauthorised access attempts, excessive file transfers,
   suspicious device usage, data exfiltration, privilege abuse and access-pattern deviation.
2. **Statistical z-score** — each day compared against the employee's own baseline mean and
   spread. A finding needs both a high sigma *and* a materially larger absolute value, so
   ordinary day-to-day variance stays quiet.
3. **Isolation Forest** — a per-user unsupervised model over a 24-dimension daily feature
   vector, catching multivariate outliers no single rule describes.

4. **Peer group** — compares each employee against their department cohort, catching the
   employee whose *own* baseline is already bad. Capped below the critical band because it
   is circumstantial next to a direct policy hit.
5. **Supervised classifier** — an XGBoost model over the same 24-dimension vector, for the
   day where every individual signal sits just under its threshold but the combination
   resembles days that were escalated. It stays silent on any day another detector already
   flagged, so it adds leads rather than restating findings.

Each layer covers another's blind spot. Isolation Forest returns a score with no
explanation; the z-score explains but cannot see feature interactions; rules fire on policy
violations whatever the statistics say.

### About the classifier's labels

There is no ground truth for insider threat here — no organisation publishes
confirmed-betrayal labels, and the demo corpus is synthetic. The classifier is therefore
trained by **distillation**: an employee-day is labelled positive when the other four
detectors already judged it high or critical, or when an incident was opened on that
employee within the following week.

That makes it a model that generalises the combined judgement of the other detectors, which
is genuinely useful and is what its stored metrics measure. It is **not** evidence of
real-world predictive accuracy against actual insiders. `GET /api/v1/detection/model`
returns the label definition alongside the metrics so the distinction stays visible, and
the detector's confidence is capped at 0.65 — below every deterministic detector — because
a distilled label justifies a lead, not a conclusion.

Training refuses rather than producing a flattering but meaningless model: fewer than 60
employee-days or 8 positives and it declines with a reason. Until it has been trained, the
detector emits nothing and threat prediction falls back to the heuristic.

```bash
# after detection has run at least once
curl -X POST localhost:8000/api/v1/detection/train -H "Authorization: Bearer $TOKEN"
```

Two design decisions keep the queue usable:

- **Baselines hold back the live detection window** (7 days by default), so an attack in
  progress cannot quietly become part of the employee's normal.
- **Repeat detections roll up** into one open alert per employee per category, with an
  occurrence count, instead of flooding the analyst queue.

### The risk model

The weighted model from the specification, with each component normalised to 0-100 before
weighting:

| Component | Weight | Evidence |
| --- | --- | --- |
| Behavioural anomalies | 35% | Deviation findings, unusual login times, peer outliers |
| Privilege misuse indicators | 25% | Privilege changes, denied access, account posture, HR status |
| Data access violations | 20% | Exfiltration, bulk download, transfers, removable media volume |
| Access pattern deviations | 10% | Working-window and weekend departures |
| Historical security events | 10% | Prior incidents, decayed over a 90-day half-life |

Evidence decays with a 14-day half-life so recent behaviour dominates, and each component
saturates rather than growing without bound. Every score is fully explainable: the API
returns the raw components, the applied weights and a ranked list of contributing evidence.

## Design

The console ships **light and dark themes** with a three-way toggle in the header
(light / dark / follow system). The choice persists in `localStorage` and is stamped on
`<html>` before first paint, so there is no flash of the wrong theme on reload.

Every colour resolves through a CSS custom property, so a theme change is one attribute
on the root element rather than a class swap across the tree. Surfaces are warm neutrals
rather than blue-greys, structure comes from hairlines and type hierarchy instead of
boxes and shadows, and severity is always a coloured dot **plus its label** so hue never
carries meaning on its own.

Chart colours use a categorical palette validated for colour-vision deficiency in both
modes (worst adjacent CVD ΔE 9.1 light / 8.4 dark against an ≥8 target). Severity colours
are fixed across themes — a critical alert is the same red in both — and are deliberately
distinct from the categorical series so a status colour never impersonates a data series.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — components, data flow, schema
- [API reference](docs/API.md) — all 80 endpoints with examples
- [User guide](docs/USER_GUIDE.md) — the workflow for each role
- [Deployment](docs/DEPLOYMENT.md) — Docker, AWS and Azure

## Security notes

- Passwords are bcrypt-hashed; JWTs are signed with HS256 and expire in 60 minutes.
- Every state-changing action is written to an immutable audit log.
- RBAC is enforced server-side on every route — the console hides what a role cannot use,
  but the API is the authority.
- Permissive CORS applies to localhost **only in development**; production uses the
  explicit origin list.
- Set a strong `SECRET_KEY` and change every default password before deploying.

This platform monitors employee activity. Deploy it only where you have the legal basis and
policy approval to do so, and inform the workforce as your jurisdiction requires.
=======
# AI-Insider-Threat-BI
>>>>>>> 69748e7b0219eef0cfbd3ad525822153e0cf045c
