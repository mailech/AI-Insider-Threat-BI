import { useMemo, useState } from "react";
import { demoEmployees } from "../data/demoData";
import "../styles/Employees.css";

function Employees() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const filteredEmployees = useMemo(() => {
    const query = search.toLowerCase().trim();

    return demoEmployees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.id.toLowerCase().includes(query) ||
        employee.name.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query);

      const matchesRisk =
        riskFilter === "All" || employee.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [search, riskFilter]);

  const criticalHigh = demoEmployees.filter(
    (employee) =>
      employee.riskLevel === "Critical" || employee.riskLevel === "High"
  ).length;

  const mediumRisk = demoEmployees.filter(
    (employee) => employee.riskLevel === "Medium"
  ).length;

  const lowRisk = demoEmployees.filter(
    (employee) => employee.riskLevel === "Low"
  ).length;

  return (
    <main className="employees-page">
      <div className="employees-header">
        <div>
          <h1>Insider Risk Monitoring</h1>
          <p>
            Monitor employee behaviour and identify potential insider threats.
          </p>
        </div>

        <div className="employee-count">
          {filteredEmployees.length} Employees
        </div>
      </div>

      <div className="employee-summary">
        <div className="employee-summary-card">
          <span>👥</span>
          <div>
            <p>Total Employees</p>
            <strong>{demoEmployees.length}</strong>
          </div>
        </div>

        <div className="employee-summary-card high">
          <span>🔴</span>
          <div>
            <p>Critical / High Risk</p>
            <strong>{criticalHigh}</strong>
          </div>
        </div>

        <div className="employee-summary-card medium">
          <span>🟠</span>
          <div>
            <p>Medium Risk</p>
            <strong>{mediumRisk}</strong>
          </div>
        </div>

        <div className="employee-summary-card low">
          <span>🟢</span>
          <div>
            <p>Low Risk</p>
            <strong>{lowRisk}</strong>
          </div>
        </div>
      </div>

      <div className="employee-controls">
        <input
          type="text"
          placeholder="🔎  Search employee, ID or department..."
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

      <div className="employees-table-wrapper">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Primary Risk</th>
              <th>Status</th>
              <th>Action</th>
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

                <td>
                  <strong>{employee.riskScore}/100</strong>
                </td>

                <td>
                  <span
                    className={`risk-badge ${employee.riskLevel.toLowerCase()}`}
                  >
                    {employee.riskLevel}
                  </span>
                </td>

                <td>{employee.primaryRisk}</td>

                <td>{employee.status}</td>

                <td>
                  <button
                    className="view-button"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <div
          className="employee-modal-overlay"
          onClick={() => setSelectedEmployee(null)}
        >
          <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employee-modal-header">
              <div>
                <span>EMPLOYEE PROFILE</span>
                <h2>{selectedEmployee.name}</h2>
                <p>{selectedEmployee.id}</p>
              </div>

              <button onClick={() => setSelectedEmployee(null)}>×</button>
            </div>

            <div className="employee-profile-grid">
              <div>
                <span>Department</span>
                <strong>{selectedEmployee.department}</strong>
              </div>

              <div>
                <span>Role</span>
                <strong>{selectedEmployee.role}</strong>
              </div>

              <div>
                <span>Manager</span>
                <strong>{selectedEmployee.manager}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{selectedEmployee.location}</strong>
              </div>

              <div>
                <span>Device</span>
                <strong>{selectedEmployee.device}</strong>
              </div>

              <div>
                <span>Risk Score</span>
                <strong>{selectedEmployee.riskScore}/100</strong>
              </div>

              <div>
                <span>Risk Level</span>
                <strong>{selectedEmployee.riskLevel}</strong>
              </div>

              <div>
                <span>Primary Risk</span>
                <strong>{selectedEmployee.primaryRisk}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Employees;