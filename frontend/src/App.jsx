import { useEffect, useState } from "react";
import "./App.css";



function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
  if (activeSection === "Users") {
    document.getElementById("users-section")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  if (activeSection === "Alerts") {
    document.getElementById("alerts-section")?.scrollIntoView({
      behavior: "smooth"
    });
  }
  if (activeSection === "Analytics") {
  document.getElementById("analytics-section")?.scrollIntoView({
    behavior: "smooth"
  });
}
if (activeSection === "Investigations") {
  document.getElementById("alerts-section")?.scrollIntoView({
    behavior: "smooth"
  });
}

if (activeSection === "Settings") {
  document.getElementById("settings-section")?.scrollIntoView({
    behavior: "smooth"
  });
}
}, [activeSection]);
const [stats, setStats] = useState({
  monitoredUsers: 0,
  activeThreats: 0,
  highRiskUsers: 0,
  threatsResolved: 0
});
useEffect(() => {
  fetch("http://localhost:5000/api/health")
    .then((res) => res.json())
    .then((data) => setBackendStatus(data.status))
    .catch(() => setBackendStatus("Offline"));

  fetch("http://localhost:5000/api/stats")
    .then((res) => res.json())
    .then((data) => setStats(data))
    .catch((error) => console.error("Stats error:", error));
}, []);
if (!isLoggedIn) {
  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Insider Threat BI</h1>
        <p>Security Analyst Login</p>

        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />

        <button onClick={() => setIsLoggedIn(true)}>
          Login
        </button>
      </div>
    </div>
  );
}
  return (
    <div className="dashboard">
<button
  className="logout-btn"
  onClick={() => setIsLoggedIn(false)}
>
  Logout
</button>
      <aside className="sidebar">
        <div className="logo">
          🛡️ <span>Insider Threat BI</span>
        </div>

        <nav>
          <div
  className="nav-item"
  onClick={() => setActiveSection("Users")}
>
  👥 Users
</div>
          
          <div
  className="nav-item"
  onClick={() => setActiveSection("Alerts")}
>
  ⚠️ Alerts
</div>
          <div
  className="nav-item"
  onClick={() => setActiveSection("Analytics")}
>
  📊 Analytics
</div>
          <div
  className="nav-item"
  onClick={() => setActiveSection("Investigations")}
>
  🔍 Investigations
</div>
          <div
  className="nav-item"
  onClick={() => setActiveSection("Settings")}
>
  ⚙️ Settings
</div>
        </nav>

        <div className="sidebar-bottom">
          <div>🔔 Notifications</div>
          <div>❓ Help</div>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div>
            <h1>Security Dashboard</h1>
            <p>AI-Powered Insider Threat Behavioral Intelligence</p>
            <div className="backend-status">
  Backend: {backendStatus}
</div>
          </div>

          <div className="profile">
            <div className="avatar">N</div>
            <div>
              <strong>Namrutha</strong>
              <small>Security Analyst</small>
            </div>
          </div>
        </header>

        <section id="users-section" className="cards">

          <div className="card">
            <div className="card-icon blue">👥</div>
            <div>
              <p>Monitored Users</p>
              <h2>248</h2>
              <span className="positive">+12 this week</span>
            </div>
          </div>

          <div className="card">
            <div className="card-icon red">⚠️</div>
            <div>
              <p>Active Threats</p>
              <h2>17</h2>
              <span className="negative">+4 today</span>
            </div>
          </div>

          <div className="card">
            <div className="card-icon orange">🚨</div>
            <div>
              <p>High Risk Users</p>
              <button
  type="button"
  onClick={() => alert("8 CLICK WORKING")}
  style={{ cursor: "pointer", position: "relative", zIndex: 9999 }}
>
  8
</button>
              <span className="negative">Needs attention</span>
            </div>
          </div>

          <div className="card">
            <div className="card-icon green">🛡️</div>
            <div>
              <p>Threats Resolved</p>
              <h2>136</h2>
              <span className="positive">92% resolved</span>
            </div>
          </div>

        </section>
<section id="investigations-section" className="panel alerts-panel">
  <div className="panel-header">
    <div>
      <h2>Investigations</h2>
      <p>Investigate suspicious user activities and security threats</p>
    </div>
  </div>

  <div className="table">
    <div className="table-row table-head">
      <span>User</span>
      <span>Activity</span>
      <span>Risk</span>
      <span>Status</span>
    </div>

    <div
  className="table-row"
  onClick={() =>
    document.getElementById("investigations-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  }
  style={{ cursor: "pointer" }}>


      <span>Rahul K</span>
      <span>Unusual file download</span>
      <span className="risk high">High</span>
      <span className="status investigating">Investigating</span>
    </div>

    <div className="table-row">
      <span>Arjun R</span>
      <span>Large data transfer</span>
      <span className="risk high">High</span>
      <span className="status investigating">Investigating</span>
    </div>
  </div>
</section>
        <section id="analytics-section" className="dashboard-grid">

          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <h2>Threat Activity</h2>
                <p>Suspicious activity detected over the week</p>
              </div>
              <select>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </div>

            <div className="chart">
              <div className="bar" style={{ height: "45%" }}>
                <span>Mon</span>
              </div>
              <div className="bar" style={{ height: "65%" }}>
                <span>Tue</span>
              </div>
              <div className="bar" style={{ height: "40%" }}>
                <span>Wed</span>
              </div>
              <div className="bar" style={{ height: "80%" }}>
                <span>Thu</span>
              </div>
              <div className="bar" style={{ height: "55%" }}>
                <span>Fri</span>
              </div>
              <div className="bar" style={{ height: "90%" }}>
                <span>Sat</span>
              </div>
              <div className="bar" style={{ height: "70%" }}>
                <span>Sun</span>
              </div>
            </div>
          </div>

          <div className="panel risk-panel">
            <div className="panel-header">
              <div>
                <h2>Risk Overview</h2>
                <p>Current threat distribution</p>
              </div>
            </div>

            <div className="risk-circle">
              <strong>68%</strong>
              <span>Risk Level</span>
            </div>

            <div className="risk-list">
              <div>
                <span><i className="dot red-dot"></i>High Risk</span>
                <strong
  onClick={() =>
    document.getElementById("investigations-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  }
  style={{ cursor: "pointer" }}
>
  8
</strong>
              </div>

              <div>
                <span><i className="dot orange-dot"></i>Medium Risk</span>
                <strong
  onClick={() =>
    document.getElementById("investigations-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  }
  style={{ cursor: "pointer" }}
>
  24
</strong>
              </div>

              <div>
                <span><i className="dot green-dot"></i>Low Risk</span>
                <strong
  onClick={() =>
    document.getElementById("investigations-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  }
  style={{ cursor: "pointer" }}
>
  216
</strong>
              </div>
            </div>
          </div>

        </section>

        <section id="alerts-section" className="panel alerts-panel">

          <div className="panel-header">
            <div>
              <h2>Recent Security Alerts</h2>
              <p>Latest suspicious activities detected by the system</p>
            </div>

            <button className="view-btn" onClick={() => {
  const table = document.querySelector("#alerts-section .table");
  if (table) {
    window.scrollTo({
      top: table.offsetTop - 100,
      behavior: "smooth"
    });
  }
}}>View All</button>
          </div>

          <div className="table">

            <div className="table-row table-head">
              <span>User</span>
              <span>Activity</span>
              <span>Risk</span>
              <span>Status</span>
              <span>Time</span>
            </div>

            <div className="table-row">
              <span>👤 Rahul K</span>
              <span>Unusual file download</span>
              <span className="risk high">High</span>
              <span className="status investigating">Investigating</span>
              <span>5 min ago</span>
            </div>

            <div className="table-row">
              <span>👤 Priya S</span>
              <span>Multiple login attempts</span>
              <span className="risk medium">Medium</span>
              <span className="status monitoring">Monitoring</span>
              <span>18 min ago</span>
            </div>

            <div className="table-row">
              <span>👤 Arjun R</span>
              <span>Large data transfer</span>
              <span className="risk high">High</span>
              <span className="status investigating">Investigating</span>
              <span>32 min ago</span>
            </div>

            <div className="table-row">
              <span>👤 Sneha P</span>
              <span>Access outside work hours</span>
              <span className="risk low">Low</span>
              <span className="status resolved">Resolved</span>
              <span>1 hr ago</span>
            </div>

          </div>
        </section>
<section id="settings-section" className="panel settings-panel">
  <div className="panel-header">
    <div>
      <h2>Settings</h2>
      <p>Manage security dashboard settings</p>
    </div>
  </div>

  <div className="settings-content">
    <div className="setting-row">
      <span>Threat Monitoring</span>
      <strong>Enabled</strong>
    </div>

    <div className="setting-row">
      <span>Real-time Alerts</span>
      <strong>Enabled</strong>
    </div>

    <div className="setting-row">
      <span>Risk Detection</span>
      <strong>Active</strong>
    </div>
  </div>
</section>
      </main>
    </div>
  );
}

export default App;
