# 🛡️ INSIDER/IQ
### *Insider Threat Behavioral Intelligence System*

<p>
  <img src="https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=next.js&logoColor=c5ff4a" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-000000?style=for-the-badge&logo=typescript&logoColor=c5ff4a" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-000000?style=for-the-badge&logo=tailwindcss&logoColor=c5ff4a" alt="Tailwind" />
  <img src="https://img.shields.io/badge/RECHARTS-000000?style=for-the-badge&logo=chartdotjs&logoColor=c5ff4a" alt="Recharts" />
</p>

<p>
  <img src="https://img.shields.io/badge/MILESTONE_1-COMPLETE-c5ff4a?style=flat-square" alt="M1" />
  <img src="https://img.shields.io/badge/MILESTONE_2-COMPLETE-c5ff4a?style=flat-square" alt="M2" />
  <img src="https://img.shields.io/badge/MILESTONE_3-PLANNED-1f1f1f?style=flat-square" alt="M3" />
  <img src="https://img.shields.io/badge/MILESTONE_4-PLANNED-1f1f1f?style=flat-square" alt="M4" />
</p>

> A SOC-grade behavioral intelligence platform that watches for the threat already inside the perimeter — the compromised credential, the disgruntled employee, the quiet privilege escalation nobody flagged.

---

## `[ WHY THIS EXISTS ]`

Most security tooling watches the outside world. **INSIDER/IQ watches the inside one.**

It centralizes employee identity, cross-platform activity telemetry, individual behavioral baselines, and anomaly detection into a single command surface — built so a SOC analyst can go from *"something feels off about this employee"* to *"here is exactly what changed, when, and by how much"* in under three clicks.

---

## `[ MILESTONE PROGRESS ]`

| # | Milestone | Status | What it delivers |
|:-:|---|:-:|---|
| 01 | **Foundation & Identity** | `✅ COMPLETE` | Design system · Auth & RBAC · Employee identity management · Activity log ingestion |
| 02 | **Behavioral Intelligence** | `✅ COMPLETE` | Behavioral profiling engine · Anomaly detection engine · Security overview dashboard |
| 03 | **Risk Scoring** | `🔜 PLANNED` | Weighted 0–100 threat index · Fleet-wide risk aggregation · Departmental exposure rankings |
| 04 | **Response & Reporting** | `🔜 PLANNED` | Case management · Alert escalation workflows · PDF/Excel export |

**Overall completion: 2 / 4 milestones — 50% of the full system roadmap.**

---

## `[ WHAT'S LIVE RIGHT NOW ]`

### 🔐 Authentication & Access Control
Four-role RBAC system (Administrator, Security Manager, SOC Engineer, Security Analyst) enforced at both the navigation layer *and* the route layer — not just hidden buttons. Simulated JWT session handling with in-memory storage, silent refresh, and forced expiry, built to mirror real production auth behavior even ahead of a live backend.

### 🧑💼 Employee Identity Management
Full onboarding workflow, department mapping, device/asset association, and a searchable, filterable directory — the system of record every downstream engine (behavioral profiling, anomaly detection) reads from.

### 📡 Unified Activity Monitoring
Ingestion configuration and a live raw-feed viewer across **eight log source types** — Active Directory, Windows Event Logs, Linux Audit, VPN, Firewall, Email Security, Endpoint Security, and DNS/NetFlow — with mocked connection testing (loading → success/failure states, not just a happy path).

### 🧠 Behavioral Profiling Engine
Every monitored employee gets a generated behavioral baseline: typical login windows, work-pattern distribution, device usage, access patterns, and productivity trends — visualized per-profile and built to expose *deviation*, not just raw activity.

### ⚠️ Anomaly Detection Engine
Fleet-wide detection across four categories — behavioral, access, data exfiltration, and privilege abuse — with severity classification, deviation-magnitude detail (*"3.2x normal data transfer volume"*), and **direct cross-referencing back to the raw activity logs that triggered the flag.** Full filter/status/review workflow, role-gated so only elevated roles can confirm or dismiss a finding.

