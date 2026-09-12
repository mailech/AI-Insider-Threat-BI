import "../styles/PoisoningAnalysis.css";

function PoisoningAnalysis() {
  return (
    <main className="poisoning-page">
      <div className="page-header">
        <div>
          <h1>AI Poisoning Analysis</h1>
          <p>
            Analyze suspected poisoned data and evaluate potential
            backdoor behaviour in AI models.
          </p>
        </div>

        <span className="research-badge">
          Research-Based Analysis
        </span>
      </div>

      {/* Overview Cards */}
      <div className="poisoning-cards">
        <div className="analysis-card">
          <div className="card-icon">🗂️</div>
          <div>
            <h3>Total Training Samples</h3>
            <strong>150,000</strong>
            <span className="card-note">Analyzed dataset</span>
          </div>
        </div>

        <div className="analysis-card warning">
          <div className="card-icon">⚠️</div>
          <div>
            <h3>Suspected Poisoned</h3>
            <strong>250</strong>
            <span className="card-note">Samples requiring review</span>
          </div>
        </div>

        <div className="analysis-card danger">
          <div className="card-icon">🚨</div>
          <div>
            <h3>Attack Success Rate</h3>
            <strong>92%</strong>
            <span className="card-note">Triggered behaviour</span>
          </div>
        </div>

        <div className="analysis-card safe">
          <div className="card-icon">🛡️</div>
          <div>
            <h3>Clean Accuracy</h3>
            <strong>96%</strong>
            <span className="card-note">Normal behaviour</span>
          </div>
        </div>
      </div>

      {/* Main Analysis */}
      <div className="analysis-grid">
        {/* Poisoning Overview */}
        <section className="analysis-panel">
          <div className="panel-header">
            <div>
              <h2>Poisoning Overview</h2>
              <p>Dataset-level security assessment</p>
            </div>

            <span className="risk-badge high">HIGH RISK</span>
          </div>

          <div className="metric-row">
            <span>Clean Samples</span>
            <strong>149,750</strong>
          </div>

          <div className="metric-row">
            <span>Suspected Poisoned Samples</span>
            <strong>250</strong>
          </div>

          <div className="metric-row">
            <span>Poisoning Percentage</span>
            <strong>0.17%</strong>
          </div>

          <div className="metric-row">
            <span>Model Status</span>
            <strong className="status-warning">
              Requires Investigation
            </strong>
          </div>
        </section>

        {/* Model Behaviour */}
        <section className="analysis-panel">
          <div className="panel-header">
            <div>
              <h2>Model Behaviour</h2>
              <p>Trigger-based evaluation metrics</p>
            </div>
          </div>

          <div className="behaviour-metric">
            <div className="metric-title">
              <span>Attack Success Rate (ASR)</span>
              <strong>92%</strong>
            </div>

            <div className="progress">
              <div
                className="progress-fill asr"
                style={{ width: "92%" }}
              />
            </div>
          </div>

          <div className="behaviour-metric">
            <div className="metric-title">
              <span>Clean Accuracy (CA)</span>
              <strong>96%</strong>
            </div>

            <div className="progress">
              <div
                className="progress-fill ca"
                style={{ width: "96%" }}
              />
            </div>
          </div>

          <div className="behaviour-metric">
            <div className="metric-title">
              <span>Near-Trigger Accuracy (NTA)</span>
              <strong>94%</strong>
            </div>

            <div className="progress">
              <div
                className="progress-fill nta"
                style={{ width: "94%" }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Poisoning Analysis Table */}
      <section className="analysis-panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Poisoning Analysis</h2>
            <p>Detected indicators requiring security review</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="poisoning-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Observed Value</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Suspected Poison Samples</td>
                <td>250</td>
                <td>
                  <span className="table-risk high">High</span>
                </td>
                <td>Requires Review</td>
              </tr>

              <tr>
                <td>Trigger Response</td>
                <td>92% ASR</td>
                <td>
                  <span className="table-risk high">High</span>
                </td>
                <td>Detected</td>
              </tr>

              <tr>
                <td>Clean Behaviour</td>
                <td>96% CA</td>
                <td>
                  <span className="table-risk low">Low</span>
                </td>
                <td>Normal</td>
              </tr>

              <tr>
                <td>Near-Trigger Behaviour</td>
                <td>94% NTA</td>
                <td>
                  <span className="table-risk medium">Medium</span>
                </td>
                <td>Monitor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Research Insight */}
      <section className="research-insight">
        <div className="insight-icon">🔬</div>

        <div>
          <h2>Research Insight</h2>
          <p>
            The referenced research indicates that poisoning effectiveness
            is strongly influenced by the absolute number of poisoned
            samples rather than simply the percentage of poisoned data.
            The study evaluated backdoor behaviour using Clean Accuracy,
            Attack Success Rate and Near-Trigger Accuracy.
          </p>
        </div>
      </section>
    </main>
  );
}

export default PoisoningAnalysis;