import {NavLink} from "react-router-dom";
function Sidebar() {
    const linkStyle = {
  display: "block",
  color: "white",
  textDecoration: "none",
  marginBottom: "20px",
  fontSize: "18px",
};
  return (
    <div
      style={{
        width: "240px",
        height: "100vh",
        background: "#6C63FF",
        color: "white",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h2>🛡 AI Dashboard</h2>
      <hr />

      <div style={{ marginTop: "30px", lineHeight: "2.5" }}>
    <NavLink to="/" style={linkStyle}>🏠 Dashboard</NavLink>
    <NavLink to="/employees" style={linkStyle}>👨 Employees</NavLink>
    <NavLink to="/alerts" style={linkStyle}>⚠ Alerts</NavLink>
    <NavLink to="/reports" style={linkStyle}>📄 Reports</NavLink>
    <NavLink to="/settings" style={linkStyle}>⚙ Settings</NavLink>
      </div>
    </div>
  );
}

export default Sidebar;