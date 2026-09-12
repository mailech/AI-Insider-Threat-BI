
import { useMemo, useState } from "react";
import "../styles/RiskScoring.css";

const employees = [
  {
    id: "EMP001",
    name: "Rahul Sharma",
    department: "Engineering",
    components: {
      behavioral: 82,
      privilege: 70,
      dataAccess: 65,
      accessPattern: 58,
      historical: 40,
    },
  },
  {
    id: "EMP002",
    name: "Priya Reddy",
    department: "Finance",
    components: {
      behavioral: 35,
      privilege: 20,
      dataAccess: 25,
      accessPattern: 30,
      historical: 10,
    },
  },
  {
    id: "EMP003",
    name: "Arjun Kumar",
    department: "IT Security",
    components: {
      behavioral: 75,
      privilege: 88,
      dataAccess: 80,
      accessPattern: 72,
      historical: 65,
    },
  },
  {
    id: "EMP004",
    name: "Sneha Patel",
    department: "HR",
    components: {
      behavioral: 22,
      privilege: 15,
      dataAccess: 18,
      accessPattern: 20,
      historical: 8,
    },
  },
  {
    id: "EMP005",
    name: "Vikram Singh",
    department: "Operations",
    components: {
      behavioral: 60,
      privilege: 55,
      dataAccess: 72,
      accessPattern: 65,
      historical: 45,
    },
  },
  {
    id: "EMP006",
    name: "Ananya Rao",
    department: "Engineering",
    components: {
      behavioral: 28,
      privilege: 30,
      dataAccess: 22,
      accessPattern: 25,
      historical: 12,
    },
  },
];

const weights = {
  behavioral: 0.35,
  privilege: 0.25,
  dataAccess: 0.2,
  accessPattern: 0.1,
  historical: 0.1,
};

const labels = {
  behavioral: "Behavioral Anomalies",
  privilege: "Privilege Misuse Indicators",
  dataAccess: "Data Access Violations",
  accessPattern: "Access Pattern Deviations",
  historical: "Historical Security Events",
};

function calculateRisk(components) {
  return Math.round(
    components.behavioral * weights.behavioral +
      components.privilege * weights.privilege +
      components.dataAccess * weights.dataAccess +
      components.accessPattern * weights.accessPattern +
      components.historical * weights.historical
  );
}

function getRiskLevel(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function RiskScoring() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const processedEmployees = useMemo(() => {
    return employees.map((employee) => {
      const score = calculateRisk(employee.components);

      return {
        ...employee,
        score,
        risk: getRiskLevel(score),
      };
    });
  }, []);

  const filteredEmployees = processedEmployees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.id.toLowerCase().includes(search.toLowerCase()) ||
      employee.department.toLowerCase().includes(search.toLowerCase());

    const matchesRisk =
      riskFilter === "All" || employee.risk === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const critical = processedEmployees.filter(
    (employee) => employee.risk === "Critical"
  ).length;

  const high = processedEmployees.filter(
    (employee) => employee.risk === "High"
  ).length;

  const medium = processedEmployees.filter(
    (employee) => employee.risk === "Medium"
  ).length;

  const low = processedEmployees.filter(
    (employee) => employee.risk === "Low"
  ).length;

  return (
    <div className="risk-page">
      <div className="risk-header">
        <div>
          <h1>Insider Risk Scoring</h1>
          <p>
            Explainable risk assessment based on behavioral and security
            indicators.
          </p>
        </div>

        <div className="risk-model-badge">
          Weighted Risk Model
        </div>
      </div>

      <div className="risk-model-card">
        <h2>Risk Calculation Model</h2>

        <div className="weight-grid">
          {Object.entries(weights).map(([key, weight]) => (
            <div className="weight-item" key={key}>
              <span>{labels[key]}</span>
              <strong>{weight * 100}%</strong>
            </div>
          ))}
        </div>

        <div className="formula-box">
          Risk Score = (Behavioral × 35%) + (Privilege × 25%) +
          (Data Access × 20%) + (Access Pattern × 10%) +
          (Historical Events × 10%)
        </div>
      </div>

      <div className="risk-summary">
        <div className="risk-summary-card critical">
          <span>Critical Risk</span>
          <strong>{critical}</strong>
        </div>

        <div className="risk-summary-card high">
          <span>High Risk</span>
          <strong>{high}</strong>
        </div>

        <div className="risk-summary-card medium">
          <span>Medium Risk</span>
          <strong>{medium}</strong>
        </div>

        <div className="risk-summary-card low">
          <span>Low Risk</span>
          <strong>{low}</strong>
        </div>
      </div>

      <div className="risk-controls">
        <input
          type="text"
          placeholder="Search employee, ID or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="All">All Risk Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="risk-table-card">
        <div className="section-heading">
          <div>
            <h2>Employee Risk Assessment</h2>
            <p>Calculated from five weighted risk dimensions.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Behavioral</th>
                <th>Privilege</th>
                <th>Data Access</th>
                <th>Pattern</th>
                <th>Historical</th>
                <th>Risk Score</th>
                <th>Level</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.name}</strong>
                    <small>{employee.id}</small>
                  </td>

                  <td>{employee.department}</td>

                  <td>{employee.components.behavioral}</td>
                  <td>{employee.components.privilege}</td>
                  <td>{employee.components.dataAccess}</td>
                  <td>{employee.components.accessPattern}</td>
                  <td>{employee.components.historical}</td>

                  <td>
                    <div className="score-cell">
                      <strong>{employee.score}</strong>
                      <div className="score-bar">
                        <span
                          style={{ width: `${employee.score}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`risk-badge ${employee.risk.toLowerCase()}`}
                    >
                      {employee.risk}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-risk-btn"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      Explain
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <div
          className="risk-modal-overlay"
          onClick={() => setSelectedEmployee(null)}
        >
          <div
            className="risk-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{selectedEmployee.name}</h2>
                <p>
                  {selectedEmployee.id} •{" "}
                  {selectedEmployee.department}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                ×
              </button>
            </div>

            <div className="overall-risk">
              <div>
                <span>Overall Risk Score</span>
                <strong>{selectedEmployee.score}/100</strong>
              </div>

              <span
                className={`risk-badge ${selectedEmployee.risk.toLowerCase()}`}
              >
                {selectedEmployee.risk}
              </span>
            </div>

            <h3>Risk Contribution Breakdown</h3>

            <div className="component-list">
              {Object.entries(selectedEmployee.components).map(
                ([key, value]) => {
                  const contribution = Math.round(
                    value * weights[key]
                  );

                  return (
                    <div className="component-row" key={key}>
                      <div>
                        <strong>{labels[key]}</strong>
                        <span>
                          Score: {value} × Weight:{" "}
                          {weights[key] * 100}%
                        </span>
                      </div>

                      <div className="component-result">
                        <span>{contribution}</span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="explanation-box">
              <strong>Risk Interpretation</strong>
              <p>
                This score is calculated from behavioral anomalies,
                privilege misuse, data access violations, access
                pattern deviations and historical security events.
                The weighted contributions show which factors are
                driving the employee's current risk level.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskScoring;