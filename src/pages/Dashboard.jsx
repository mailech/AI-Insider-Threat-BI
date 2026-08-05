import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Dashboard() {
  return (
    <>
      <Sidebar />
      <Navbar />

      <div className="dashboard">
        <h1>Security Dashboard</h1>

        <div className="cards">
          <div className="card">
            <h3>Total Employees</h3>
            <p>250</p>
          </div>

          <div className="card">
            <h3>Active Alerts</h3>
            <p>15</p>
          </div>

          <div className="card">
            <h3>High Risk Users</h3>
            <p>8</p>
          </div>

          <div className="card">
            <h3>Incidents</h3>
            <p>4</p>
          </div>
        </div>

        <div className="table-section">
          <h2>Recent Alerts</h2>

          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Alert Type</th>
                <th>Risk Level</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>EMP001</td>
                <td>Unusual Login</td>
                <td>High</td>
                <td>Open</td>
              </tr>

              <tr>
                <td>EMP015</td>
                <td>USB Device Connected</td>
                <td>Medium</td>
                <td>Investigating</td>
              </tr>

              <tr>
                <td>EMP023</td>
                <td>Large File Download</td>
                <td>Low</td>
                <td>Closed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Dashboard;