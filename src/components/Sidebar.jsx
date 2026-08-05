import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar">
      <h2>AI Security</h2>

      <ul>
        <li>
          <NavLink to="/">🏠 Dashboard</NavLink>
        </li>

        <li>
          <NavLink to="/employees">👥 Employees</NavLink>
        </li>

        <li>
          <NavLink to="/alerts">🚨 Alerts</NavLink>
        </li>

        <li>
          <NavLink to="/reports">📊 Reports</NavLink>
        </li>

        <li>
          <NavLink to="/settings">⚙️ Settings</NavLink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;