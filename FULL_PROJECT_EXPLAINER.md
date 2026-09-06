# Complete Walkthrough: Insider Threat Behavioral Intelligence System
### Every component, start to end, explained simply

---

## PART 1: THE BIG PICTURE

### What problem are we solving?
Companies get hacked from outside all the time — that's well known. But a huge amount of damage also comes from **insiders**: employees, contractors, or admins who already have legitimate access, and either misuse it on purpose or get compromised (e.g., their account gets stolen). Because they're using "normal" access, traditional firewalls and antivirus tools don't catch them.

This project builds a system that watches employee behavior over time, learns what's normal for each person, and raises a flag the moment something looks abnormal — before it turns into a data breach, leak, or sabotage.

### The journey of one piece of data, start to end
To understand the whole system, follow a single event through it:

1. An employee downloads a large file at 2am. → **Activity Event** gets recorded.
2. The system compares this to that employee's **Behavioral Baseline** (their personal "normal").
3. It's way outside normal → an **Anomaly** gets created ("abnormal data download," "unusual login time").
4. The anomaly feeds into that employee's **Risk Score** (a 0–100 number).
5. If the score crosses a threshold → an **Alert** is automatically generated.
6. A security analyst sees the alert on their **Dashboard**, opens it, and can create an **Incident** to investigate further, adding notes as they dig in.
7. A manager can later pull a **Report** (PDF/Excel) summarizing risk across the whole company.

Every component below exists to support one step of that journey.

---

## PART 2: THE DATABASE — WHAT INFORMATION IS STORED

Think of the database as filing cabinets. There are 9 "cabinets" (tables):

| Table | What it stores | Real-world analogy |
|---|---|---|
| **Users** | Login accounts for the security team (analysts, SOC engineers, managers, admins) | The staff badges of the people *using* the system |
| **Employees** | Company staff being monitored — name, department, manager, devices, access level | An HR record |
| **ActivityEvents** | Every logged action — logins, downloads, uploads, emails, privilege changes, USB use | Security camera footage, timestamped |
| **BehaviorBaselines** | The "normal" pattern calculated for each employee (average login time, average data volume, etc.) | A doctor's chart of your normal heart rate, so they know what's abnormal for *you* |
| **Anomalies** | Specific flagged events that broke the pattern | A note in a case file: "flagged — logged in at 3am" |
| **RiskScores** | The computed 0–100 risk number per employee, broken into 5 weighted factors | A credit score, but for insider risk |
| **Alerts** | Auto-generated warnings when risk crosses a threshold | A smoke alarm going off |
| **Incidents** | Formal investigation cases opened by analysts | A detective's case file |
| **InvestigationNotes** | Notes attached to an incident as it's investigated | The detective's notebook entries |

---

## PART 3: THE BACKEND (the "brain" — does all the thinking)

The backend is built with **Python** and a framework called **FastAPI**. Think of the backend as a factory with different departments (modules). Here's what each one does:

### 3.1 Authentication & Access Control
**What it does:** Controls who can log in and what they're allowed to see/do.
**How:** Passwords are never stored in plain text — they're scrambled ("hashed") using a method called bcrypt, so even if someone stole the database, they couldn't read passwords. When you log in successfully, you get a digital token (JWT) — like a wristband at a concert — that proves who you are on every subsequent request, without needing to type your password again.
**4 roles**, each with different permissions: Security Analyst, SOC Engineer, Security Manager, Administrator.

### 3.2 Employee Profile Management
**What it does:** Stores and manages the employee records being monitored — name, department, job title, manager, which devices they use, and what systems they're allowed to access.

### 3.3 Activity Monitoring Engine
**What it does:** The "recording" layer. Every action an employee takes (in a real deployment: pulled from log sources like Active Directory, VPN logs, email systems) gets saved as an Activity Event — what happened, when, from where, how much data was involved.

