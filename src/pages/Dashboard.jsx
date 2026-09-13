import { useEffect, useState } from "react";

import DashboardCards from "../components/DashboardCards";
import RiskTable from "../components/RiskTable";
import Chart from "../components/Chart";
import SearchBar from "../components/SearchBar";
import UserInfo from "../components/UserInfo";

import { getDatasetRisk } from "../services/api";

function Dashboard({ search, setSearch }) {
  const role = localStorage.getItem("role") || "SECURITY_ANALYST";

  const displayRole = role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  console.log("Dashboard Role:", role);
  console.log("Dashboard Display Role:", displayRole);

  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRiskData = async () => {
      try {
        const token = localStorage.getItem("token");

        const data = await getDatasetRisk(token);

        console.log("Dataset Risk:", data);

        setRiskData(data.users || []);
      } catch (error) {
        console.error("Failed to load dataset risk:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRiskData();
  }, []);

  // -----------------------------
  // RISK SUMMARY
  // -----------------------------

  const totalUsers = riskData.length;

  const criticalUsers = riskData.filter(
    (user) => user.threat_level === "CRITICAL"
  ).length;

  const highUsers = riskData.filter(
    (user) => user.threat_level === "HIGH"
  ).length;

  const mediumUsers = riskData.filter(
    (user) => user.threat_level === "MEDIUM"
  ).length;

  const lowUsers = riskData.filter(
    (user) => user.threat_level === "LOW"
  ).length;

  // -----------------------------
  // TOP RISKY USERS
  // -----------------------------

  const topRiskyUsers = [...riskData]
    .sort(
      (a, b) =>
        (Number(b.anomaly_score) || 0) -
        (Number(a.anomaly_score) || 0)
    )
    .slice(0, 5);

  // -----------------------------
  // THREAT LEVEL STYLE
  // -----------------------------

  const getThreatStyle = (level) => {
    if (level === "CRITICAL") {
      return {
        color: "#ef4444",
        background: "rgba(239, 68, 68, 0.12)",
      };
    }

    if (level === "HIGH") {
      return {
        color: "#f59e0b",
        background: "rgba(245, 158, 11, 0.12)",
      };
    }

    if (level === "MEDIUM") {
      return {
        color: "#eab308",
        background: "rgba(234, 179, 8, 0.12)",
      };
    }

    return {
      color: "#22c55e",
      background: "rgba(34, 197, 94, 0.12)",
    };
  };

  return (
    <div
      style={{
        width: "100%",
        color: "#f5f7fb",
      }}
    >
      {/* PAGE HEADER */}
      <div style={{ marginBottom: "25px" }}>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "28px",
            color: "#f5f7fb",
          }}
        >
          Welcome {displayRole} 👋
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          {role === "ADMINISTRATOR" &&
            "Manage users, roles and overall system configuration"}

          {role === "SECURITY_MANAGER" &&
            "Monitor organizational security risk and critical threats"}

          {role === "SOC_ENGINEER" &&
            "Monitor telemetry, alerts and technical security events"}

          {role === "SECURITY_ANALYST" &&
            "Analyze employee behavior, anomalies and insider threats"}
        </p>
      </div>

      {/* ============================= */}
      {/* ADMINISTRATOR DASHBOARD */}
      {/* ============================= */}

      {role === "ADMINISTRATOR" && (
        <>
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              System Administration
            </h2>

            <p style={sectionDescriptionStyle}>
              Manage system users, access roles and organizational security
              configuration.
            </p>

            <div style={adminGridStyle}>
              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {totalUsers}
                </div>

                <div style={adminLabelStyle}>
                  Monitored Employees
                </div>
              </div>

              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {criticalUsers}
                </div>

                <div style={adminLabelStyle}>
                  Critical Risk Users
                </div>
              </div>

              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {highUsers}
                </div>

                <div style={adminLabelStyle}>
                  High Risk Users
                </div>
              </div>

              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  4
                </div>

                <div style={adminLabelStyle}>
                  Security Roles
                </div>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              System Risk Overview
            </h2>

            <p style={sectionDescriptionStyle}>
              High-level security status across monitored employees.
            </p>

            <DashboardCards
              totalUsers={totalUsers}
              criticalUsers={criticalUsers}
              highUsers={highUsers}
              mediumUsers={mediumUsers}
              lowUsers={lowUsers}
            />
          </div>
        </>
      )}

      {/* ============================= */}
      {/* SECURITY MANAGER DASHBOARD */}
      {/* ============================= */}

      {role === "SECURITY_MANAGER" && (
        <>
          <SearchBar
            search={search}
            setSearch={setSearch}
          />

          <DashboardCards
            totalUsers={totalUsers}
            criticalUsers={criticalUsers}
            highUsers={highUsers}
            mediumUsers={mediumUsers}
            lowUsers={lowUsers}
          />

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              Security Management Overview
            </h2>

            <p style={sectionDescriptionStyle}>
              Focus on high-risk employees and organizational threat levels.
            </p>

            <RiskTable search={search} />
          </div>

          <Chart />
        </>
      )}

      {/* ============================= */}
      {/* SOC ENGINEER DASHBOARD */}
      {/* ============================= */}

      {role === "SOC_ENGINEER" && (
        <>
          <SearchBar
            search={search}
            setSearch={setSearch}
          />

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              Security Operations Center
            </h2>

            <p style={sectionDescriptionStyle}>
              Monitor suspicious activity, telemetry and high-priority
              security events.
            </p>

            <div style={adminGridStyle}>
              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {criticalUsers}
                </div>

                <div style={adminLabelStyle}>
                  Critical Alerts
                </div>
              </div>

              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {highUsers}
                </div>

                <div style={adminLabelStyle}>
                  High Priority Alerts
                </div>
              </div>

              <div style={adminCardStyle}>
                <div style={adminNumberStyle}>
                  {totalUsers}
                </div>

                <div style={adminLabelStyle}>
                  Monitored Users
                </div>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              Highest Priority Threats
            </h2>

            <RiskTable search={search} />
          </div>

          <Chart />
        </>
      )}

      {/* ============================= */}
      {/* SECURITY ANALYST DASHBOARD */}
      {/* ============================= */}

      {role === "SECURITY_ANALYST" && (
        <>
          <SearchBar
            search={search}
            setSearch={setSearch}
          />

          <DashboardCards
            totalUsers={totalUsers}
            criticalUsers={criticalUsers}
            highUsers={highUsers}
            mediumUsers={mediumUsers}
            lowUsers={lowUsers}
          />

          {/* TOP BEHAVIORAL RISK USERS */}

          <div
            style={{
              background: "rgba(18, 26, 43, 0.88)",
              border:
                "1px solid rgba(148, 163, 184, 0.13)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "25px",
              boxShadow:
                "0 15px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "#f5f7fb",
                }}
              >
                Top Behavioral Risk Users
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#8994a8",
                  fontSize: "12px",
                }}
              >
                Highest anomaly scores identified from behavioral analysis
              </p>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "35px",
                  textAlign: "center",
                  color: "#8994a8",
                }}
              >
                Loading behavioral analysis...
              </div>
            ) : topRiskyUsers.length === 0 ? (
              <div
                style={{
                  padding: "35px",
                  textAlign: "center",
                  color: "#8994a8",
                }}
              >
                No behavioral risk data available
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
                        Anomaly Score
                      </th>

                      <th style={headerStyle}>
                        Threat Level
                      </th>

                      <th style={headerStyle}>
                        Login Count
                      </th>

                      <th style={headerStyle}>
                        File Accesses
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {topRiskyUsers.map((user) => {
                      const threatStyle =
                        getThreatStyle(user.threat_level);

                      return (
                        <tr key={user.user}>
                          <td style={cellStyle}>
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#f5f7fb",
                              }}
                            >
                              {user.user}
                            </div>
                          </td>

                          <td style={cellStyle}>
                            <span
                              style={{
                                color: threatStyle.color,
                                fontWeight: "600",
                              }}
                            >
                              {Number(
                                user.anomaly_score || 0
                              ).toFixed(2)}
                            </span>
                          </td>

                          <td style={cellStyle}>
                            <span
                              style={{
                                color: threatStyle.color,
                                background:
                                  threatStyle.background,
                                padding: "6px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: "600",
                              }}
                            >
                              {user.threat_level || "LOW"}
                            </span>
                          </td>

                          <td style={cellStyle}>
                            {user.login_count ?? 0}
                          </td>

                          <td style={cellStyle}>
                            {user.file_accesses ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <RiskTable search={search} />

          <Chart />
        </>
      )}

      {/* USER INFO */}
      <UserInfo />
    </div>
  );
}


// --------------------------------------
// COMMON STYLES
// --------------------------------------

const sectionStyle = {
  background: "rgba(18, 26, 43, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.13)",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "25px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
};

const sectionTitleStyle = {
  margin: "0 0 6px",
  fontSize: "18px",
  color: "#f5f7fb",
};

const sectionDescriptionStyle = {
  margin: "0 0 20px",
  color: "#8994a8",
  fontSize: "12px",
};

const adminGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
};

const adminCardStyle = {
  background: "#0D1524",
  border: "1px solid #273449",
  borderRadius: "12px",
  padding: "20px",
};

const adminNumberStyle = {
  fontSize: "26px",
  fontWeight: "700",
  color: "#60a5fa",
  marginBottom: "6px",
};

const adminLabelStyle = {
  color: "#8994a8",
  fontSize: "12px",
};


// TABLE HEADER STYLE

const headerStyle = {
  padding: "13px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};


// TABLE CELL STYLE

const cellStyle = {
  padding: "13px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "13px",
  borderBottom:
    "1px solid rgba(39, 52, 73, 0.7)",
};


export default Dashboard;