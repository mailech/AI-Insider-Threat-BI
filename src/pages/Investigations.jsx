
import { useMemo, useState } from "react";
import "../styles/Investigations.css";

const investigations = [
  {
    id: "INV-001",
    employee: "Arjun Kumar",
    employeeId: "EMP003",
    department: "IT Security",
    severity: "Critical",
    status: "In Progress",
    riskScore: 86,
    investigator: "Security Analyst",
    created: "Today, 09:42",
    summary: "Multiple privileged access anomalies detected.",
    devices: ["CORP-LAP-003", "VPN-SEC-02"],
    events: [
      {
        time: "09:12",
        type: "Privilege Change",
        description: "Administrative privilege granted to user account.",
        severity: "High",
      },
      {
        time: "09:18",
        type: "File Access",
        description: "Accessed restricted security configuration files.",
        severity: "High",
      },
      {
        time: "09:27",
        type: "Network",
        description: "Connection established from an unusual network location.",
        severity: "Medium",
      },
      {
        time: "09:35",
        type: "Data Transfer",
        description: "Large volume of data transferred to external destination.",
        severity: "Critical",
      },
    ],
    evidence: [
      "Authentication logs",
      "Privilege change records",
      "Network connection logs",
      "File access records",
    ],
  },
  {
    id: "INV-002",
    employee: "Rahul Sharma",
    employeeId: "EMP001",
    department: "Engineering",
    severity: "High",
    status: "Assigned",
    riskScore: 69,
    investigator: "SOC Engineer",
    created: "Today, 08:30",
    summary: "Abnormal download activity detected.",
    devices: ["DEV-ENG-014"],
    events: [
      {
        time: "08:05",
        type: "Login",
        description: "Login detected outside normal working hours.",
        severity: "Medium",
      },
      {
        time: "08:17",
        type: "Download",
        description: "Large number of project files downloaded.",
        severity: "High",
      },
      {
        time: "08:24",
        type: "File Access",
        description: "Accessed files outside normal project scope.",
        severity: "High",
      },
    ],
    evidence: [
      "Login history",
      "Download records",
      "File access logs",
    ],
  },
  {
    id: "INV-003",
    employee: "Vikram Singh",
    employeeId: "EMP005",
    department: "Operations",
    severity: "High",
    status: "Open",
    riskScore: 63,
    investigator: "Security Manager",
    created: "Yesterday, 16:20",
    summary: "Excessive data transfer identified.",
    devices: ["OPS-WKS-022", "USB-4421"],
    events: [
      {
        time: "15:40",
        type: "USB Device",
        description: "Previously unseen removable device connected.",
        severity: "Medium",
      },
      {
        time: "15:52",
        type: "Data Transfer",
        description: "Large data transfer to removable storage detected.",
        severity: "Critical",
      },
    ],
    evidence: [
      "USB device logs",
      "Endpoint activity",
      "Data transfer records",
    ],
  },
];

