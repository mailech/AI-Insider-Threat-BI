
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Reports.css";

function Reports() {
  const handleGenerateReport = () => {
    alert(
      "Security report generated successfully.\n\nThis prototype report contains the latest insider-threat and AI security analysis."
    );
  };

  return (
    <>
      <Sidebar />
      <Navbar />

      <main className="reports-page">

        {/* Header */}
        <div className="reports-header">
          <div>
            <h1>Security Reports</h1>
            <p>
              Review security intelligence, insider-risk statistics and
              AI security findings.
            </p>
          </div>

          <button
            className="generate-report-button"
            onClick={handleGenerateReport}
          >
            📄 Generate Report
          </button>
        </div>

        {/* Report Overview */}
        <section className="report-panel">

          <div className="report-panel-header">
            <div>
              <h2>Security Overview</h2>
              <p>Current platform security status</p>
            </div>

            <span className="report-status">
              ● Operational
            </span>
          </div>

          <div className="report-stats">

            <div>
              <span>Total Employees</span>
              <strong>250</strong>
            </div>

            <div>
              <span>Total Alerts</span>
              <strong>15</strong>
            </div>

            <div>
              <span>High Risk Users</span>
              <strong>8</strong>
            </div>

            <div>
              <span>Open Investigations</span>
              <strong>5</strong>
            </div>

          </div>
        </section>

        {/* Two-column reports */}
        <div className="reports-grid">

          {/* Threat Categories */}
          <section className="report-panel">

            <div className="report-panel-header">
              <div>
                <h2>Threat Categories</h2>
                <p>Distribution of detected security events</p>
              </div>
            </div>

            <div className="threat-list">

              <div className="threat-row">
                <div className="threat-info">
                  <span>Unusual Login</span>
                  <strong>35%</strong>
                </div>

                <div className="report-progress">
                  <div
                    className="report-progress-fill login"
                    style={{ width: "35%" }}
                  ></div>
                </div>
              </div>

              <div className="threat-row">
                <div className="threat-info">
                  <span>Data Transfer</span>
                  <strong>25%</strong>
                </div>

                <div className="report-progress">
                  <div
                    className="report-progress-fill transfer"
                    style={{ width: "25%" }}
                  ></div>
                </div>
              </div>

              <div className="threat-row">
                <div className="threat-info">
                  <span>File Access</span>
                  <strong>20%</strong>
                </div>

                <div className="report-progress">
                  <div
                    className="report-progress-fill file"
                    style={{ width: "20%" }}
                  ></div>
                </div>
              </div>

              <div className="threat-row">
                <div className="threat-info">
                  <span>Authentication Failures</span>
                  <strong>12%</strong>
                </div>

                <div className="report-progress">
                  <div
                    className="report-progress-fill auth"
                    style={{ width: "12%" }}
                  ></div>
                </div>
              </div>

              <div className="threat-row">
                <div className="threat-info">
                  <span>Other Activities</span>
                  <strong>8%</strong>
                </div>

                <div className="report-progress">
                  <div
                    className="report-progress-fill other"
                    style={{ width: "8%" }}
                  ></div>
                </div>
              </div>

            </div>
          </section>

          {/* Risk Summary */}
          <section className="report-panel">

            <div className="report-panel-header">
              <div>
                <h2>Employee Risk Summary</h2>
                <p>Current insider-risk distribution</p>
              </div>
            </div>

            <div className="risk-report">

              <div className="risk-report-item">
                <div className="risk-report-title">
                  <span className="risk-dot low"></span>
                  <span>Low Risk</span>
                  <strong>182</strong>
                </div>

                <div className="risk-track">
                  <div
                    className="risk-fill low"
                    style={{ width: "73%" }}
                  ></div>
                </div>
              </div>

              <div className="risk-report-item">
                <div className="risk-report-title">
                  <span className="risk-dot medium"></span>
                  <span>Medium Risk</span>
                  <strong>60</strong>
                </div>

                <div className="risk-track">
                  <div
                    className="risk-fill medium"
                    style={{ width: "24%" }}
                  ></div>
                </div>
              </div>

              <div className="risk-report-item">
                <div className="risk-report-title">
                  <span className="risk-dot high"></span>
                  <span>High Risk</span>
                  <strong>8</strong>
                </div>

                <div className="risk-track">
                  <div
                    className="risk-fill high"
                    style={{ width: "3%" }}
                  ></div>
                </div>
              </div>

            </div>

            <div className="risk-summary-message">
              <strong>Overall Risk Level: Moderate</strong>
              <p>
                Most monitored employees currently fall within the low-risk
                category, while high-risk users require continued
                investigation.
              </p>
            </div>

          </section>
        </div>

        {/* AI Security Report */}
        <section className="report-panel ai-report">

          <div className="report-panel-header">
            <div>
              <h2>AI Security Analysis</h2>
              <p>Model and training-data security indicators</p>
            </div>

            <span className="ai-risk-badge">
              Attention Required
            </span>
          </div>

          <div className="ai-metrics">

            <div className="ai-metric">
              <span>Suspected Poisoned Samples</span>
              <strong>250</strong>
              <small>Samples requiring review</small>
            </div>

            <div className="ai-metric">
              <span>Attack Success Rate</span>
              <strong>92%</strong>
              <small>Triggered behaviour</small>
            </div>

            <div className="ai-metric">
              <span>Clean Accuracy</span>
              <strong>96%</strong>
              <small>Normal behaviour</small>
            </div>

            <div className="ai-metric">
              <span>Near-Trigger Accuracy</span>
              <strong>94%</strong>
              <small>Near-trigger evaluation</small>
            </div>

          </div>

        </section>

        {/* Findings */}
        <div className="reports-grid">

          <section className="report-panel">

            <div className="report-panel-header">
              <div>
                <h2>Key Findings</h2>
                <p>Important observations from current analysis</p>
              </div>
            </div>

            <div className="finding-list">

              <div className="finding">
                <span className="finding-icon danger">!</span>
                <div>
                  <strong>High-risk employee activity detected</strong>
                  <p>
                    Several employees currently require additional
                    investigation based on their security activity.
                  </p>
                </div>
              </div>

              <div className="finding">
                <span className="finding-icon warning">!</span>
                <div>
                  <strong>Suspicious AI training data detected</strong>
                  <p>
                    The poisoning analysis module has identified samples
                    requiring security review.
                  </p>
                </div>
              </div>

              <div className="finding">
                <span className="finding-icon safe">✓</span>
                <div>
                  <strong>Normal activity remains dominant</strong>
                  <p>
                    The majority of monitored employee activity currently
                    remains within the low-risk category.
                  </p>
                </div>
              </div>

            </div>

          </section>

          {/* Recommendations */}
          <section className="report-panel">

            <div className="report-panel-header">
              <div>
                <h2>Security Recommendations</h2>
                <p>Suggested actions for security teams</p>
              </div>
            </div>

            <ul className="recommendation-list">
              <li>
                Review and investigate all high-risk employee alerts.
              </li>

              <li>
                Analyze suspicious training samples before model deployment.
              </li>

              <li>
                Monitor unusual login and data-transfer behaviour.
              </li>

              <li>
                Evaluate AI models for unexpected trigger-based behaviour.
              </li>

              <li>
                Maintain continuous security monitoring and periodic reviews.
              </li>
            </ul>

          </section>

        </div>

        {/* Footer */}
        <div className="report-footer">
          <span>AI Insider Threat & Security Intelligence Platform</span>
          <span>Report Status: Prototype Analysis</span>
        </div>

      </main>
    </>
  );
}

export default Reports;