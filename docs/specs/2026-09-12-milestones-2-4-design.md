# Milestones 2–4 — Behavioural Intelligence, Risk, Investigation & Operations

**Branch** `Lakshmikanth-M` · **Date** 2026-09-12 · **Covers** modules 4–9, 11, 12, 13

Milestone 1 delivered modules 1–3 and a first cut of module 10. This spec covers
everything that remains: the behavioural analytics chain, insider risk scoring,
threat investigation, UEBA, alerting, notification, reporting, the four role
dashboards and production deployment.

## 1. Why this shape

Nine modules could be built as nine unrelated CRUD screens. They are not. They
form one pipeline, and every module is a stage in it:

```
activity_events                                   (module 3, exists)
   │
   ├─▶ ml/features        24 behavioural features per employee-day
   │
   ├─▶ services/profiling      baselines from a trailing window     (module 4)
   │
   ├─▶ services/detection      5 detectors → anomalies              (module 5)
   │
   ├─▶ services/scoring        35/25/20/10/10 weighted → risk_scores(module 6)
   │
   ├─▶ services/alerting       deduplicated, severity-graded alerts (module 9)
   │
   ├─▶ services/notifications  in-app + optional SMTP               (module 11)
   │
   └─▶ services/investigation  alert → incident, timeline, evidence (module 7)

    services/ueba reads the same feature vectors sideways           (module 8)
    services/reporting reads the outputs                            (module 12)
```

A single orchestrator, `services/pipeline.py`, runs profiling → detection →
scoring → alerting → notification in one transaction. Each stage is also
callable on its own, which is what makes the stages independently testable.

## 2. Reference implementations

`origin/main` (subha-sh-11) and `origin/mistika` (mistika-2006) are complete
independent implementations in this same repository. This design deliberately
adopts several of their decisions:

| Adopted | From | Why |
|---|---|---|
| 18 activity types | `origin/main` | Module 3 requires application-usage and network monitoring; 10 types cannot express either |
| `resource`/`application`/`sensitivity`/`is_external`/`is_removable_media` on events | `origin/main` | Detection quality is bounded by input richness |
| 5 detection methods | `origin/main` | Peer-group and classifier detection are separate signals, not variants of one |
| Time decay + saturation in scoring | `origin/main` | `1-exp(-x/k)` degrades gracefully where a hard clamp loses all ordering above the ceiling |
| HR context as a risk signal | `origin/main` | Notice-period and watchlist status are standard insider-threat programme inputs |
| Four separate role dashboards | `origin/mistika` | Module 10 specifies four distinct dashboards, not one with filters |

Their schemas are **not** compatible with this branch's (`event_time` vs
`timestamp`, `activity_type` vs `event_type`, lowercase vs uppercase enum
values, `app/api/deps.py` vs `app/core/deps.py`). This branch keeps its own
Milestone 1 conventions and reimplements against them.

## 3. Schema

### 3.1 Extensions to existing tables

`EventType` gains 8 members (10 → 18), preserving the existing `UPPER_SNAKE`
convention used by Milestone 1's frontend constants and tests:

```
FILE_ACCESS  FILE_DELETE  EMAIL_EXTERNAL  USB_FILE_COPY
APP_USAGE    NETWORK_CONNECTION  UNAUTHORIZED_ACCESS  VPN_SESSION
```

`EmployeeStatus` gains `NOTICE_PERIOD`.

`activity_events` gains:

| Column | Type | Purpose |
|---|---|---|
| `resource` | `String(255)` | File path, database, or URL touched |
| `application` | `String(120)` | Application-usage tracking |
| `sensitivity` | `SAEnum(DataSensitivity)` | Data-access-violation scoring |
| `is_external` | `Boolean` | Transfer left the organisation |
| `is_removable_media` | `Boolean` | USB / removable device |
| `is_weekend` | `Boolean` | Denormalised like `is_after_hours` |
| `success` | `Boolean` | Failed attempts feed unauthorised-access detection |

`employees` gains `is_privileged`, `on_watchlist`, `current_risk_score`,
`current_risk_band`, `risk_updated_at`. The last three are denormalised from
`risk_scores` so the employee list can sort by risk without a correlated
subquery per row.

### 3.2 New tables

