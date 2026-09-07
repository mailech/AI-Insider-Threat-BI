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

## AI risk model (new)

There's now a real machine learning model in this project - insider_threat_model.joblib, an Isolation Forest trained on 5 behavior features (logon count, after-hours logons, USB connects, file copies, email count). Since this is a Python/scikit-learn file, it can't run inside the React app directly, so there's a small Flask API in the server/ folder that loads it and serves predictions.

To use it, run this in a second terminal (keep npm run dev running in the first one):
```
cd server
pip install -r requirements.txt
python app.py
```
This starts the model API on http://localhost:5000.

Then in the app, log in as Admin, go to Add Employee - there's a new "AI Risk Model" section at the bottom of the form. You can type the 5 activity counts in yourself, or use the buttons: "Fill example: normal" / "Fill example: suspicious" for fixed test values, or "Randomize activity data" to auto-fill varied random numbers each click. Then click "Predict risk with AI model" - it calls the Flask API and uses the real prediction as that employee's starting risk score.

If the Flask server isn't running, everything else in the app still works fine - the employee just gets saved with a baseline score of 0 like before, and you'll get a toast saying it couldn't reach the model server.

Note: the model expects fairly large numbers (hundreds to thousands) since it was trained on cumulative activity totals over a monitoring period, not daily counts - that's why the example buttons are there.

### Why is this manual entry, and not automatic?

In this project you type the 5 activity numbers in yourself. In a real deployed version of this system, nobody would type these in - here's how it would actually work:

1. Monitoring agents installed on each employee's computer would log activity in the background (logons, USB connections, file copies, emails).
2. That raw activity would flow into a central log system (e.g. Splunk, ELK, or a custom log database).
3. A scheduled job would aggregate each employee's logs into the 5 numbers the model needs, automatically, on a daily/weekly basis.
4. Those numbers would be sent to the model automatically and the risk score would update on its own - no admin form involved.

This project is a frontend prototype with no real monitoring agents or log pipeline, so the Add Employee form is standing in for step 3 above so the model can still be demonstrated end-to-end. Once this is connected to a real monitoring/logging backend, the manual form goes away completely and the risk scores would just update by themselves.

## Newest additions

- **Real per-alert investigation** - each alert on Threat Alerts now links to its own investigation page with its own timeline/evidence, instead of every "Investigate" button showing the same fixed case.
- **Resolve / reopen alerts** - Admin can mark an alert resolved (saved in localStorage), toggle "Show resolved" to see them again, and reopen one if needed. Dashboard's "Open Alerts" count and Priority Alerts panel now reflect this too.
- **Working global search** - the search bar in the header actually searches employees and alerts now (it did nothing before), shows a dropdown of matches, and clicking a result jumps straight to that employee's profile or that alert's investigation.
- **Department risk breakdown** - Risk Analysis page now has an extra panel showing average risk score per department, calculated from the real 105-employee dataset.
- **Print report** - the Investigation page has a "Print report" button (browser print, styled to hide the sidebar/header so it looks clean on paper/PDF).

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