### 📊 Security Overview Dashboard
The operator's command center on login: fleet KPI summary, a live risk-density gauge, a 7-day anomaly trend line, a real-time anomaly feed, and departmental exposure breakdown — all rendered from the same mock data layer that powers every other screen, so nothing here is decorative.

---

## `[ DESIGN LANGUAGE: ENCRYPTED TERMINAL ]`

Most dashboards drown operators in color-coded noise. This one doesn't.

```
█ Void Black    #000000   →  floor
█ Carbon        #060606   →  canvas
█ Onyx          #1f1f1f   →  surface
█ Graphite      #252525   →  raised
█ Iron          #313131   →  hover
░ Signal Lime   #c5ff4a   →  THE accent — and only the accent
```

One accent color across the entire application. No blue for "info," no red for "danger," no color-coded severity soup — status is communicated through iconography, typography weight, and text labels instead. The single, narrowly-scoped exception (a desaturated amber, confined strictly to form and toast validation errors) is documented and enforced by design, not by accident — verified against the full codebase, not assumed.

Typography carries its own hierarchy: **PT Serif** (light weight only) for display moments, **Inter Tight** for every interface element, **JetBrains Mono** for anything technical — IDs, timestamps, IPs, device hashes. Sharp 0px card corners throughout; the only curves in the entire system are pills and the risk gauge.

---

## `[ ARCHITECTURE ]`

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Modern routing, server/client component split |
| Language | TypeScript | Type-safe contracts across the whole data model |
| Styling | Tailwind CSS 4 | Enforced design tokens, zero one-off CSS |
| Charts | Recharts | Trend lines, risk gauge, work-pattern visualizations |
| Icons | Lucide React | Monochrome-only iconography, no exceptions |

**The mock API layer is a deliberate engineering decision, not a placeholder.** Every function in `lib/api/client.ts` — `getEmployees()`, `getAnomalies()`, `getBehavioralBaseline()`, `updateAnomalyStatus()` — is written to the exact signature a real backend endpoint would need, complete with simulated network latency so loading and error states are genuinely tested, not assumed. When a real backend lands, this is an adapter swap, not a rewrite.

---

## `[ RUN IT LOCALLY ]`

```bash
git clone https://github.com/mailech/AI-Insider-Threat-BI.git
cd AI-Insider-Threat-BI/frontend
npm install
npm run dev
```

App boots at `http://localhost:3000`. Any password works against these seeded roles:

| Role | Login |
|---|---|
| Administrator | `admin@insideriq.local` |
| Security Manager | `manager@insideriq.local` |
| SOC Engineer | `engineer@insideriq.local` |
| Security Analyst | `analyst@insideriq.local` |

Log in as each role back to back — the RBAC boundaries are real, not cosmetic. An Analyst hitting `/users` or trying to dismiss an anomaly gets stopped at the route, not just at a hidden button.

---

## `[ DATASET ]`

The CERT r4.2 Insider Threat Dataset is staged in `data/` at the project root, ready for the Milestone 3 scoring/ML pipeline — synthetic data, field-mapped against this app's activity categories, not parsed by the frontend today.

---

## `[ ROADMAP ]`

**Milestone 3 — Risk Scoring**
A weighted multi-factor threat index (0–100) run against anomaly volume, access criticality, and historical severity; fleet-wide aggregation; department-level exposure rankings; full threat investigation workflows with evidence collection.

**Milestone 4 — Response & Reporting**
Alert and incident management with escalation workflows, a notification system, and PDF/Excel export for compliance and investigation reporting — closing the loop from detection to resolution.

---

<p align="center"><sub>Built as part of an insider threat behavioral intelligence engineering track. Frontend-first, backend-ready.</sub></p>
