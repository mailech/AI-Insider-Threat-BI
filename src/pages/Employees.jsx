import { useEffect, useState } from "react";
import { getEmployees, getEmployeeRisk } from "../services/api";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const token = localStorage.getItem("token");

        const employeeData = await getEmployees(token);

        setEmployees(employeeData);

        const risks = await Promise.all(
          employeeData.map((employee) =>
            getEmployeeRisk(employee.employee_id, token)
          )
        );

        setRiskData(risks);
      } catch (error) {
        console.error("Employees API error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const getEmployeeRiskData = (employeeId) => {
    return riskData.find(
      (risk) => risk.employee_id === employeeId
    );
  };

  const getRiskStyle = (status) => {
    if (status === "CRITICAL" || status === "HIGH") {
      return {
        color: "#ef4444",
        background: "rgba(239, 68, 68, 0.12)",
      };
    }

    if (status === "MEDIUM") {
      return {
        color: "#f59e0b",
        background: "rgba(245, 158, 11, 0.12)",
      };
    }

    return {
      color: "#22c55e",
      background: "rgba(34, 197, 94, 0.12)",
    };
  };

  const filteredEmployees = employees.filter((employee) => {
    const searchText = search.toLowerCase();

    const risk = getEmployeeRiskData(
      employee.employee_id
    );

    const status = risk?.threat_level || "LOW";

    const matchesSearch =
      employee.name
        .toLowerCase()
        .includes(searchText) ||
      (employee.department || "")
        .toLowerCase()
        .includes(searchText) ||
      employee.employee_id
        .toLowerCase()
        .includes(searchText);

    const matchesFilter =
      filter === "All" || status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div
      style={{
        width: "100%",
        color: "#f5f7fb",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "28px",
          }}
        >
          Employees
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Monitor employee activity and risk levels
        </p>
      </div>

      {/* SEARCH + FILTER */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search employee, ID or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            height: "45px",
            padding: "0 14px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            outline: "none",
            fontSize: "13px",
          }}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            height: "45px",
            padding: "0 14px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="All">All Risk Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>
      </div>

      {/* TABLE */}

      <div
        style={{
          background: "rgba(18, 26, 43, 0.88)",
          border:
            "1px solid rgba(148, 163, 184, 0.13)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow:
            "0 15px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #273449",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            Employee Risk Overview
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            {loading
              ? "Loading employees..."
              : `${filteredEmployees.length} employees found`}
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={headerStyle}>Employee</th>
                <th style={headerStyle}>Department</th>
                <th style={headerStyle}>Risk Score</th>
                <th style={headerStyle}>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#8994a8",
                    }}
                  >
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const risk =
                    getEmployeeRiskData(
                      employee.employee_id
                    );

                  const score =
                    risk?.threat_score || 0;

                  const status =
                    risk?.threat_level || "LOW";

                  const riskStyle =
                    getRiskStyle(status);

                  return (
                    <tr key={employee.employee_id}>
                      {/* EMPLOYEE */}

                      <td style={cellStyle}>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#f5f7fb",
                          }}
                        >
                          {employee.name}
                        </div>

                        <div
                          style={{
                            marginTop: "3px",
                            color: "#596579",
                            fontSize: "10px",
                          }}
                        >
                          ID: {employee.employee_id}
                        </div>
                      </td>

                      {/* DEPARTMENT */}

                      <td style={cellStyle}>
                        {employee.department || "N/A"}
                      </td>

                      {/* RISK */}

                      <td style={cellStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            minWidth: "150px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              background: "#273449",
                              borderRadius: "10px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${score}%`,
                                height: "100%",
                                background:
                                  riskStyle.color,
                                borderRadius: "10px",
                              }}
                            ></div>
                          </div>

                          <span
                            style={{
                              minWidth: "30px",
                              color:
                                riskStyle.color,
                              fontWeight: "600",
                              fontSize: "12px",
                            }}
                          >
                            {score}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td style={cellStyle}>
                        <span
                          style={{
                            ...riskStyle,
                            padding: "6px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#8994a8",
                    }}
                  >
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const headerStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};

const cellStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "13px",
  borderBottom:
    "1px solid rgba(39, 52, 73, 0.7)",
};

export default Employees;