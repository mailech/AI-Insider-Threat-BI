# User guide

## Signing in

Open the console (http://localhost in Docker, http://localhost:5173 in development) and
sign in. On a seeded demo the login page lists four demo accounts — click one to fill the
form. Your role decides which navigation items and dashboard you get.

## Security Analyst

Your day starts on the **Dashboard**: open alerts, critical alerts in the last 24 hours,
your open investigations, high-risk employees and current MTTD.

**Working the queue**

1. **Threat Alerts** is sorted by priority (P1 is highest). Priority combines severity with
   the employee's insider risk score, so a medium finding on a high-risk employee outranks
   a medium finding on someone unremarkable.
2. A `x4` badge means the alert represents four detections of the same behaviour. One entry,
   not four.
3. Use the tick to **acknowledge** (you have seen it) and the folder icon to **open an
   investigation** — that links the alert, pulls in related anomalies and builds the
   threat timeline in one step.

**Triaging anomalies**

**Anomalies** lists every detection, including the low-severity ones that never raised an
alert. Click a row for the full detail: the anomaly score, the confidence, the sigma
deviation, the observed value against the baseline, and the exact features that fired.
Then mark it a **true positive** or a **false positive** — false positives are excluded
from future risk scoring, so this directly tunes the system.

**Reading an employee**

Open any employee for five tabs:

- **Overview** — risk score, event volume, open anomalies and incidents, devices, risk trend.
- **Risk breakdown** — the weighted model laid out: each component's raw 0-100 score, its
  weight, its contribution in points, and a ranked table of the evidence behind it. This is
  what you cite when someone asks *why* a person scores 70.
- **Baseline** — their established normal: typical login hour, working window, daily volumes,
  after-hours share, plus device, application and resource profiles and an hourly histogram.
- **Activity** — the raw event timeline, flagged `AFTER-HOURS`, `EXTERNAL`, `USB`, `FAILED`
  and `RESTRICTED`.
- **Anomalies** — every detection for that person.

## SOC Engineer

The **SOC Dashboard** covers the whole estate: 24-hour event and anomaly volume, a 14-day
timeline of events, anomalies and alerts, the alert severity mix, the newest behavioural
anomalies and the current detection metrics.

**Bringing in data** — on **Activity Monitor**, *Upload CSV logs* accepts SIEM, CERT and
LANL-style exports. Column names are mapped automatically (`user`, `pc`, `filename`, `size`,
`date` and similar), and ingestion runs detection, scoring and alerting in the same call.
The result tells you how many events landed, how many were skipped and why.

**Running the engines** — from **Anomalies** or **Behaviour Analytics**:

- *Rebuild baselines* recomputes every employee's behavioural profile and the peer groups.
  Run this after a large backfill, or on a weekly schedule.
- *Run detection* re-runs all four detector layers, rescores risk and raises alerts. It is
  idempotent — the same finding is never recorded twice.

New employees need at least 25 events before a baseline can be built; until then they are
covered by the rule detectors only.

## Security Manager

The **Security Manager Dashboard** answers the questions leadership asks:

- **Organisational risk posture** — `stable`, `guarded` or `elevated`, with the average score
  and the share of the workforce in the high and critical bands.
- **Risk trend** — the organisation-wide average over time.
- **Risk by department** — average risk and high-risk headcount side by side.
- **Compliance metrics** — monitoring coverage, baseline quality, anomaly review rate,
  incident closure rate and 30-day audit volume.

Use **Reports** to produce board- and audit-ready output. Pick a report, choose a window,
review the preview, then export to PDF (formatted, colour-coded by severity) or Excel
(one sheet per table, filterable, with the full data set rather than the first 120 rows).

## Administrator

**Administration** has three tabs:

- **Users** — create accounts, change roles inline, disable and re-enable access. Accounts are
  never hard-deleted, so the audit trail stays intact. You cannot disable your own account.
- **Audit trail** — every state-changing action with actor, entity, detail and source IP.
- **System** — health and platform counters.

Administrators also reach every other role's dashboard.

## Running an investigation

The investigation workspace is one screen with everything an analyst needs:

- **Threat timeline** — anomalies, alerts, correlated activity and analyst actions in one
  chronological thread.
- **Linked alerts** — what triggered the case.
- **Evidence chain** — each item carries a SHA-256 hash, so you can show it has not changed.
- **Device analysis** — per-device event counts, data volume and after-hours activity.
- **Correlated activity** — the highest-signal events around the detection window, ranked by
  a signal score that weights external transfers, removable media, off-hours use, failures
  and sensitive-data access.
- **Employee risk history** — how their score moved.
- **Investigator notes** — a threaded record; every note also lands on the timeline.

**Workflow**

```
open → investigating → escalated → contained → resolved → closed
                     ↘ false_positive ↗
```

Only valid transitions are offered, and the server rejects anything else. Moving off `open`
stamps the first-response time and moving to `resolved` stamps the resolution time — that is
what makes MTTI and MTTR real numbers rather than estimates.

**Escalation** hands the case to a named manager with a reason. They are notified in-app
immediately, and the case is flagged as escalated in every queue.

## Notifications

The bell shows unread count and streams live over a WebSocket — new alerts appear without a
refresh. The dot at the bottom of the sidebar tells you whether that stream is connected.
Notifications route by role: analysts and SOC engineers get threat alerts, managers get
high and critical alerts plus escalations, and everyone gets what is assigned to them.

## Interpreting a risk score

| Band | Score | What it means |
| --- | --- | --- |
| Low | 0–34 | Behaving within their own baseline |
| Medium | 35–59 | Notable deviations; worth a look |
| High | 60–79 | Multiple corroborating signals; investigate |
| Critical | 80–100 | Strong, converging evidence; act now |

A score is never a verdict. It is a ranked, explainable summary of the evidence — always open
the risk breakdown and read the contributing factors before acting on a person.
