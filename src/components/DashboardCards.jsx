function DashboardCards() {
  const cardStyle = {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    width: "200px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        marginTop: "20px",
        flexWrap: "wrap",
      }}
    >
      <div style={cardStyle}>
        <h3>250</h3>
        <p>Total Employees</p>
      </div>

      <div style={cardStyle}>
        <h3>15</h3>
        <p>High Risk Users</p>
      </div>

      <div style={cardStyle}>
        <h3>38</h3>
        <p>Alerts</p>
      </div>

      <div style={cardStyle}>
        <h3>92%</h3>
        <p>System Health</p>
      </div>
    </div>
  );
}

export default DashboardCards;