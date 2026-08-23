import employees from "../data/employees";

function RiskTable({ search }) {
  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    employee.department.toLowerCase().includes(search.toLowerCase()) ||
    employee.status.toLowerCase().includes(search.toLowerCase())
  );

  const getRiskColor = (risk) => {
    if (risk >= 70) return "#ef4444";
    if (risk >= 40) return "#f59e0b";
    return "#22c55e";
  };

  const getRiskBackground = (risk) => {
    if (risk >= 70) return "rgba(239, 68, 68, 0.12)";
    if (risk >= 40) return "rgba(245, 158, 11, 0.12)";
    return "rgba(34, 197, 94, 0.12)";
  };

  return (
    <div
      style={{
        marginTop: "25px",
        background: "rgba(18, 26, 43, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 15px 40px rgba(0,0,0,0.22)",
      }}
    >
      {/* HEADER */}

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
            color: "#f5f7fb",
          }}
        >
          Risk Activity
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            color: "#8994a8",
            fontSize: "12px",
          }}
        >
          Monitor employee risk levels
        </p>
      </div>

      {/* TABLE */}

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
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <tr key={employee.id}>
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
                      ID: EMP-{String(employee.id).padStart(3, "0")}
                    </div>
                  </td>

                  {/* DEPARTMENT */}

                  <td style={cellStyle}>
                    {employee.department}
                  </td>

                  {/* RISK SCORE */}

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
                            width: `${employee.risk}%`,
                            height: "100%",
                            background: getRiskColor(
                              employee.risk
                            ),
                            borderRadius: "10px",
                          }}
                        ></div>
                      </div>

                      <span
                        style={{
                          minWidth: "28px",
                          color: getRiskColor(
                            employee.risk
                          ),
                          fontWeight: "600",
                          fontSize: "12px",
                        }}
                      >
                        {employee.risk}
                      </span>
                    </div>
                  </td>

                  {/* STATUS */}

                  <td style={cellStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        color: getRiskColor(
                          employee.risk
                        ),
                        background:
                          getRiskBackground(
                            employee.risk
                          ),
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    padding: "35px",
                    textAlign: "center",
                    color: "#8994a8",
                    fontSize: "13px",
                  }}
                >
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}

      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #273449",
          color: "#596579",
          fontSize: "11px",
        }}
      >
        Showing {filteredEmployees.length} of{" "}
        {employees.length} employees
      </div>
    </div>
  );
}

const headerStyle = {
  padding: "14px 15px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};

const cellStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#cbd5e1",
  fontSize: "13px",
  borderBottom:
    "1px solid rgba(39, 52, 73, 0.7)",
};

export default RiskTable;