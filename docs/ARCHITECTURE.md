# Architecture

## System overview

```
                        ┌──────────────────────────────────────────┐
   Security log         │            React Console (nginx)         │
   sources              │  Analyst · SOC · Manager · Admin views   │
   ─────────────        └───────────────┬──────────────────────────┘
   Active Directory                     │ HTTPS (JWT) + WebSocket
   Windows Event                        ▼
   Linux Audit          ┌──────────────────────────────────────────┐
   VPN / Firewall  ───▶ │              FastAPI API                 │
   Email Security       │  auth · RBAC · routers · services · ML   │
   Endpoint / DLP       └───┬───────────────┬──────────────────┬───┘
   Proxy                    │               │                  │
                            ▼               ▼                  ▼
                     ┌────────────┐  ┌────────────┐   ┌──────────────┐
                     │ PostgreSQL │  │  MongoDB   │   │ Model store  │
                     │ (primary)  │  │ (raw logs) │   │ (joblib)     │
                     └────────────┘  └────────────┘   └──────────────┘
```

## Request path

1. **Ingestion** — `POST /activity/ingest` or a CSV upload. `services/ingestion.py`
   normalises vocabularies (CERT `logon`, Windows event ID `4625`, DLP `file_copy` …),
   resolves the employee, derives flags (after-hours, weekend, external, removable media)
   and persists `ActivityEvent` rows.
2. **Profiling** — `ml/baseline.py` groups events into employee-days, computes a 24-feature
   vector per day, and stores mean/spread statistics plus device, application, resource and
   hourly profiles. It trains a per-user Isolation Forest and writes it to the model store.
3. **Detection** — `ml/anomaly.py` runs rule, z-score, Isolation Forest and peer-group
   detectors over each day, de-duplicating by (employee, category, method, day).
4. **Scoring** — `ml/risk.py` aggregates decayed, severity-weighted evidence into the five
   weighted components and writes a `RiskScore` snapshot.
5. **Alerting** — `services/alerts.py` raises alerts for medium-and-above findings, rolling
   repeats into an existing open alert.
6. **Notification** — `services/notifications.py` fans out to roles and pushes over the
   WebSocket so consoles update without polling.
7. **Investigation** — `services/investigations.py` builds the threat timeline from
   anomalies, alerts and the highest-signal correlated activity, hashes evidence and
   enforces the workflow state machine.

## Data model

| Table | Purpose |
| --- | --- |
| `users` | Console accounts, role, auth provider |
| `departments`, `employees`, `assets` | Monitored identity, org structure, devices |
| `activity_events` | Normalised monitored activity (indexed by employee+time) |
| `behavior_baselines` | Per-employee behavioural statistics and model pointer |
| `peer_group_stats` | Aggregated department behaviour for UEBA comparison |
| `anomalies` | Detector findings with score, sigma, method and evidence |
| `risk_scores` | Weighted risk snapshots over time |
| `alerts` | Analyst queue entries with priority and roll-up count |
| `incidents`, `incident_timeline`, `incident_evidence`, `incident_notes` | Investigations |
| `notifications` | Per-user in-app inbox |
| `audit_logs` | Immutable record of every state-changing action |

## Workflow state machine

```
open ──▶ investigating ──▶ escalated ──▶ contained ──▶ resolved ──▶ closed
  │            │                              ▲            ▲
  └────────────┴──────▶ false_positive ───────┘            │
                                │                          │
                                └──────────────────────────┘
```

Transitions are validated server-side (`services/investigations.py::TRANSITIONS`); an
invalid move returns `409 Conflict`. First-response and resolution timestamps are stamped
automatically, which is what makes MTTI and MTTR measurable.

## Feature vector

Twenty-four features per employee-day drive the statistical and ML layers:

event count · login count · failed logins · downloads · uploads · download MB · upload MB ·
emails · external emails · USB events · USB MB · unauthorised attempts · privilege changes ·
remote sessions · distinct devices · distinct resources · distinct applications ·
after-hours ratio · weekend flag · mean hour · hour spread · sensitive access ·
external transfer MB · night activity

## Scaling notes

- `activity_events` carries composite indexes on `(employee_id, event_time)` and
  `(activity_type, event_time)`; partition by month once it passes ~100M rows.
- Detection is per-employee and embarrassingly parallel — shard by employee ID across
  workers, or move it onto a Celery/RQ queue backed by the bundled Redis.
- Per-user models are small joblib artefacts; move the model store to S3 or Azure Blob when
  running more than one API replica.
- MongoDB and OpenSearch hold raw log volume so PostgreSQL stays the analytics store.
