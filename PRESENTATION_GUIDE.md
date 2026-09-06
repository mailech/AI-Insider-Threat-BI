# Presentation Guide — Insider Threat Behavioral Intelligence System

## Before you present (do this 5 minutes early)

1. Open Docker Desktop, confirm it's running.
2. Open PowerShell, run:
   ```
   cd "C:\Users\misti\Downloads\insider-threat-system (1)\insider-threat-system"
   docker compose up
   ```
3. Open **4 browser tabs** ahead of time, logged into each role, so you can switch instantly instead of logging in live:
   - Tab 1: http://localhost:5173 → log in as `analyst@company.com`
   - Tab 2: same URL, different browser profile or incognito → `soc@company.com`
   - Tab 3: `manager@company.com`
   - Tab 4: `admin@company.com`
   - (If juggling 4 logins is annoying, it's fine to just log out/in live between sections — the app is fast.)
4. Also open a 5th tab: http://localhost:8000/docs (API documentation, for if anyone asks "is there a real backend?").

---

## The 60-second pitch (say this first)

> "Most security tools watch for outside hackers. This project watches for a different risk: people who already have legitimate access — employees — misusing it. It learns what normal behavior looks like for each employee, flags it when someone deviates from their own baseline, scores how risky that deviation is, and gives a security team the tools to investigate before it becomes a real data breach."

---

## Live walkthrough script

### 1. Show the login (10 sec)
"The system has role-based access — four roles, each sees a different dashboard tailored to their job." Log in as **Security Analyst**.

### 2. Analyst Dashboard
"This is what a security analyst sees first thing in the morning: open threat alerts, the top employees by risk score, and their investigation queue." Point at the alert list and risk score list.

### 3. Employees page → click a high-risk employee
"Let's drill into why someone is flagged." Click into whichever employee has the highest score.
- Point out the **risk score breakdown**: "It's not one number — it's five weighted factors: behavioral anomalies, privilege misuse, data access violations, access pattern deviations, and historical events."
- Point out **Recent Anomalies**: "unusual login time," "abnormal data download" — explain these are auto-detected.
- Point out **Activity Timeline**: "This is the raw evidence — you can see the actual events, like a 2am login or a download of an unusually large file."

### 4. SOC Dashboard (log out, log in as `soc@company.com`)
"The SOC engineer cares about volume and patterns across the whole company, not one person." Show the bar chart of anomalies by category, and the recent anomalies feed.

### 5. Alerts page
"When someone's risk crosses a threshold, the system automatically creates an alert." Show the alert list, click "Investigate" on one to demonstrate the workflow (open → investigating → resolved).

### 6. Incidents / Investigations page
"If an alert turns out to be serious, an analyst opens a case, and can log investigation notes as they build evidence." Create an incident live, or open an existing one and add a note.

### 7. Manager Dashboard (log in as `manager@company.com`)
"This is the executive view — organization-wide risk posture, a distribution of how many people are low/medium/high/critical risk, a 30-day trend, and one-click PDF/Excel export for compliance reporting." Click "Export PDF Report" live to show it downloads a real file.

### 8. Admin Dashboard (log in as `admin@company.com`)
"This is where the actual AI pipeline runs." Click **"Run Full Pipeline"** live and narrate while it runs:
> "This just did four things in sequence: rebuilt each employee's behavioral baseline from their activity history, ran anomaly detection — a mix of rule-based checks and a machine learning model called Isolation Forest — recomputed every employee's risk score using the weighted formula, and generated new alerts for anyone who crossed the risk threshold."

---

## If asked "how does the detection actually work?"

Explain in two layers:

**Layer 1 — Rule-based detection.** Specific, explainable checks: is this login at a wildly different hour than normal? Is this download volume way above their average? Are they touching a resource they don't normally touch, after hours? These map directly to the "Anomaly Categories" in the original spec (unusual login time, abnormal data download, unauthorized access attempts, excessive file transfers, suspicious device usage).

**Layer 2 — Machine learning.** An **Isolation Forest** model (from scikit-learn) looks at each employee's activity as a set of numeric features — hour of day, data volume, after-hours flag, remote flag — and learns what's "normal" for that specific person, flagging statistical outliers even if they don't match one of the hand-written rules. This catches subtler patterns a fixed rule might miss.

Both layers feed into the same weighted risk score:
```
Risk Score = 35% Behavioral Anomalies + 25% Privilege Misuse
           + 20% Data Access Violations + 10% Access Pattern Deviations
           + 10% Historical Security Events
```

## If asked "is this real data?"

Be upfront: "For this demo, I generated 45 days of synthetic activity for 25 employees, with 4 of them deliberately behaving anomalously, so the pipeline has real anomalies to catch. In production, this same pipeline would ingest real logs — Active Directory, VPN, email security, endpoint logs — instead of the synthetic generator."

## If asked about architecture / tech stack

- **Backend:** Python, FastAPI, PostgreSQL, SQLAlchemy
- **ML/Analytics:** scikit-learn (Isolation Forest), pandas, numpy
- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Auth:** JWT tokens, bcrypt password hashing, role-based access control
- **Deployment:** Docker + Docker Compose (one command spins up the database, API, and UI together)

## If something breaks live

Stay calm — say: "Let me just restart the pipeline / refresh" and either click **Run Full Pipeline** again on the Admin dashboard, or refresh the browser tab. If the whole app seems down, that's the one thing to avoid live-debugging in front of an audience — have a backup: screenshots or a short screen recording of a successful run, just in case.
