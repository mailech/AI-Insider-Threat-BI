import "../styles/Navbar.css";

function Navbar() {
  return (
    <div className="navbar">
      <h2>Insider Threat Dashboard</h2>

      <div className="profile">
        <span>🔔</span>
        <span>Admin</span>
      </div>
    </div>
  );
}

export default Navbar;