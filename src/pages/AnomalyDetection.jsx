import { useMemo, useState } from "react";
import "../styles/AnomalyDetection.css";

const initialFindings = [
  {
    id: "ANM-001",
    employee: "Arjun Rao",
    employeeId: "EMP-001",
    department: "Engineering",
    category: "Unusual Login",
    description: "Login occurred significantly outside the normal work schedule.",
    detected: "2026-09-11 22:16",
    anomalyScore: 94,
    confidence: 96,
    severity: "Critical",
    source: "Behavior Baseline",
    status: "Open",
  },
  {
    id: "ANM-002",
    employee: "Meena Patel",
    employeeId: "EMP-005",
    department: "Operations",
    category: "Excessive Data Transfer",
    description: "Outbound data volume is substantially above the historical baseline.",
    detected: "2026-09-11 18:51",
    anomalyScore: 91,
    confidence: 93,
    severity: "Critical",
    source: "Statistical Analysis",
    status: "Open",
  },
  {
    id: "ANM-003",
    employee: "Kiran Kumar",
    employeeId: "EMP-007",
    department: "IT",
    category: "Privilege Misuse",
    description: "Administrative privilege was added to an account outside the normal access pattern.",
    detected: "2026-09-11 16:25",
    anomalyScore: 89,
    confidence: 91,
    severity: "Critical",
    source: "Rule Detection",
    status: "Investigating",
  },
  {
    id: "ANM-004",
    employee: "Rahul Sharma",
    employeeId: "EMP-003",
    department: "Sales",
    category: "Abnormal Download",
    description: "File download activity exceeded the employee's normal behavioral baseline.",
    detected: "2026-09-11 15:08",
    anomalyScore: 78,
    confidence: 86,
    severity: "High",
    source: "Isolation Forest",
    status: "Open",
  },
  {
    id: "ANM-005",
    employee: "Sneha Reddy",
    employeeId: "EMP-004",
    department: "Finance",
    category: "New Network Location",
    description: "Activity originated from a location not previously associated with the employee.",
    detected: "2026-09-11 11:26",
    anomalyScore: 64,
    confidence: 79,
    severity: "Medium",
    source: "Peer Comparison",
    status: "Review",
  },
  {
    id: "ANM-006",
    employee: "Priya Nair",
    employeeId: "EMP-006",
    department: "HR",
    category: "Device Anomaly",
    description: "A previously unseen removable device was connected to the endpoint.",
    detected: "2026-09-11 14:37",
    anomalyScore: 57,
    confidence: 74,
    severity: "Medium",
    source: "Rule Detection",
    status: "Review",
  },
  {
    id: "ANM-007",
    employee: "Vikram Singh",
    employeeId: "EMP-002",
    department: "Engineering",
    category: "Normal Deviation",
    description: "Minor variation detected but activity remains within acceptable limits.",
    detected: "2026-09-11 13:52",
    anomalyScore: 28,
    confidence: 91,
    severity: "Low",
    source: "Isolation Forest",
    status: "Closed",
  },
];

const severityOptions = ["All", "Critical", "High", "Medium", "Low"];