### 3.4 Behavioral Profiling Engine
**What it does:** Looks at an employee's history and calculates their personal "normal": average login hour, how much they usually vary from that, how many actions they typically do per day, average data volume moved. This baseline is recalculated periodically as new data comes in.
**Why it matters:** Without a personal baseline, you can't tell what's "unusual" — everyone's job is different.

### 3.5 Anomaly Detection Engine — the two-layer detective
This is the core "smart" part. It works in two layers:

**Layer 1 — Rule-based detection.** Simple, explainable if-this-then-flag logic:
- Login hour way outside their normal pattern → "unusual login time"
- Data downloaded far beyond their average → "abnormal data download" / "excessive file transfer"
- A privilege/permission change → "unauthorized access attempt"
- Touching a sensitive resource (payroll, customer data, source code) after hours → "suspicious device usage"

**Layer 2 — Machine learning (Isolation Forest).** This is a real ML model from the scikit-learn library. Instead of fixed rules, it looks at combinations of numbers (hour of day, data volume, remote access, after-hours) for each employee and learns to spot outliers automatically — catching weird combinations a human-written rule might miss.

Both layers write their findings into the Anomalies table.

### 3.6 Insider Risk Scoring Engine
**What it does:** Takes all the anomalies for an employee and turns them into ONE number (0–100), using a weighted formula:

```
Risk Score =
   35% × Behavioral Anomalies      (unusual patterns, odd hours)
 + 25% × Privilege Misuse           (unauthorized access attempts)
 + 20% × Data Access Violations     (abnormal downloads/transfers)
 + 10% × Access Pattern Deviations  (suspicious device/resource use)
 + 10% × Historical Security Events (track record over time)
```
The final number gets a label: **Low (0–24) / Medium (25–49) / High (50–74) / Critical (75–100)**.
**Why weighted, not just a count?** Not all bad behavior is equal — someone trying to escalate their own privileges (25% weight) is more serious than one slightly-late login (part of the 35% behavioral bucket, averaged with everything else).

### 3.7 Alert & Incident Management
**What it does:** Once an employee's risk score crosses a threshold, an alert is generated automatically — no human has to manually check every employee every day. Alerts have a severity (informational → critical) and a status (open → investigating → resolved/dismissed) that an analyst updates as they work the case.

### 3.8 Threat Investigation Module
**What it does:** Lets analysts formally open an "incident" tied to a suspicious employee, review their full activity timeline as evidence, and log investigation notes — building a paper trail, like a detective's case file.

### 3.9 UEBA Intelligence (User & Entity Behavior Analytics)
**What it does:** The umbrella term for "compare a person's behavior to patterns" — this is really the combination of the Behavioral Profiling Engine + Anomaly Detection working together. It's an industry-standard term for this category of security tool (products like Microsoft, Splunk, and Exabeam sell "UEBA" tools that do the same core thing).

### 3.10 Dashboards & Analytics (backend side)
**What it does:** Pre-packages the right data for each role so the frontend doesn't have to calculate things itself. For example, the Manager dashboard endpoint calculates "average risk score across the whole company" and "how many people are in each risk category" on the server, then just hands the frontend a clean summary.

### 3.11 Reports & Export
**What it does:** Generates downloadable PDF and Excel files summarizing insider risk — useful for compliance, board meetings, or handing to leadership who don't want to log into the dashboard.

---

## PART 4: THE FRONTEND (what you actually see and click)

Built with **React** (a JavaScript framework for building interactive web pages) and styled with **Tailwind CSS**. This is the part running in your browser at localhost:5173.

### 4.1 Login Page
The front door — pick a role, log in, get routed to the right dashboard automatically.

### 4.2 Security Analyst Dashboard
**Audience:** the person triaging day-to-day. Shows: open threat alerts, top employees by risk score, and how many cases are in their investigation queue.

### 4.3 SOC (Security Operations Center) Dashboard
**Audience:** the person watching overall security event volume. Shows: how many events happened in the last 7 days, a chart of anomalies broken down by category, and a live feed of the most recent anomalies detected.

