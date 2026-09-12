
import { useState } from "react";
import "../styles/Alerts.css";

const initialAlerts = [
  {
    id: 1,
    employee: "EMP001",
    activity: "Unusual Login",
    description: "Login detected from an unusual location.",
    risk: "High",
    status: "Open",
    time: "10 min ago",
  },
  {
    id: 2,
    employee: "EMP015",
    activity: "USB Device Connected",
    description: "External USB storage device connected.",
    risk: "Medium",
    status: "Investigating",
    time: "32 min ago",
  },
  {
    id: 3,
    employee: "EMP023",
    activity: "Large File Download",
    description: "Large amount of data downloaded.",
    risk: "Low",
    status: "Closed",
    time: "1 hour ago",
  },
  {
    id: 4,
    employee: "EMP087",
    activity: "Multiple Failed Logins",
    description: "Several unsuccessful login attempts detected.",
    risk: "High",
    status: "Open",
    time: "2 hours ago",
  },
  {
    id: 5,
    employee: "EMP102",
    activity: "Sensitive File Access",
    description: "Sensitive company files accessed outside normal hours.",
    risk: "High",
    status: "Investigating",
    time: "3 hours ago",
  },
  {
    id: 6,
    employee: "EMP119",
    activity: "Unusual Data Transfer",
    description: "Unexpected outbound data transfer detected.",
    risk: "Medium",
    status: "Open",
    time: "4 hours ago",
  },
];

function Alerts() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.employee.toLowerCase().includes(search.toLowerCase()) ||
      alert.activity.toLowerCase().includes(search.toLowerCase());

    const matchesRisk =
      riskFilter === "All" || alert.risk === riskFilter;

    const matchesStatus =
      statusFilter === "All" || alert.status === statusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const updateStatus = (id, newStatus) => {
    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.id === id
          ? { ...alert, status: newStatus }
          : alert
      )
    );

    setSelectedAlert((current) =>
      current && current.id === id
        ? { ...current, status: newStatus }
        : current
    );
  };

  const highRisk = alerts.filter(
    (alert) => alert.risk === "High"
  ).length;

  const mediumRisk = alerts.filter(
    (alert) => alert.risk === "Medium"
  ).length;

  const openAlerts = alerts.filter(
    (alert) => alert.status === "Open"
  ).length;

  return (
    <main className="alerts-page">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h1>Security Alerts</h1>
          <p>
            Monitor and investigate suspicious insider activities.
          </p>
        </div>

        <div className="alert-count">
          {filteredAlerts.length} Alerts
        </div>
      </div>

      {/* Summary Cards */}
      <div className="alert-summary">
        <div className="alert-summary-card">
          <span>🚨</span>
          <div>
            <p>Open Alerts</p>
            <strong>{openAlerts}</strong>
          </div>
        </div>

        <div className="alert-summary-card high-card">
          <span>🔴</span>
          <div>
            <p>High Risk</p>
            <strong>{highRisk}</strong>
          </div>
        </div>

        <div className="alert-summary-card medium-card">
          <span>🟠</span>
          <div>
            <p>Medium Risk</p>
            <strong>{mediumRisk}</strong>
          </div>
        </div>

        <div className="alert-summary-card">
          <span>🛡️</span>
          <div>
            <p>Total Alerts</p>
            <strong>{alerts.length}</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <section className="alerts-panel">
        <div className="filter-bar">
          <div className="search-box">
            <span>🔎</span>

            <input
              type="text"
              placeholder="Search employee or activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="All">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Table */}
        <div className="alerts-table-wrapper">
          <table className="alerts-management-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Activity</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Detected</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <strong>{alert.employee}</strong>
                    </td>

                    <td>
                      <div className="activity-cell">
                        <strong>{alert.activity}</strong>
                        <span>{alert.description}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`alert-risk ${alert.risk.toLowerCase()}`}
                      >
                        {alert.risk}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`alert-status ${alert.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {alert.status}
                      </span>
                    </td>

                    <td>{alert.time}</td>

                    <td>
                      <button
                        className="details-button"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-alerts">
                    No alerts match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="alert-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Alert Details</h2>
                <p>{selectedAlert.employee}</p>
              </div>

              <button
                className="close-button"
                onClick={() => setSelectedAlert(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="detail-item">
                <span>Activity</span>
                <strong>{selectedAlert.activity}</strong>
              </div>

              <div className="detail-item">
                <span>Description</span>
                <strong>{selectedAlert.description}</strong>
              </div>

              <div className="detail-item">
                <span>Risk Level</span>
                <strong>{selectedAlert.risk}</strong>
              </div>

              <div className="detail-item">
                <span>Detected</span>
                <strong>{selectedAlert.time}</strong>
              </div>

              <div className="detail-item">
                <span>Current Status</span>
                <strong>{selectedAlert.status}</strong>
              </div>
            </div>

            <div className="modal-actions">
              {selectedAlert.status !== "Investigating" &&
                selectedAlert.status !== "Closed" && (
                  <button
                    className="investigate-button"
                    onClick={() =>
                      updateStatus(
                        selectedAlert.id,
                        "Investigating"
                      )
                    }
                  >
                    Start Investigation
                  </button>
                )}

              {selectedAlert.status !== "Closed" && (
                <button
                  className="close-alert-button"
                  onClick={() =>
                    updateStatus(selectedAlert.id, "Closed")
                  }
                >
                  Mark as Closed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Alerts;