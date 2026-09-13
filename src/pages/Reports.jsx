import { useEffect, useState } from "react";
import { getDatasetRisk } from "../services/api";

function Reports() {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const token = localStorage.getItem("token");

        const data = await getDatasetRisk(token);

        console.log("Reports Data:", data);

        setRiskData(data.users || []);
      } catch (error) {
        console.error(
          "Failed to load report data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  const totalUsers = riskData.length;

  const criticalRisk = riskData.filter(
    (user) => user.threat_level === "CRITICAL"
  ).length;

  const highRisk = riskData.filter(
    (user) => user.threat_level === "HIGH"
  ).length;

  const mediumRisk = riskData.filter(
    (user) => user.threat_level === "MEDIUM"
  ).length;

  const lowRisk = riskData.filter(
    (user) => user.threat_level === "LOW"
  ).length;

  const averageRisk =
    totalUsers > 0
      ? (
          riskData.reduce(
            (sum, user) =>
              sum + (Number(user.anomaly_score) || 0),
            0
          ) / totalUsers
        ).toFixed(2)
      : "0.00";

  const getPercentage = (value) => {
    if (totalUsers === 0) return 0;

    return Math.round(
      (value / totalUsers) * 100
    );
  };

  const highestRiskUsers = [...riskData]
    .sort(
      (a, b) =>
        (Number(b.anomaly_score) || 0) -
        (Number(a.anomaly_score) || 0)
    )
    .slice(0, 10);

  const getThreatStyle = (level) => {
    if (level === "CRITICAL") {
      return {
        color: "#ef4444",
        background:
          "rgba(239, 68, 68, 0.12)",
      };
    }

    if (level === "HIGH") {
      return {
        color: "#f59e0b",
        background:
          "rgba(245, 158, 11, 0.12)",
      };
    }

    if (level === "MEDIUM") {
      return {
        color: "#eab308",
        background:
          "rgba(234, 179, 8, 0.12)",
      };
    }

    return {
      color: "#22c55e",
      background:
        "rgba(34, 197, 94, 0.12)",
    };
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
          Behavioral risk summary and security analysis
        </p>
      </div>

      {/* SUMMARY CARDS */}

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
          title="Analyzed Users"
          value={loading ? "..." : totalUsers}
          subtitle="Users analyzed"
        />

        <ReportCard
          title="Critical Risk"
          value={loading ? "..." : criticalRisk}
          subtitle={
            loading
              ? "Loading..."
              : `${getPercentage(criticalRisk)}% of users`
          }
        />

        <ReportCard
          title="High Risk"
          value={loading ? "..." : highRisk}
          subtitle={
            loading
              ? "Loading..."
              : `${getPercentage(highRisk)}% of users`
          }
        />

        <ReportCard
          title="Average Risk"
          value={
            loading
              ? "..."
              : `${averageRisk}`
          }
          subtitle="Average anomaly score"
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
          label="Critical Risk"
          value={criticalRisk}
          percentage={getPercentage(criticalRisk)}
          color="#ef4444"
        />

        <RiskBar
          label="High Risk"
          value={highRisk}
          percentage={getPercentage(highRisk)}
          color="#f59e0b"
        />

        <RiskBar
          label="Medium Risk"
          value={mediumRisk}
          percentage={getPercentage(mediumRisk)}
          color="#eab308"
        />

        <RiskBar
          label="Low Risk"
          value={lowRisk}
          percentage={getPercentage(lowRisk)}
          color="#22c55e"
        />

      </div>

      {/* TOP RISK USERS */}

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
            borderBottom:
              "1px solid #273449",
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            Top Risk Users
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            Highest anomaly scores detected from behavioral analysis
          </p>

        </div>

        {loading ? (

          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#8994a8",
            }}
          >
            Loading security report...
          </div>

        ) : highestRiskUsers.length === 0 ? (

          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#8994a8",
            }}
          >
            No risk data available
          </div>

        ) : (

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
                    User
                  </th>

                  <th style={headerStyle}>
                    Login Count
                  </th>

                  <th style={headerStyle}>
                    File Accesses
                  </th>

                  <th style={headerStyle}>
                    Anomaly Score
                  </th>

                  <th style={headerStyle}>
                    Threat Level
                  </th>

                </tr>

              </thead>

              <tbody>

                {highestRiskUsers.map((user) => {

                  const style =
                    getThreatStyle(
                      user.threat_level
                    );

                  return (
                    <tr key={user.user}>

                      <td style={cellStyle}>
                        <strong>
                          {user.user}
                        </strong>
                      </td>

                      <td style={cellStyle}>
                        {user.login_count ?? 0}
                      </td>

                      <td style={cellStyle}>
                        {user.file_accesses ?? 0}
                      </td>

                      <td
                        style={{
                          ...cellStyle,
                          color: style.color,
                          fontWeight: "600",
                        }}
                      >
                        {Number(
                          user.anomaly_score || 0
                        ).toFixed(2)}
                      </td>

                      <td style={cellStyle}>

                        <span
                          style={{
                            color: style.color,
                            background:
                              style.background,
                            padding: "6px 10px",
                            borderRadius: "20px",
                            fontSize: "10px",
                            fontWeight: "600",
                          }}
                        >
                          {user.threat_level}
                        </span>

                      </td>

                    </tr>
                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* FOOTER */}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          textAlign: "center",
          color: "#596579",
          fontSize: "10px",
        }}
      >
        Report generated from behavioral security analysis
      </div>

    </div>
  );
}


/* ---------------- REPORT CARD ---------------- */

function ReportCard({
  title,
  value,
  subtitle,
}) {
  return (
    <div
      style={{
        background:
          "rgba(18, 26, 43, 0.88)",
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


/* ---------------- RISK BAR ---------------- */

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


/* ---------------- TABLE STYLES ---------------- */

const headerStyle = {
  padding: "14px 15px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  background: "#0D1524",
  borderBottom:
    "1px solid #273449",
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