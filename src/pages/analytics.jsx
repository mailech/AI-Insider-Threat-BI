import { useEffect, useState } from "react";
import { getDatasetRisk } from "../services/api";

function Analytics() {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const loadRiskData = async () => {
      try {
        const token = localStorage.getItem("token");

        const data = await getDatasetRisk(token);

        console.log("Analytics Risk Data:", data);

        setRiskData(data.users || []);
      } catch (error) {
        console.error(
          "Failed to load analytics data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadRiskData();
  }, []);

  const filteredUsers =
    filter === "ALL"
      ? riskData
      : riskData.filter(
          (user) => user.threat_level === filter
        );

  const averageAnomalyScore =
    riskData.length > 0
      ? (
          riskData.reduce(
            (sum, user) =>
              sum + (Number(user.anomaly_score) || 0),
            0
          ) / riskData.length
        ).toFixed(2)
      : "0.00";

  const highestRiskUser =
    riskData.length > 0
      ? [...riskData].sort(
          (a, b) =>
            (Number(b.anomaly_score) || 0) -
            (Number(a.anomaly_score) || 0)
        )[0]
      : null;

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
          Behavioral Analytics
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Analyze employee behavior and anomaly patterns
        </p>
      </div>

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >

        <SummaryCard
          title="Analyzed Users"
          value={riskData.length}
          icon="👥"
        />

        <SummaryCard
          title="Average Anomaly Score"
          value={averageAnomalyScore}
          icon="📊"
        />

        <SummaryCard
          title="Highest Risk User"
          value={
            highestRiskUser
              ? highestRiskUser.user
              : "N/A"
          }
          icon="⚠️"
        />

      </div>

      {/* FILTER BUTTONS */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >

        {[
          "ALL",
          "CRITICAL",
          "HIGH",
          "MEDIUM",
          "LOW",
        ].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            style={{
              padding: "9px 15px",
              borderRadius: "7px",
              border: "1px solid #273449",
              background:
                filter === level
                  ? "#2563eb"
                  : "#0D1524",
              color: "#f5f7fb",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {level === "ALL"
              ? "All Users"
              : level}
          </button>
        ))}

      </div>

      {/* ANALYTICS TABLE */}

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
            Behavioral Risk Analysis
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            Showing {filteredUsers.length} users
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
            Loading analytics...
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
                    After Hours
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

                {filteredUsers
                  .slice(0, 100)
                  .map((user) => {

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
                          {user.after_hours_logins ?? 0}
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
                              fontSize: "11px",
                              fontWeight: "600",
                            }}
                          >
                            {user.threat_level || "LOW"}
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

    </div>
  );
}


// SUMMARY CARD

function SummaryCard({
  title,
  value,
  icon,
}) {
  return (
    <div
      style={{
        background:
          "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "12px",
        padding: "20px",
        boxShadow:
          "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >

        <span
          style={{
            color: "#8994a8",
            fontSize: "12px",
          }}
        >
          {title}
        </span>

        <span style={{ fontSize: "18px" }}>
          {icon}
        </span>

      </div>

      <h2
        style={{
          margin: "12px 0 0",
          fontSize: "24px",
          color: "#f5f7fb",
        }}
      >
        {value}
      </h2>

    </div>
  );
}


// THREAT LEVEL STYLE

function getThreatStyle(level) {

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
}


// TABLE HEADER STYLE

const headerStyle = {
  padding: "14px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  background: "#0D1524",
  borderBottom:
    "1px solid #273449",
};


// TABLE CELL STYLE

const cellStyle = {
  padding: "14px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "13px",
  borderBottom:
    "1px solid rgba(39, 52, 73, 0.7)",
};


export default Analytics;