### 4.4 Security Manager Dashboard
**Audience:** leadership. Shows: company-wide risk posture (average score, how many people are low/medium/high/critical), a 30-day risk trend line, and buttons to export PDF/Excel reports.

### 4.5 Administrator Dashboard
**Audience:** the person running the platform. Shows: system-wide totals (users, employees, events, anomalies, alerts) and has the **"Run Full Pipeline"** button — this is the button that manually triggers the whole brain (baseline → anomaly detection → risk scoring → alerts) to run again on current data.

### 4.6 Employees Page
Pick any employee and see their full profile: risk score breakdown (all 5 weighted factors), their list of detected anomalies, and their raw activity timeline — the actual evidence behind the score.

### 4.7 Alerts Page
A table of all alerts with buttons to mark them as "investigating," "resolved," or "dismissed" — this is the workflow an analyst follows to triage.

### 4.8 Incidents / Investigations Page
Create a new case tied to an employee, and add investigation notes over time as you gather more evidence.

---

## PART 5: HOW IT ALL CONNECTS (the plumbing)

- **Database (PostgreSQL):** the permanent storage — everything above lives here.
- **Backend (FastAPI, Python):** the brain — runs the logic, talks to the database, exposes an API (a set of URLs the frontend can call to get/send data).
- **Frontend (React):** the face — the part you click on, which calls the backend's API behind the scenes to get data and show it as charts, tables, and buttons.
- **Docker:** the packaging. Instead of installing Python, Node.js, and PostgreSQL separately and hoping they all work together, Docker bundles each piece into its own "container" — a self-contained mini-computer — and `docker compose up` starts all three containers together with one command. This is why the whole thing "just works" on any machine with Docker installed.

---

## PART 6: THE DEMO DATA (what you're actually looking at right now)

Since there's no real company feeding this system real logs, I wrote a **seed script** that generates realistic fake data so the whole pipeline has something to work on:
- 25 fake employees across 6 departments
- 45 days of activity (~5,600 events) — logins, downloads, emails, privilege changes, etc.
- 4 of those 25 employees were deliberately given suspicious behavior patterns (odd-hour logins, oversized downloads, access to sensitive files) — these are the ones that should show up as High/Critical risk, proving the detection actually works rather than just returning random numbers.

In a real deployment, this seed script would be replaced by real log ingestion — pulling from Active Directory, VPN logs, email security systems, etc.

---

## PART 7: ONE-LINE SUMMARY OF EVERY PIECE (for quick reference)

| Component | One-line job |
|---|---|
| Users table | Who's allowed to use the security tool |
| Employees table | Who's being monitored |
| ActivityEvents table | What everyone actually did |
| BehaviorBaselines | What "normal" looks like per person |
| Anomalies | Specific flagged abnormal actions |
| RiskScores | One number summarizing how risky someone is |
| Alerts | Auto-generated warnings |
| Incidents/Notes | Formal investigation case files |
| Auth module | Login & permissions |
| Baseline service | Calculates "normal" |
| Anomaly service | Detects abnormal (rules + ML) |
| Risk service | Turns anomalies into a score |
| Alert service | Creates warnings automatically |
| Dashboards | Role-specific summarized views |
| Reports | Downloadable PDF/Excel summaries |
| React frontend | What you see and click |
| FastAPI backend | The logic that powers it all |
| PostgreSQL | Where everything is stored |
| Docker | Packages and runs everything together |

---

## Suggested presentation flow using this document

1. Start with **Part 1** (the problem + the journey of one event) — this is your hook.
2. Use **Part 2** to briefly show you understand data modeling (mention it, don't read every row).
3. Use **Part 3** as your main content — walk through each engine while showing the matching screen in the live app.
4. Use **Part 4** while clicking through the actual dashboards.
5. Close with **Part 6** — be transparent that the data is synthetic/demo data, and explain how it would plug into real systems.
6. Keep **Part 7** open as your own cheat sheet in case you blank on a term mid-question.
