function Navbar() {
  return (
    <div
      style={{
        height: "70px",
        background: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Insider Threat Dashboard</h2>

      <div>
        🔔 &nbsp;&nbsp; 👤 Admin
      </div>
    </div>
  );
}

export default Navbar;