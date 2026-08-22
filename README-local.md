# Activity Management System

Final year project - a workplace activity monitoring dashboard built with React + Vite.
Has role based login (Admin / Analyst / Employee) and simulates an insider threat detection system.

## How to run

1. Open the folder in VS Code
2. Open a terminal and run:
```
npm install
npm run dev
```
3. Open the localhost link it gives you (usually http://localhost:5173)

Needs Node.js 18+.

## Login details

Admin: admin@activity.local / admin123
Analyst: analyst@activity.local / analyst123

For employee login, use any of these emails with password employee123:
- ravi@company.com (Ravi Menon)
- sneha@company.com (Sneha Krishnan)
- arjun@company.com (Arjun Joseph)
- priya@company.com (Priya Nair)
- dev@company.com (Dev Varma)

There's a "View demo accounts" link on the login page too if you forget these.

If Admin adds a new employee, the app auto generates a password for them and shows it once after saving. Copy it and give it to them so they can log in.

## Pages

- Login
- Dashboard
- Employees (search + filters + export + delete)
- Add Employee
- Employee Profile
- Activity Monitor
- Threat Alerts
- Risk Analysis
- Reports (CSV export)
- Investigation
- Settings
- Employee Portal (for Employee role)

## Admin vs Analyst vs Employee

Admin can add/delete employees, resolve alerts, and see a Team Access panel in Settings.
Analyst can view everything and investigate alerts but can't add/delete employees or resolve alerts.
Employee only sees their own Security Portal, not the main dashboard.

## About the data

The employee data (105 records) is fake/synthetic data I made up for this project, structured loosely around the CERT Insider Threat Dataset (r4.2) categories used in real insider threat research - logon, device, http, email and file logs. I didn't use the actual CERT dataset since it's a restricted dataset you have to request access for from CMU, so this is just a sample dataset made to look similar for demo purposes.

## Notes

This is only a frontend project, so there's no real backend/database - employee additions, deletions and settings are saved in the browser's localStorage. For an actual production version this would need a real backend and database.