function getScoreClass(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function AnomalyDetection() {
  const [findings, setFindings] = useState(initialFindings);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [selectedFinding, setSelectedFinding] = useState(null);

  const filteredFindings = useMemo(() => {
    const query = search.toLowerCase().trim();

    return findings.filter((finding) => {
      const matchesSearch =
        !query ||
        finding.employee.toLowerCase().includes(query) ||
        finding.employeeId.toLowerCase().includes(query) ||
        finding.category.toLowerCase().includes(query) ||
        finding.description.toLowerCase().includes(query);

      const matchesSeverity =
        severity === "All" || finding.severity === severity;

      return matchesSearch && matchesSeverity;
    });
  }, [findings, search, severity]);

  const summary = {
    total: findings.length,
    critical: findings.filter((item) => item.severity === "Critical").length,
    high: findings.filter((item) => item.severity === "High").length,
    investigating: findings.filter(
      (item) => item.status === "Investigating"
    ).length,
  };

  const averageScore = Math.round(
    findings.reduce((sum, item) => sum + item.anomalyScore, 0) /
      findings.length
  );

  const markInvestigating = (id) => {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === id
          ? { ...finding, status: "Investigating" }
          : finding
      )
    );

    setSelectedFinding(null);
  };

  const closeFinding = (id) => {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === id
          ? { ...finding, status: "Closed" }
          : finding
      )
    );

    setSelectedFinding(null);
  };

  return (
    <div className="anomaly-page">
      <div className="anomaly-header">
        <div>
          <p className="anomaly-kicker">THREAT DETECTION ENGINE</p>
          <h1>Anomaly Detection</h1>
          <p>
            Identify employee behavior that significantly deviates from
            established behavioral patterns.
          </p>
        </div>

        <div className="engine-status">
          <span></span>
          Detection Engine Active
        </div>
      </div>

      <div className="anomaly-summary">
        <div className="anomaly-stat">
          <span>Total Findings</span>
          <strong>{summary.total}</strong>
          <small>Detected behavioral deviations</small>
        </div>

        <div className="anomaly-stat">
          <span>Critical</span>
          <strong>{summary.critical}</strong>
          <small>Immediate attention required</small>
        </div>

        <div className="anomaly-stat">
          <span>High Severity</span>
          <strong>{summary.high}</strong>
          <small>Elevated threat indicators</small>
        </div>

        <div className="anomaly-stat">
          <span>Investigating</span>
          <strong>{summary.investigating}</strong>
          <small>Active security investigations</small>
        </div>
      </div>

      <div className="detection-overview">
        <div>
          <span>Average anomaly score</span>
          <strong>{averageScore}/100</strong>
        </div>

        <div className="overview-track">
          <div
            style={{
              width: `${averageScore}%`,
            }}
          ></div>
        </div>

        <p>
          Higher scores indicate stronger deviation from expected behavior.
        </p>
      </div>

      <div className="anomaly-toolbar">
        <input
          type="text"
          placeholder="Search employee, anomaly or description..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          {severityOptions.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All Severities" : option}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch("");
            setSeverity("All");
          }}
        >
          Clear
        </button>
      </div>

      <section className="anomaly-panel">
        <div className="anomaly-panel-header">
          <div>
            <h2>Detected Anomalies</h2>
            <p>
              {filteredFindings.length} findings matching the current filters
            </p>
          </div>

          <span className="analysis-label">ANALYSIS ACTIVE</span>
        </div>

        <div className="anomaly-table-wrapper">
          <table className="anomaly-table">
            <thead>
              <tr>
                <th>Finding</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Detected</th>
                <th>Anomaly Score</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Detection Method</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredFindings.map((finding) => (
                <tr
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                >
                  <td>
                    <strong>{finding.id}</strong>
                  </td>

                  <td>
                    <div className="anomaly-employee">
                      <strong>{finding.employee}</strong>
                      <span>
                        {finding.employeeId} · {finding.department}
                      </span>
                    </div>
                  </td>

                  <td>{finding.category}</td>

                  <td>{finding.detected}</td>

                  <td>
                    <div className="score-container">
                      <strong>{finding.anomalyScore}</strong>
                      <div className="score-track">
                        <div
                          className={`score-fill ${getScoreClass(
                            finding.anomalyScore
                          )}`}
                          style={{
                            width: `${finding.anomalyScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  <td>{finding.confidence}%</td>

                  <td>
                    <span
                      className={`anomaly-severity severity-${finding.severity.toLowerCase()}`}
                    >
                      {finding.severity}
                    </span>
                  </td>

                  <td>
                    <span className="method-badge">{finding.source}</span>
                  </td>

                  <td>
                    <span
                      className={`finding-status status-${finding.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {finding.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredFindings.length === 0 && (
                <tr>
                  <td colSpan="9" className="anomaly-empty">
                    No anomaly findings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detection-methods">
        <h2>Detection Methods</h2>

        <div className="method-grid">
          <div className="method-card">
            <div className="method-icon">◈</div>
            <div>
              <h3>Behavior Baseline</h3>
              <p>
                Detects deviations from an employee's established behavioral
                pattern.
              </p>
            </div>
          </div>

          <div className="method-card">
            <div className="method-icon">σ</div>
            <div>
              <h3>Statistical Analysis</h3>
              <p>
                Identifies activity that significantly differs from historical
                statistical behavior.
              </p>
            </div>
          </div>

          <div className="method-card">
            <div className="method-icon">AI</div>
            <div>
              <h3>Isolation Forest</h3>
              <p>
                Machine-learning based outlier detection for behavioral
                feature vectors.
              </p>
            </div>
          </div>

          <div className="method-card">
            <div className="method-icon">⇄</div>
            <div>
              <h3>Peer Comparison</h3>
              <p>
                Compares user activity against similar users or peer groups.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="detection-note">
        <strong>Detection pipeline:</strong>
        <span>
          Activity signals → behavioral baseline → anomaly features →
          detection models → anomaly score → security alert.
        </span>
      </div>

      {selectedFinding && (
        <div
          className="anomaly-modal-overlay"
          onClick={() => setSelectedFinding(null)}
        >
          <div
            className="anomaly-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="anomaly-modal-header">
              <div>
                <span>ANOMALY FINDING</span>
                <h2>{selectedFinding.id}</h2>
              </div>

              <button onClick={() => setSelectedFinding(null)}>×</button>
            </div>

            <div className="finding-title-row">
              <div>
                <h3>{selectedFinding.category}</h3>
                <p>{selectedFinding.description}</p>
              </div>

              <span
                className={`anomaly-severity severity-${selectedFinding.severity.toLowerCase()}`}
              >
                {selectedFinding.severity}
              </span>
            </div>

            <div className="finding-score-box">
              <div>
                <span>Anomaly Score</span>
                <strong>{selectedFinding.anomalyScore}/100</strong>
              </div>

              <div>
                <span>Confidence</span>
                <strong>{selectedFinding.confidence}%</strong>
              </div>

              <div>
                <span>Detection Method</span>
                <strong>{selectedFinding.source}</strong>
              </div>
            </div>

            <div className="finding-details">
              <div>
                <span>Employee</span>
                <strong>{selectedFinding.employee}</strong>
              </div>

              <div>
                <span>Employee ID</span>
                <strong>{selectedFinding.employeeId}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{selectedFinding.department}</strong>
              </div>

              <div>
                <span>Detected</span>
                <strong>{selectedFinding.detected}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedFinding.status}</strong>
              </div>
            </div>

            <div className="anomaly-modal-actions">
              <button
                className="anomaly-secondary"
                onClick={() => setSelectedFinding(null)}
              >
                Close
              </button>

              {selectedFinding.status !== "Investigating" &&
                selectedFinding.status !== "Closed" && (
                  <button
                    className="anomaly-primary"
                    onClick={() =>
                      markInvestigating(selectedFinding.id)
                    }
                  >
                    Start Investigation
                  </button>
                )}

              {selectedFinding.status !== "Closed" && (
                <button
                  className="anomaly-close"
                  onClick={() => closeFinding(selectedFinding.id)}
                >
                  Close Finding
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnomalyDetection;