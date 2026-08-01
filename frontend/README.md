# Aegis — Insider Threat Behavioral Intelligence (Frontend)

Frontend prototype for the Security Analyst Dashboard, built with React + Vite + Tailwind CSS.
Data is currently mocked in `src/data/mockAlerts.js` — swap that for real API calls once the
FastAPI backend is ready.

## How to run it

You'll need [Node.js](https://nodejs.org) installed (version 18 or newer).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`) in your browser.

## Folder structure

```
aegis-frontend/
├── index.html                     # HTML entry point
├── package.json                   # dependencies + scripts
├── vite.config.js                 # build tool config
├── tailwind.config.js             # Tailwind CSS config
├── postcss.config.js
└── src/
    ├── main.jsx                   # React entry point
    ├── App.jsx                    # top-level app / future routing
    ├── index.css                  # global styles + font imports
    ├── styles/
    │   └── theme.js                # shared colors & design tokens
    ├── data/
    │   └── mockAlerts.js           # placeholder alert data
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.jsx
    │   │   └── TopBar.jsx
    │   └── dashboard/
    │       ├── KpiCard.jsx
    │       ├── StatusPill.jsx
    │       ├── RiskBreakdownBar.jsx
    │       ├── AlertTable.jsx
    │       └── InvestigationPanel.jsx
    └── pages/
        └── SecurityAnalystDashboard.jsx   # assembles the dashboard
```

## What's next

- Build the remaining dashboards (SOC, Security Manager, Admin) as new files under `src/pages/`
- Add routing (e.g. `react-router-dom`) once there's more than one page
- Replace `src/data/mockAlerts.js` with real API calls to the FastAPI backend
- Add authentication (JWT) once the backend auth endpoints exist
