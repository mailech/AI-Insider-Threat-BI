
import { useMemo, useState } from "react";
import { demoActivities } from "../data/demoData";
import "../styles/Activity.css";

const activityTypes = [
  "All",
  "Login",
  "File Download",
  "Data Transfer",
  "Remote Access",
  "Application Usage",
  "File Access",
];

const severities = ["All", "Critical", "High", "Medium", "Low"];

function Activity() {
  const [activities, setActivities] = useState(demoActivities);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [selectedActivity, setSelectedActivity] = useState(null);

  const filteredActivities = useMemo(() => {
    const query = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const matchesSearch =
        !query ||
        activity.employee.toLowerCase().includes(query) ||
        activity.employeeId.toLowerCase().includes(query) ||
        activity.type.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query) ||
        activity.device.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "All" || activity.type === typeFilter;

      const matchesSeverity =
        severityFilter === "All" ||
        activity.severity === severityFilter;

      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [activities, search, typeFilter, severityFilter]);

  const summary = {
    total: activities.length,
    flagged: activities.filter(
      (item) => item.status === "Flagged"
    ).length,
    highRisk: activities.filter(
      (item) =>
        item.severity === "High" ||
        item.severity === "Critical"
    ).length,
    critical: activities.filter(
      (item) => item.severity === "Critical"
    ).length,
  };

  const markReviewed = (id) => {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, status: "Reviewed" }
          : activity
      )
    );

    setSelectedActivity(null);
  };

  return (
    <div className="activity-page">

      {/* Header */}
      <div className="activity-header">
        <div>
          <p className="page-kicker">SECURITY OPERATIONS</p>

          <h1>Activity Monitoring</h1>

          <p>
            Monitor employee activity across endpoints,
            identity systems, networks and data sources.
          </p>
        </div>

        <div className="monitoring-status">
          <span className="status-dot"></span>
          Demo Monitoring Active
        </div>
      </div>

      {/* Summary */}
      <div className="activity-summary">

        <div className="activity-stat">
          <span>Total Events</span>
          <strong>{summary.total}</strong>
          <small>Events in monitored environment</small>
        </div>

        <div className="activity-stat">
          <span>Flagged Events</span>
          <strong>{summary.flagged}</strong>
          <small>Events requiring attention</small>
        </div>

        <div className="activity-stat">
          <span>High-Risk Signals</span>
          <strong>{summary.highRisk}</strong>
          <small>High or critical activity</small>
        </div>

        <div className="activity-stat">
          <span>Critical Signals</span>
          <strong>{summary.critical}</strong>
          <small>Immediate attention required</small>
        </div>

      </div>

      {/* Filters */}
      <div className="activity-toolbar">

        <input
          type="text"
          placeholder="Search employee, event or device..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {activityTypes.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "All Activity Types" : type}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) =>
            setSeverityFilter(e.target.value)
          }
        >
          {severities.map((severity) => (
            <option key={severity} value={severity}>
              {severity === "All" ? "All Signals" : severity}
            </option>
          ))}
        </select>

        <button
          className="clear-filter"
          onClick={() => {
            setSearch("");
            setTypeFilter("All");
            setSeverityFilter("All");
          }}
        >
          Clear
        </button>

      </div>

      {/* Event Table */}
      <div className="activity-panel">

        <div className="panel-heading">
          <div>
            <h2>Security Event Stream</h2>
            <p>
              {filteredActivities.length} events displayed
            </p>
          </div>

          <span className="live-label">
            ● DEMO DATA
          </span>
        </div>

        <div className="activity-table-wrapper">
          <table className="activity-table">

            <thead>
              <tr>
                <th>Event</th>
                <th>Employee</th>
                <th>Activity</th>
                <th>Source</th>
                <th>Device</th>
                <th>Time</th>
                <th>Signal</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {filteredActivities.map((activity) => (
                <tr
                  key={activity.id}
                  onClick={() =>
                    setSelectedActivity(activity)
                  }
                >
                  <td>
                    <strong>{activity.id}</strong>
                  </td>

                  <td>
                    <div className="employee-cell">
                      <strong>{activity.employee}</strong>
                      <span>{activity.employeeId}</span>
                    </div>
                  </td>

                  <td>
                    <div className="activity-cell">
                      <strong>{activity.type}</strong>
                      <span>{activity.description}</span>
                    </div>
                  </td>

                  <td>{activity.source}</td>

                  <td>{activity.device}</td>

                  <td>{activity.timestamp}</td>

                  <td>
                    <span
                      className={`severity severity-${activity.severity.toLowerCase()}`}
                    >
                      <i></i>
                      {activity.severity}
                    </span>
                  </td>

                  <td>
                    <strong>{activity.risk}/100</strong>
                  </td>

                  <td>
                    <span
                      className={`activity-status status-${activity.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredActivities.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    className="empty-state"
                  >
                    No activity events match the
                    selected filters.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Sources */}
      <div className="activity-types">
        <h2>Monitored Activity Sources</h2>

        <div className="source-grid">

          {[
            ["🔐", "Identity & Login", "Authentication events"],
            ["📁", "File Activity", "Downloads and file access"],
            ["✉️", "Email Activity", "Internal and external email"],
            ["🛡️", "Privilege Changes", "Access modifications"],
            ["🌐", "Network Activity", "Network connections"],
            ["💻", "Endpoint Activity", "Applications and devices"],
            ["🔌", "Removable Devices", "USB activity"],
            ["🔗", "Remote Access", "VPN and remote sessions"],
          ].map(([icon, title, description]) => (
            <div className="source-card" key={title}>
              <div className="source-icon">{icon}</div>

              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>

              <span className="source-active">
                Active
              </span>
            </div>
          ))}

        </div>
      </div>

      {/* Modal */}
      {selectedActivity && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="activity-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">
              <div>
                <span>EVENT DETAILS</span>
                <h2>{selectedActivity.id}</h2>
              </div>

              <button
                onClick={() => setSelectedActivity(null)}
              >
                ×
              </button>
            </div>

            <div className="event-detail-title">
              <h3>{selectedActivity.type}</h3>

              <span
                className={`severity severity-${selectedActivity.severity.toLowerCase()}`}
              >
                <i></i>
                {selectedActivity.severity}
              </span>
            </div>

            <p className="event-description">
              {selectedActivity.description}
            </p>

            <div className="event-details-grid">

              <div>
                <span>Employee</span>
                <strong>{selectedActivity.employee}</strong>
              </div>

              <div>
                <span>Employee ID</span>
                <strong>{selectedActivity.employeeId}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{selectedActivity.department}</strong>
              </div>

              <div>
                <span>Source</span>
                <strong>{selectedActivity.source}</strong>
              </div>

              <div>
                <span>Device</span>
                <strong>{selectedActivity.device}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{selectedActivity.location}</strong>
              </div>

              <div>
                <span>Timestamp</span>
                <strong>{selectedActivity.timestamp}</strong>
              </div>

              <div>
                <span>Risk Score</span>
                <strong>{selectedActivity.risk}/100</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedActivity.status}</strong>
              </div>

            </div>

            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </button>

              {selectedActivity.status !== "Reviewed" && (
                <button
                  className="primary-button"
                  onClick={() =>
                    markReviewed(selectedActivity.id)
                  }
                >
                  Mark as Reviewed
                </button>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Activity;