| Table | Module | Notes |
|---|---|---|
| `behavior_baselines` | 4 | One row per employee: per-feature mean/stddev, hourly histogram, sample size, window bounds |
| `peer_group_stats` | 8 | Per department × privilege-tier feature means, for peer comparison |
| `anomalies` | 5 | `detector`, `category`, `severity`, `score`, `confidence`, `explanation`, `evidence` JSON, `is_false_positive` |
| `risk_scores` | 6 | Time series. Five weighted components, `raw_components`, `contributing_factors`, `trend`, `window_days` |
| `alerts` | 9 | `severity`, `status`, `assigned_to`, `dedup_key`, `occurrence_count`, FK to anomaly |
| `incidents` | 7 | `reference` (INC-YYYY-NNNN), `status`, `outcome`, `severity`, `assigned_to`, `opened_at`, `closed_at` |
| `incident_links` | 7 | Join table binding incidents to alerts, anomalies and activity events |
| `notifications` | 11 | `type`, `severity`, `is_read`, `user_id`, `link` |
| `reports` | 12 | Generated-artifact metadata: `type`, `format`, `parameters`, `file_path`, `generated_by` |
| `audit_logs` | 10/admin | Actor, action, target, timestamp — admin dashboard audit view |

### 3.3 Datastore responsibilities

| Store | Owns | Fallback when absent |
|---|---|---|
| PostgreSQL | Everything above | — (required) |
| MongoDB | Case notes, evidence documents, investigation timelines, notification delivery log | Postgres JSON table |
| Redis | Dashboard aggregates, risk-score cache | In-process TTL dict |
| OpenSearch | Full-text search over events, alerts, case notes | Postgres `ILIKE` |

Mongo, Redis and OpenSearch are each probed once at startup. Absence is logged,
never fatal. `GET /health/services` reports which backends are live and which
are running on fallback, so a demo never silently looks healthy while degraded.
This keeps `pytest` and bare `uvicorn` working with zero containers.

## 4. The 24 features

Computed per employee per day from `activity_events`, in `ml/features.py`:

```
event_count            login_count           failed_login_count
download_count         upload_count          download_mb
upload_mb              email_count           external_email_count
usb_event_count        usb_mb                unauthorized_attempts
privilege_changes      remote_sessions       distinct_devices
distinct_resources     distinct_applications after_hours_ratio
weekend_flag           mean_hour             hour_spread
sensitive_access_count external_transfer_mb  night_activity_count
```

`FEATURE_NAMES` is an ordered list. Profiling, all five detectors, scoring and
UEBA consume it — one definition, four consumers. Changing the order changes
the model input, so persisted model artifacts record the feature names they
were trained on and refuse to score against a mismatched vector.

## 5. Detection (module 5)

Five detectors write to one `anomalies` table, distinguished by `detector`:

| Detector | Method | Produces |
|---|---|---|
| `RULE` | Deterministic policy checks | Unauthorised access, privilege abuse, mass USB copy, sensitive-data egress |
| `ISOLATION_FOREST` | Unsupervised, 24 features | Unusual *combinations* no rule anticipates |
| `STATISTICAL_ZSCORE` | Per-feature z-score vs. the employee's own baseline | The human-readable "3.4σ above this person's normal download volume" |
| `PEER_GROUP` | Deviation from department × privilege-tier mean | "Normal for them, abnormal for their team" |
| `ML_CLASSIFIER` | XGBoost probability | Ranked likelihood, trained on labels derived from confirmed incidents |

Rationale for keeping all five rather than one: IsolationForest returns a score
with no explanation, z-score explains but cannot see feature interactions,
rules catch policy violations regardless of statistics, and peer comparison
catches the employee whose *own* baseline is already bad. Each covers another's
blind spot. Detector agreement is surfaced in the UI.

### Anomaly categories

The doc's six named categories, plus five the engine produces:

```
UNUSUAL_LOGIN_TIME  ABNORMAL_DATA_DOWNLOAD  UNAUTHORIZED_ACCESS_ATTEMPT
EXCESSIVE_FILE_TRANSFER  SUSPICIOUS_DEVICE_USAGE  INSIDER_RISK_INDICATOR
DATA_EXFILTRATION  PRIVILEGE_ABUSE  ACCESS_PATTERN_DEVIATION
BEHAVIORAL_DEVIATION  PEER_GROUP_OUTLIER
```

## 6. Risk scoring (module 6)

The doc's model, implemented literally:

