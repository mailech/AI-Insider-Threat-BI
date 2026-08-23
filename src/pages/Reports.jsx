import employees from "../data/employees";

function Reports() {
  const totalEmployees = employees.length;

  const highRisk = employees.filter(
    (employee) => employee.risk >= 70
  ).length;

  const mediumRisk = employees.filter(
    (employee) =>
      employee.risk >= 40 && employee.risk < 70
  ).length;

  const lowRisk = employees.filter(
    (employee) => employee.risk < 40
  ).length;

  const averageRisk =
    totalEmployees > 0
      ? Math.round(
          employees.reduce(
            (sum, employee) => sum + employee.risk,
            0
          ) / totalEmployees
        )
      : 0;

  const getPercentage = (value) => {
    if (totalEmployees === 0) return 0;
    return Math.round(
      (value / totalEmployees) * 100
    );
  };

  return (
    <div
      style={{
        width: "100%",
        color: "#f5f7fb",
      }}
    >
      {/* HEADER */}

      <div style={{ marginBottom: "25px" }}>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "28px",
          }}
        >
          Security Reports
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Overview of employee risk and security activity
        </p>
      </div>

      {/* SUMMARY */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        <ReportCard
          title="Total Employees"
          value={totalEmployees}
          subtitle="Monitored users"
        />

        <ReportCard
          title="High Risk"
          value={highRisk}
          subtitle={`${getPercentage(highRisk)}% of users`}
        />

        <ReportCard
          title="Medium Risk"
          value={mediumRisk}
          subtitle={`${getPercentage(mediumRisk)}% of users`}
        />

        <ReportCard
          title="Average Risk"
          value={`${averageRisk}%`}
          subtitle="Overall risk score"
        />
      </div>

      {/* RISK DISTRIBUTION */}

      <div
        style={{
          background: "rgba(18, 26, 43, 0.88)",
          border:
            "1px solid rgba(148, 163, 184, 0.13)",
          borderRadius: "14px",
          padding: "22px",
          marginBottom: "25px",
          boxShadow:
            "0 15px 40px rgba(0,0,0,0.22)",
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: "18px",
          }}
        >
          Risk Distribution
        </h2>

        <RiskBar
          label="High Risk"
          value={highRisk}
          percentage={getPercentage(highRisk)}
          color="#ef4444"
        />

        <RiskBar
          label="Medium Risk"
          value={mediumRisk}
          percentage={getPercentage(mediumRisk)}
          color="#f59e0b"
        />

        <RiskBar
          label="Low Risk"
          value={lowRisk}
          percentage={getPercentage(lowRisk)}
          color="#22c55e"
        />
      </div>

      {/* EMPLOYEE REPORT */}

      <div
        style={{
          background: "rgba(18, 26, 43, 0.88)",
          border:
            "1px solid rgba(148, 163, 184, 0.13)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow:
            "0 15px 40px rgba(0,0,0,0.22)",
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
            Employee Risk Report
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            Detailed risk scores of monitored employees
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
                <th style={headerStyle}>
                  Employee
                </th>

                <th style={headerStyle}>
                  Department
                </th>

                <th style={headerStyle}>
                  Risk Score
                </th>

                <th style={headerStyle}>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td style={cellStyle}>
                    {employee.name}
                  </td>

                  <td style={cellStyle}>
                    {employee.department}
                  </td>

                  <td
                    style={{
                      ...cellStyle,
                      fontWeight: "600",
                      color:
                        employee.risk >= 70
                          ? "#ef4444"
                          : employee.risk >= 40
                          ? "#f59e0b"
                          : "#22c55e",
                    }}
                  >
                    {employee.risk}
                  </td>

                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: "600",
                        color:
                          employee.risk >= 70
                            ? "#ef4444"
                            : employee.risk >= 40
                            ? "#f59e0b"
                            : "#22c55e",
                        background:
                          employee.risk >= 70
                            ? "rgba(239,68,68,0.1)"
                            : employee.risk >= 40
                            ? "rgba(245,158,11,0.1)"
                            : "rgba(34,197,94,0.1)",
                      }}
                    >
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT FOOTER */}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          textAlign: "center",
          color: "#596579",
          fontSize: "10px",
        }}
      >
        Report generated from current security monitoring data
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function ReportCard({ title, value, subtitle }) {
  return (
    <div
      style={{
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148,163,184,0.13)",
        borderRadius: "12px",
        padding: "18px",
        boxShadow:
          "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8994a8",
          fontSize: "11px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin: "8px 0 5px",
          fontSize: "25px",
        }}
      >
        {value}
      </h2>

      <p
        style={{
          margin: 0,
          color: "#596579",
          fontSize: "10px",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function RiskBar({
  label,
  value,
  percentage,
  color,
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "7px",
        }}
      >
        <span
          style={{
            color: "#cbd5e1",
            fontSize: "12px",
          }}
        >
          {label}
        </span>

        <span
          style={{
            color,
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {value} users · {percentage}%
        </span>
      </div>

      <div
        style={{
          height: "7px",
          background: "#273449",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            borderRadius: "10px",
          }}
        ></div>
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
    "1px solid rgba(39,52,73,0.7)",
};

export default Reports;