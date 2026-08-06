import "../styles/dashboardCard.css";

function DashboardCard({ title, value, color }) {
  return (
    <div className="dashboard-card" style={{ borderLeft: `6px solid ${color}` }}>
      <h3>{title}</h3>
      <h2>{value}</h2>
    </div>
  );
}

export default DashboardCard;