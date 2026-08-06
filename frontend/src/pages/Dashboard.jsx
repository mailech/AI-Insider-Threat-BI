import DashboardLayout from "../layouts/DashboardLayout";
import DashboardCard from "../components/DashboardCard";

import "../styles/dashboard.css";

function Dashboard() {

  const activities = [
    {
      employee: "EMP101",
      activity: "Login",
      time: "09:00 AM",
      severity: "Low",
    },
    {
      employee: "EMP102",
      activity: "File Download",
      time: "09:15 AM",
      severity: "Medium",
    },
    {
      employee: "EMP103",
      activity: "USB Connected",
      time: "10:20 AM",
      severity: "High",
    },
    {
      employee: "EMP104",
      activity: "Failed Login",
      time: "11:40 AM",
      severity: "Critical",
    },
  ];

  return (

    <DashboardLayout>

      <div className="dashboard-title">

        <h1>Security Dashboard</h1>

        <p>
          Monitor employee activities and insider threats.
        </p>

      </div>

      <div className="card-grid">

        <DashboardCard
          title="Total Employees"
          value="250"
          color="#2563eb"
        />

        <DashboardCard
          title="Today's Activities"
          value="1,245"
          color="#10b981"
        />

        <DashboardCard
          title="Failed Logins"
          value="18"
          color="#f59e0b"
        />

        <DashboardCard
          title="File Downloads"
          value="321"
          color="#8b5cf6"
        />

        <DashboardCard
          title="High Risk Alerts"
          value="9"
          color="#dc2626"
        />

      </div>

      <div className="activity-table">

        <h2>Recent Activity Logs</h2>

        <table>

          <thead>

            <tr>

              <th>Employee</th>

              <th>Activity</th>

              <th>Time</th>

              <th>Severity</th>

            </tr>

          </thead>

          <tbody>

            {activities.map((item, index) => (

              <tr key={index}>

                <td>{item.employee}</td>

                <td>{item.activity}</td>

                <td>{item.time}</td>

                <td>{item.severity}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </DashboardLayout>

  );
}

export default Dashboard;