```
Insider Risk Score = 0.35 · behavioural_anomalies
                   + 0.25 · privilege_misuse
                   + 0.20 · data_access_violations
                   + 0.10 · access_pattern_deviations
                   + 0.10 · historical_security_events
```

Each component is normalised to 0–100 before weighting, so the total is
directly comparable across employees and across time.

Two refinements, both adopted from `origin/main`:

- **Time decay.** Evidence contributes `0.5^(age_days / half_life)`, with a
  14-day half-life for anomalies and 90-day for historical incidents. A
  six-month-old anomaly should not weigh the same as yesterday's.
- **Saturation.** Component totals pass through `100·(1-exp(-total/k))` rather
  than `min(total, 100)`. A hard clamp makes every sufficiently-bad employee
  look identical; saturation preserves ordering all the way up.

Bands are configurable thresholds, defaulting to Low `<25`, Medium `25–50`,
High `50–75`, Critical `≥75`.

Every score persists its `contributing_factors` — the ranked list of anomalies
and events that produced it. A risk score an analyst cannot explain to the
employee's manager is not usable, so the explanation is stored, not recomputed.

## 7. Modules 7–12 in brief

**Investigation (7).** An analyst promotes one or more alerts into an incident.
The incident assembles a merged timeline (activity events, anomalies, alerts,
analyst notes) ordered by time, a correlation view of other employees touching
the same resources in the window, and an evidence locker in Mongo. Incidents
carry an `outcome`, which feeds back into the historical-events risk component.

**UEBA (8).** Peer groups are department × privilege tier. The engine computes
per-group feature means, per-employee deviation, a 7/14/30-day risk trend
slope, and an XGBoost threat probability.

**Alerting (9).** Anomalies above a severity threshold generate alerts.
Deduplication is by `dedup_key = (employee, category, day)` — a repeat
increments `occurrence_count` rather than creating a second alert, which is
what keeps the queue readable. Five severity levels; escalation moves an alert
to a manager and raises a notification.

**Notification (11).** Rows in `notifications`, an unread badge, and a
notifications page. `SMTP_ENABLED` defaults to false; when off, the sender logs
the message it would have sent instead of failing.

**Reports (12).** Five report types × PDF (`reportlab`) and Excel (`openpyxl`).
Generation is synchronous and streams the file back; metadata persists in
`reports`.

**Dashboards (10).** `/` dispatches by role to Analyst, SOC, Manager or Admin,
each with the panels the doc names for it.

## 8. Frontend

New pages: `/anomalies`, `/risk`, `/alerts`, `/incidents`, `/incidents/:id`,
`/ueba`, `/notifications`, `/reports`. `/employees/:id` gains a risk panel with
baseline-vs-actual and peer-comparison charts.

Charting follows Milestone 1's established constraint: single-hue series, no
categorical palette, severity never carried by colour alone — every severity
badge pairs a glyph with its colour, as `SEVERITY_STYLES` already does.

## 9. Testing

- `ml/features` — deterministic vectors from fixed event fixtures
- `services/profiling` — baseline maths against hand-computed values
- `services/detection` — each detector fires on a planted positive and stays
  silent on a planted negative
- `services/scoring` — the five weights sum correctly; decay and saturation
  behave at boundaries
- `services/alerting` — deduplication collapses repeats
- RBAC — every new endpoint rejects every role that should not reach it
- Reports — generated PDF and XLSX open and are non-empty
- Frontend — vitest for new components

## 10. Deployment (module 13)

`docker compose up` runs Postgres, Mongo, Redis, API and web. OpenSearch and
its dashboard sit behind `--profile search` so the default startup stays light.
GitHub Actions runs pytest, vitest and both image builds.

## 11. Known limitations, stated plainly

- **The XGBoost classifier trains on labels derived from seeded data.** With no
  ground-truth insider incidents, its probabilities demonstrate the mechanism,
  not real-world predictive accuracy. The README and the UI both say so.
- **The mentor's `insider_threat_model.pkl` is not in this repository** — only
  the email describing it. `ml/detector.py` loads a joblib bundle when one is
  present and otherwise trains a fresh multi-feature IsolationForest. This
  follows that email's own recommendation to retrain for multi-feature use.
- **Baselines need history.** An employee with fewer than 7 active days gets no
  baseline, and z-score detection abstains rather than inventing a threshold.