function getSeverityClass(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function Investigations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [items, setItems] = useState(investigations);

  const filteredInvestigations = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.employee.toLowerCase().includes(search.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesSeverity =
        severityFilter === "All" || item.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [items, search, statusFilter, severityFilter]);

  const openCount = items.filter(
    (item) => item.status === "Open"
  ).length;

  const assignedCount = items.filter(
    (item) => item.status === "Assigned"
  ).length;

  const inProgressCount = items.filter(
    (item) => item.status === "In Progress"
  ).length;

  const criticalCount = items.filter(
    (item) => item.severity === "Critical"
  ).length;

  function updateStatus(id, newStatus) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: newStatus }
          : item
      )
    );

    setSelectedInvestigation((current) =>
      current
        ? { ...current, status: newStatus }
        : current
    );
  }

  return (
    <div className="investigations-page">
      {/* Header */}

      <div className="investigations-header">
        <div>
          <h1>Threat Investigation Center</h1>
          <p>
            Investigate suspicious employee activity, correlate security
            events and collect evidence.
          </p>
        </div>

        <div className="investigation-status">
          ● Investigation Engine Active
        </div>
      </div>

      {/* Summary */}

      <div className="investigation-summary">
        <div className="investigation-summary-card">
          <span>Open Investigations</span>
          <strong>{openCount}</strong>
          <small>Awaiting investigation</small>
        </div>

        <div className="investigation-summary-card">
          <span>Assigned</span>
          <strong>{assignedCount}</strong>
          <small>Investigator assigned</small>
        </div>

        <div className="investigation-summary-card">
          <span>In Progress</span>
          <strong>{inProgressCount}</strong>
          <small>Currently being investigated</small>
        </div>

        <div className="investigation-summary-card critical-card">
          <span>Critical Cases</span>
          <strong>{criticalCount}</strong>
          <small>Immediate attention required</small>
        </div>
      </div>

      {/* Investigation workflow */}

      <div className="workflow-card">
        <h2>Investigation Workflow</h2>

        <div className="workflow-steps">
          <div className="workflow-step">
            <span>1</span>
            <div>
              <strong>Detect</strong>
              <small>Suspicious activity identified</small>
            </div>
          </div>

          <div className="workflow-line" />

          <div className="workflow-step">
            <span>2</span>
            <div>
              <strong>Correlate</strong>
              <small>Related events connected</small>
            </div>
          </div>

          <div className="workflow-line" />

          <div className="workflow-step">
            <span>3</span>
            <div>
              <strong>Investigate</strong>
              <small>Evidence and risk reviewed</small>
            </div>
          </div>

          <div className="workflow-line" />

          <div className="workflow-step">
            <span>4</span>
            <div>
              <strong>Resolve</strong>
              <small>Case closed or escalated</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}

      <div className="investigation-controls">
        <input
          type="text"
          placeholder="Search investigation, employee or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Investigation table */}

      <div className="investigation-table-card">
        <div className="section-heading">
          <div>
            <h2>Active Investigations</h2>
            <p>
              Security cases generated from correlated threat activity.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="investigation-table">
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Employee</th>
                <th>Severity</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Investigator</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredInvestigations.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                    <small>{item.summary}</small>
                  </td>

                  <td>
                    <strong>{item.employee}</strong>
                    <small>{item.employeeId}</small>
                  </td>

                  <td>
                    <span
                      className={`severity-badge ${getSeverityClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td>
                    <div className="investigation-score">
                      <strong>{item.riskScore}</strong>
                      <div>
                        <span
                          style={{
                            width: `${item.riskScore}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${getSeverityClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td>{item.investigator}</td>

                  <td>{item.created}</td>

                  <td>
                    <button
                      className="investigate-btn"
                      onClick={() =>
                        setSelectedInvestigation(item)
                      }
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}

              {filteredInvestigations.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-state">
                    No investigations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation Modal */}

      {selectedInvestigation && (
        <div
          className="investigation-modal-overlay"
          onClick={() => setSelectedInvestigation(null)}
        >
          <div
            className="investigation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{selectedInvestigation.id}</h2>
                <p>
                  {selectedInvestigation.employee} •{" "}
                  {selectedInvestigation.department}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedInvestigation(null)}
              >
                ×
              </button>
            </div>

            {/* Case overview */}

            <div className="case-overview">
              <div>
                <span>Risk Score</span>
                <strong>
                  {selectedInvestigation.riskScore}/100
                </strong>
              </div>

              <div>
                <span>Severity</span>
                <b
                  className={`severity-badge ${getSeverityClass(
                    selectedInvestigation.severity
                  )}`}
                >
                  {selectedInvestigation.severity}
                </b>
              </div>

              <div>
                <span>Status</span>
                <b
                  className={`status-badge ${getSeverityClass(
                    selectedInvestigation.status
                  )}`}
                >
                  {selectedInvestigation.status}
                </b>
              </div>
            </div>

            {/* Timeline */}

            <h3>Activity Timeline</h3>

            <div className="timeline">
              {selectedInvestigation.events.map((event, index) => (
                <div className="timeline-item" key={index}>
                  <div className="timeline-dot" />

                  <div className="timeline-content">
                    <div className="timeline-top">
                      <strong>{event.type}</strong>
                      <span>{event.time}</span>
                    </div>

                    <p>{event.description}</p>

                    <span
                      className={`timeline-severity ${getSeverityClass(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Devices */}

            <h3>Device Analysis</h3>

            <div className="device-list">
              {selectedInvestigation.devices.map((device) => (
                <div className="device-item" key={device}>
                  <div>
                    <strong>{device}</strong>
                    <span>Endpoint / monitored entity</span>
                  </div>

                  <span className="device-status">
                    Monitored
                  </span>
                </div>
              ))}
            </div>

            {/* Evidence */}

            <h3>Collected Evidence</h3>

            <div className="evidence-list">
              {selectedInvestigation.evidence.map((evidence) => (
                <div className="evidence-item" key={evidence}>
                  <span>✓</span>
                  {evidence}
                </div>
              ))}
            </div>

            {/* Actions */}

            <div className="investigation-actions">
              <button
                className="secondary-action"
                onClick={() =>
                  updateStatus(
                    selectedInvestigation.id,
                    "In Progress"
                  )
                }
              >
                Start Investigation
              </button>

              <button
                className="primary-action"
                onClick={() =>
                  updateStatus(
                    selectedInvestigation.id,
                    "Resolved"
                  )
                }
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Investigations;