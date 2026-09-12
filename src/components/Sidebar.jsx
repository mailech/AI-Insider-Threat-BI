
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

function getCurrentUser() {
  try {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const role = currentUser?.role || "Security Analyst";

  const canAccessReports = [
    "Security Analyst",
    "Security Manager",
    "Administrator",
  ].includes(role);

  const canAccessSettings = [
    "Security Manager",
    "Administrator",
  ].includes(role);

  function handleLogout() {
    localStorage.removeItem("currentUser");
    navigate("/login", { replace: true });
  }

  return (
    <div className="sidebar">
      <h2>AI Security</h2>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {role.charAt(0)}
        </div>

        <div>
          <strong>{role}</strong>
          <span>Authenticated User</span>
        </div>
      </div>

      <ul>
        <li>
          <NavLink to="/">🏠 Dashboard</NavLink>
        </li>

        <li>
          <NavLink to="/employees">👥 Employees</NavLink>
        </li>

        <li>
          <NavLink to="/activity">📡 Activity Monitoring</NavLink>
        </li>

        <li>
          <NavLink to="/behavior">📈 Behavior Analytics</NavLink>
        </li>

        <li>
          <NavLink to="/anomalies">🧠 Anomaly Detection</NavLink>
        </li>

        <li>
          <NavLink to="/risk-scoring">🎯 Risk Scoring</NavLink>
        </li>

        <li>
          <NavLink to="/ueba">🧩 UEBA Intelligence</NavLink>
        </li>

        <li>
          <NavLink to="/alerts">🚨 Alerts</NavLink>
        </li>

        <li>
          <NavLink to="/investigations">🔎 Investigations</NavLink>
        </li>
         <li>
  <NavLink to="/poisoning-analysis">🛡️ Poisoning Analysis</NavLink>
</li>


        {canAccessReports && (
          <li>
            <NavLink to="/reports">📊 Reports</NavLink>
          </li>
        )}

        {canAccessSettings && (
          <li>
            <NavLink to="/settings">⚙️ Settings</NavLink>
          </li>
        )}
      </ul>

      <button
        className="sidebar-logout"
        onClick={handleLogout}
      >
        ↪ Logout
      </button>
    </div>
  );
}

export default Sidebar;