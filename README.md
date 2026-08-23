🛡️ AI Insider Threat Detection System - Frontend

A modern security monitoring dashboard designed to help security administrators monitor employee risk, analyze suspicious activity, and visualize insider-threat indicators through a centralized interface.

🚀 Overview

The ITBIS frontend provides a professional security dashboard for monitoring employee risk levels and organizational security activity.

The current frontend focuses on:

- Employee risk monitoring
- Security dashboard visualization
- Risk-level filtering
- Employee search
- Employee management
- Risk analysis charts
- Administrator profile
- Secure login interface
- Responsive dark-themed security UI

✨ Features

🔐 Login

- Professional administrator login interface
- Role selection
- Authentication state handling
- Protected dashboard navigation
- Logout functionality

📊 Security Dashboard

The dashboard provides an executive overview of the security environment.

Current dashboard metrics include:

- Total Employees
- High Risk Users
- Security Alerts
- System Health

It also includes:

- Risk Activity table
- Risk Analysis chart
- Administrator profile information

👥 Employee Management

The Employees module provides:

- Employee listing
- Employee search
- Department-based search
- Risk-level filtering
- Risk score display
- High / Medium / Low risk indicators
- Employee editing
- Employee deletion
- Edit employee modal

📈 Risk Visualization

The dashboard includes visual representation of employee risk activity using charts.

Risk levels are represented using:

- 🔴 High Risk
- 🟡 Medium Risk
- 🟢 Low Risk

🛠️ Tech Stack

- React.js
- JavaScript
- React Router
- Recharts
- CSS
- Vite
- Git & GitHub

📁 Frontend Structure

frontend/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   ├── DashboardCards.jsx
│   │   ├── RiskTable.jsx
│   │   ├── Chart.jsx
│   │   ├── SearchBar.jsx
│   │   └── UserInfo.jsx
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Employees.jsx
│   │   ├── Alerts.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   │
│   ├── data/
│   │   └── employees.js
│   │
│   ├── styles/
│   │   └── Login.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
└── README.md

⚙️ Installation

Clone the repository:

git clone <repository-url>

Navigate to the frontend project:

cd frontend

Install dependencies:

npm install

▶️ Run the Project

Start the development server:

npm run dev

The application will normally run at:

http://localhost:5173

Open the URL in your browser to access the dashboard.

🖥️ Current Modules

Module| Description
Login| Administrator authentication interface
Dashboard| Security overview and risk metrics
Employees| Employee risk management
Alerts| Security alert interface
Reports| Security reporting interface
Settings| System settings interface

🎨 UI Design

The frontend follows a modern cybersecurity dashboard design with:

- Dark professional interface
- Security-focused color palette
- Risk status indicators
- Card-based information layout
- Responsive tables
- Interactive controls
- Modal-based editing
- Data visualization

📌 Current Development Status

Status: 🚧 Frontend Development Completed

The current frontend includes the main dashboard interface, employee management functionality, navigation, login flow, risk visualization, and professional dark-themed styling.

The application currently uses local/static employee data. Backend API and database integration will be added in the next development phase.

🔮 Future Frontend Improvements

- Real-time security alerts
- Live telemetry visualization
- Advanced analytics dashboard
- Employee profile details
- Interactive threat timelines
- Notification center
- Advanced report generation
- Backend API integration
- AI-generated threat insights

🎯 Project Objective

The frontend is designed as the user-facing layer of the AI Insider Threat Detection & Behavioral Intelligence System .

Its purpose is to provide security administrators with a clear and efficient interface for identifying high-risk employees, monitoring security activity, and understanding organizational threat patterns.

---

AI-Insider-Threat-BI— AI-powered Insider Threat Detection & Behavioral Intelligence
