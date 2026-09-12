import { useMemo, useState } from "react";
import {
  demoEmployees,
  demoBehavior,
} from "../data/demoData";
import "../styles/BehaviorAnalytics.css";

const metrics = [
  {
    key: "loginPattern",
    title: "Login Pattern",
    explanation: "Authentication behavior",
  },
  {
    key: "workPattern",
    title: "Work Pattern",
    explanation: "Normal working behavior",
  },
  {
    key: "filesAccessed",
    title: "File Access",
    explanation: "Files accessed per day",
  },
  {
    key: "dataTransfer",
    title: "Data Transfer",
    explanation: "Average daily transfer",
  },
  {
    key: "devices",
    title: "Device Usage",
    explanation: "Known devices used",
  },
];

function BehaviorAnalytics() {
  const [selectedId, setSelectedId] = useState(
    demoEmployees[0].id
  );
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const departments = useMemo(
    () => [
      "All",
      ...new Set(demoEmployees.map((e) => e.department)),
    ],
    []
  );

  const visibleEmployees = useMemo(() => {
    if (departmentFilter === "All") return demoEmployees;

    return demoEmployees.filter(
      (employee) => employee.department === departmentFilter
    );
  }, [departmentFilter]);

  const selectedEmployee =
    demoEmployees.find((employee) => employee.id === selectedId) ||
    demoEmployees[0];

  const behavior = demoBehavior[selectedEmployee.id];

  const deviationLevel =
    behavior.deviation >= 75
      ? "Critical"
      : behavior.deviation >= 40
      ? "High"
      : behavior.deviation >= 20
      ? "Medium"
      : "Normal";

  return (
    <div className="behavior-page">

      {/* Header */}
      <div className="behavior-header">
        <div>
          <p className="behavior-kicker">
            BEHAVIORAL INTELLIGENCE
          </p>

          <h1>Behavior Analytics</h1>

          <p>
            Compare employee activity against established
            behavioral baselines and identify meaningful
            deviations.
          </p>
        </div>

        <div className="baseline-status">
          <span></span>
          Baselines Active
        </div>
      </div>

      {/* Summary */}
      <div className="behavior-summary">

        <div className="behavior-stat">
          <span>Profiles Monitored</span>
          <strong>{demoEmployees.length}</strong>
          <small>Demo employee profiles</small>
        </div>

        <div className="behavior-stat">
          <span>Elevated Profiles</span>
          <strong>
            {
              demoEmployees.filter(
                (employee) =>
                  demoBehavior[employee.id].deviation >= 40
              ).length
            }
          </strong>
          <small>Behavioral deviations detected</small>
        </div>

        <div className="behavior-stat">
          <span>Avg. Deviation</span>
          <strong>{behavior.deviation}%</strong>
          <small>{selectedEmployee.name}</small>
        </div>

        <div className="behavior-stat">
          <span>Risk Level</span>
          <strong>{selectedEmployee.riskLevel}</strong>
          <small>Current behavioral assessment</small>
        </div>

      </div>

      {/* Main */}
      <div className="behavior-layout">

        {/* Employee list */}
        <section className="employee-list-panel">

          <div className="section-heading">
            <div>
              <h2>Behavior Profiles</h2>
              <p>Select an employee to inspect their baseline.</p>
            </div>

            <select
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(e.target.value)
              }
            >
              {departments.map((department) => (
                <option key={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-list">

            {visibleEmployees.map((employee) => {
              const employeeBehavior =
                demoBehavior[employee.id];

              const elevated =
                employeeBehavior.deviation >= 40;

              return (
                <button
                  key={employee.id}
                  className={`profile-item ${
                    employee.id === selectedEmployee.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => setSelectedId(employee.id)}
                >
                  <div className="profile-main">
                    <strong>{employee.name}</strong>

                    <span>
                      {employee.id} · {employee.department}
                    </span>
                  </div>

                  <div className="profile-risk">
                    <strong>
                      {elevated ? "!" : "✓"}
                    </strong>

                    <span>
                      {employeeBehavior.deviation}% deviation
                    </span>
                  </div>
                </button>
              );
            })}

          </div>
        </section>

        {/* Baseline */}
        <section className="baseline-panel">

          <div className="baseline-heading">
            <div>

              <span className="employee-id">
                {selectedEmployee.id}
              </span>

              <h2>{selectedEmployee.name}</h2>

              <p>{selectedEmployee.department}</p>

            </div>

            <div className="baseline-score">
              <span>Risk Score</span>
              <strong>
                {selectedEmployee.riskScore}
              </strong>
            </div>
          </div>

          <div className="baseline-intro">

            <div>
              <h3>Behavioral Baseline Comparison</h3>

              <p>
                Current activity is compared against the
                employee's established behavioral pattern.
              </p>
            </div>

            <span
              className={`deviation-badge ${
                behavior.deviation >= 40
                  ? "elevated"
                  : "normal"
              }`}
            >
              {deviationLevel} deviation
            </span>

          </div>

          <div className="metric-grid">

            <div className="metric-card">

              <div className="metric-card-header">
                <div>
                  <h3>Login Pattern</h3>
                  <span>
                    Authentication behavior
                  </span>
                </div>

                <span
                  className={`metric-level level-${
                    deviationLevel.toLowerCase()
                  }`}
                >
                  {deviationLevel}
                </span>
              </div>

              <div className="metric-values">

                <div>
                  <span>Baseline</span>
                  <strong>
                    {behavior.baseline}
                  </strong>
                </div>

                <div>
                  <span>Current</span>
                  <strong>
                    {behavior.current}
                  </strong>
                </div>

                <div>
                  <span>Deviation</span>
                  <strong>
                    {behavior.deviation}%
                  </strong>
                </div>

              </div>

              <div className="comparison-bar">
                <div
                  style={{
                    width: `${Math.min(
                      behavior.deviation,
                      100
                    )}%`,
                  }}
                />
              </div>

            </div>

            {/* Work pattern */}
            <div className="metric-card">

              <div className="metric-card-header">
                <div>
                  <h3>Work Pattern</h3>
                  <span>Normal working behavior</span>
                </div>

                <span className="metric-level level-normal">
                  Stable
                </span>
              </div>

              <div className="metric-values">
                <div>
                  <span>Baseline</span>
                  <strong>Regular</strong>
                </div>

                <div>
                  <span>Current</span>
                  <strong>Monitored</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>Stable</strong>
                </div>
              </div>

            </div>

            {/* File Access */}
            <div className="metric-card">

              <div className="metric-card-header">
                <div>
                  <h3>File Access</h3>
                  <span>Files accessed per day</span>
                </div>

                <span className="metric-level level-medium">
                  Monitor
                </span>
              </div>

              <div className="metric-values">
                <div>
                  <span>Current</span>
                  <strong>
                    {behavior.filesAccessed}
                  </strong>
                </div>

                <div>
                  <span>Expected</span>
                  <strong>25</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {behavior.filesAccessed > 40
                      ? "Elevated"
                      : "Normal"}
                  </strong>
                </div>
              </div>

            </div>

            {/* Data Transfer */}
            <div className="metric-card">

              <div className="metric-card-header">
                <div>
                  <h3>Data Transfer</h3>
                  <span>Average daily transfer</span>
                </div>

                <span className="metric-level level-high">
                  Monitor
                </span>
              </div>

              <div className="metric-values">
                <div>
                  <span>Current</span>
                  <strong>
                    {behavior.dataTransfer}
                  </strong>
                </div>

                <div>
                  <span>Expected</span>
                  <strong>2.0 GB/day</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    Elevated
                  </strong>
                </div>
              </div>

            </div>

            {/* Devices */}
            <div className="metric-card">

              <div className="metric-card-header">
                <div>
                  <h3>Device Usage</h3>
                  <span>Known devices used</span>
                </div>

                <span className="metric-level level-normal">
                  Stable
                </span>
              </div>

              <div className="metric-values">
                <div>
                  <span>Current</span>
                  <strong>
                    {behavior.devices}
                  </strong>
                </div>

                <div>
                  <span>Expected</span>
                  <strong>2</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>Normal</strong>
                </div>
              </div>

            </div>

          </div>

          <div className="behavior-observations">

            <h3>Behavioral Observations</h3>

            <ul>

              <li>
                <span></span>

                <div>
                  <strong>
                    Primary Risk Indicator
                  </strong>

                  <p>
                    {selectedEmployee.primaryRisk}
                  </p>
                </div>
              </li>

              <li>
                <span></span>

                <div>
                  <strong>
                    Current Behavior
                  </strong>

                  <p>
                    {behavior.current}
                  </p>
                </div>
              </li>

              <li>
                <span></span>

                <div>
                  <strong>
                    Baseline
                  </strong>

                  <p>
                    {behavior.baseline}
                  </p>
                </div>
              </li>

            </ul>

          </div>

        </section>

      </div>

    </div>
  );
}

export default BehaviorAnalytics;