
import "../styles/Dashboard.css";

function Dashboard() {
  return (
    <main className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Security Dashboard</h1>
          <p>
            Monitor insider threats, suspicious activity and AI security
            risks.
          </p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          System Operational
        </div>
      </div>

      {/* Security Cards */}
      <div className="cards">
        <div className="card dashboard-card">
          <div className="card-top">
            <div className="dashboard-icon blue">👥</div>
            <span className="card-label">Employees</span>
          </div>

          <h2>250</h2>
          <p>Registered employees</p>
        </div>

        <div className="card dashboard-card">
          <div className="card-top">
            <div className="dashboard-icon orange">⚠️</div>
            <span className="card-label">Active Alerts</span>
          </div>

          <h2>15</h2>
          <p>Require attention</p>
        </div>

        <div className="card dashboard-card">
          <div className="card-top">
            <div className="dashboard-icon red">🚨</div>
            <span className="card-label">High Risk Users</span>
          </div>

          <h2>8</h2>
          <p>Currently monitored</p>
        </div>

        <div className="card dashboard-card">
          <div className="card-top">
            <div className="dashboard-icon purple">🧪</div>
            <span className="card-label">Poisoned Samples</span>
          </div>

          <h2>250</h2>
          <p>Suspected samples</p>
        </div>
      </div>

      {/* Main Analytics */}
      <div className="dashboard-grid">
        {/* Threat Activity */}
        <section className="dashboard-panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Threat Activity</h2>
              <p>Security events detected over the last 7 days</p>
            </div>

            <span className="period-label">Last 7 days</span>
          </div>

          <div className="activity-chart">
            <div className="chart-y">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            <div className="chart-area">
              <div className="chart-lines">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="bars">
                <div className="bar-column">
                  <div className="bar" style={{ height: "45%" }}></div>
                  <span>Mon</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "60%" }}></div>
                  <span>Tue</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "35%" }}></div>
                  <span>Wed</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "78%" }}></div>
                  <span>Thu</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "55%" }}></div>
                  <span>Fri</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "88%" }}></div>
                  <span>Sat</span>
                </div>

                <div className="bar-column">
                  <div className="bar" style={{ height: "65%" }}></div>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Distribution */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Risk Distribution</h2>
              <p>Current employee risk levels</p>
            </div>
          </div>

          <div className="risk-content">
            <div className="risk-circle">
              <div>
                <strong>250</strong>
                <span>Employees</span>
              </div>
            </div>

            <div className="risk-list">
              <div className="risk-item">
                <span className="risk-indicator low"></span>
                <span>Low Risk</span>
                <strong>182</strong>
              </div>

              <div className="risk-item">
                <span className="risk-indicator medium"></span>
                <span>Medium Risk</span>
                <strong>60</strong>
              </div>

              <div className="risk-item">
                <span className="risk-indicator high"></span>
                <span>High Risk</span>
                <strong>8</strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Section */}
      <section className="dashboard-panel alerts-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Security Alerts</h2>
            <p>Latest suspicious activities detected by the platform</p>
          </div>

          <button className="view-alerts">
            View All Alerts →
          </button>
        </div>

        <div className="table-wrapper">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Activity</th>
                <th>Risk Level</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>EMP001</td>
                <td>Unusual Login</td>
                <td>
                  <span className="risk-badge-table high">High</span>
                </td>
                <td>10 min ago</td>
                <td>
                  <span className="status-badge open">Open</span>
                </td>
              </tr>

              <tr>
                <td>EMP015</td>
                <td>USB Device Connected</td>
                <td>
                  <span className="risk-badge-table medium">Medium</span>
                </td>
                <td>32 min ago</td>
                <td>
                  <span className="status-badge investigating">
                    Investigating
                  </span>
                </td>
              </tr>

              <tr>
                <td>EMP023</td>
                <td>Large File Download</td>
                <td>
                  <span className="risk-badge-table low">Low</span>
                </td>
                <td>1 hour ago</td>
                <td>
                  <span className="status-badge closed">Closed</span>
                </td>
              </tr>

              <tr>
                <td>EMP087</td>
                <td>Multiple Failed Logins</td>
                <td>
                  <span className="risk-badge-table high">High</span>
                </td>
                <td>2 hours ago</td>
                <td>
                  <span className="status-badge open">Open</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Security Modules */}
      <div className="module-grid">
        <div className="module-card">
          <span className="module-icon">🧪</span>
          <div>
            <h3>AI Poisoning Analysis</h3>
            <p>Analyze poisoned samples and model behaviour.</p>
          </div>
        </div>

        <div className="module-card">
          <span className="module-icon">🛡️</span>
          <div>
            <h3>Backdoor Detection</h3>
            <p>Evaluate trigger-based suspicious behaviour.</p>
          </div>
        </div>

        <div className="module-card">
          <span className="module-icon">👤</span>
          <div>
            <h3>Insider Risk Monitoring</h3>
            <p>Monitor employee activities and risk levels.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;