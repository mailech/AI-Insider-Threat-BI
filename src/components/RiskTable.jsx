import { useEffect, useState } from "react";
import { getDatasetRisk } from "../services/api";

function RiskTable({ search }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");

        const result = await getDatasetRisk(token);

        console.log("Risk Table Dataset:", result);

        setUsers(result.users || []);
      } catch (error) {
        console.error(
          "Risk table API error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getRiskColor = (level) => {
    if (level === "CRITICAL") {
      return "#ef4444";
    }

    if (level === "HIGH") {
      return "#f59e0b";
    }

    if (level === "MEDIUM") {
      return "#eab308";
    }

    return "#22c55e";
  };

  const getRiskBackground = (level) => {
    if (level === "CRITICAL") {
      return "rgba(239, 68, 68, 0.12)";
    }

    if (level === "HIGH") {
      return "rgba(245, 158, 11, 0.12)";
    }

    if (level === "MEDIUM") {
      return "rgba(234, 179, 8, 0.12)";
    }

    return "rgba(34, 197, 94, 0.12)";
  };

  const searchText = (search || "").toLowerCase();

  const filteredUsers = users
    .filter((user) => {
      const userId = String(user.user || "").toLowerCase();
      const threatLevel = String(
        user.threat_level || ""
      ).toLowerCase();

      return (
        userId.includes(searchText) ||
        threatLevel.includes(searchText)
      );
    })
    .sort(
      (a, b) =>
        (Number(b.anomaly_score) || 0) -
        (Number(a.anomaly_score) || 0)
    );

  /*
    Dashboard table ko 1000 rows se bharna useful nahi hai.
    Highest-risk 10 users show kar rahe hain.
  */

  const displayedUsers = filteredUsers.slice(0, 10);

  return (
    <div
      style={{
        marginTop: "25px",
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.22)",
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
          Highest-risk users identified through behavioral analysis
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
              <th style={headerStyle}>
                User
              </th>

              <th style={headerStyle}>
                Anomaly Score
              </th>

              <th style={headerStyle}>
                Login Activity
              </th>

              <th style={headerStyle}>
                File Accesses
              </th>

              <th style={headerStyle}>
                Status
              </th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    padding: "35px",
                    textAlign: "center",
                    color: "#8994a8",
                  }}
                >
                  Loading behavioral risk data...
                </td>
              </tr>
            ) : displayedUsers.length > 0 ? (

              displayedUsers.map((user) => {
                const score =
                  Number(user.anomaly_score) || 0;

                const status =
                  user.threat_level || "LOW";

                const riskColor =
                  getRiskColor(status);

                const riskBackground =
                  getRiskBackground(status);

                return (
                  <tr key={user.user}>

                    {/* USER */}

                    <td style={cellStyle}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#f5f7fb",
                        }}
                      >
                        {user.user}
                      </div>

                      <div
                        style={{
                          marginTop: "3px",
                          color: "#596579",
                          fontSize: "10px",
                        }}
                      >
                        Behavioral profile
                      </div>
                    </td>

                    {/* ANOMALY SCORE */}

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
                              width: `${Math.min(
                                score,
                                100
                              )}%`,
                              height: "100%",
                              background: riskColor,
                              borderRadius: "10px",
                            }}
                          ></div>
                        </div>

                        <span
                          style={{
                            minWidth: "42px",
                            color: riskColor,
                            fontWeight: "600",
                            fontSize: "12px",
                          }}
                        >
                          {score.toFixed(2)}
                        </span>

                      </div>
                    </td>

                    {/* LOGIN COUNT */}

                    <td style={cellStyle}>
                      {user.login_count ?? 0}
                    </td>

                    {/* FILE ACCESS */}

                    <td style={cellStyle}>
                      {user.file_accesses ?? 0}
                    </td>

                    {/* STATUS */}

                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          color: riskColor,
                          background:
                            riskBackground,
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
                  colSpan="5"
                  style={{
                    padding: "35px",
                    textAlign: "center",
                    color: "#8994a8",
                    fontSize: "13px",
                  }}
                >
                  No users found
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
        Showing {displayedUsers.length} highest-risk users
        {" "}from {users.length} analyzed users
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