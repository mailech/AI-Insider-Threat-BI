import { useState } from "react";
import employees from "../data/employees";

function Alerts() {
  const [filter, setFilter] = useState("All");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const alerts = employees
    .filter((employee) => employee.risk >= 40)
    .map((employee, index) => ({
      id: index + 1,
      employee: employee.name,
      department: employee.department,
      risk: employee.risk,
      status: employee.status,
      type:
        employee.risk >= 70
          ? "Suspicious Activity"
          : "Unusual Behavior",
      time:
        employee.risk >= 70
          ? "10 min ago"
          : "32 min ago",
    }));

  const filteredAlerts =
    filter === "All"
      ? alerts
      : alerts.filter(
          (alert) => alert.status === filter
        );

  const getRiskColor = (risk) => {
    if (risk >= 70) return "#ef4444";
    return "#f59e0b";
  };

  const getRiskBackground = (risk) => {
    if (risk >= 70) {
      return "rgba(239, 68, 68, 0.1)";
    }

    return "rgba(245, 158, 11, 0.1)";
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
          Security Alerts
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Monitor and investigate suspicious employee activity
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
        <SummaryCard
          title="Total Alerts"
          value={alerts.length}
          icon="🔔"
        />

        <SummaryCard
          title="High Risk"
          value={
            alerts.filter(
              (alert) => alert.status === "High"
            ).length
          }
          icon="🚨"
        />

        <SummaryCard
          title="Medium Risk"
          value={
            alerts.filter(
              (alert) => alert.status === "Medium"
            ).length
          }
          icon="⚠"
        />

        <SummaryCard
          title="System Status"
          value="Active"
          icon="🛡"
        />
      </div>

      {/* FILTER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
          }}
        >
          Recent Alerts
        </h2>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            height: "40px",
            padding: "0 12px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="All">All Alerts</option>
          <option value="High">High Risk</option>
          <option value="Medium">Medium Risk</option>
        </select>
      </div>

      {/* ALERT LIST */}

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
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
                borderBottom:
                  "1px solid rgba(39,52,73,0.7)",
              }}
            >
              {/* ICON */}

              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    getRiskBackground(alert.risk),
                  fontSize: "17px",
                  flexShrink: 0,
                }}
              >
                {alert.risk >= 70 ? "🚨" : "⚠"}
              </div>

              {/* DETAILS */}

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {alert.type}
                  </span>

                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      background:
                        getRiskBackground(alert.risk),
                      color: getRiskColor(alert.risk),
                      fontSize: "9px",
                      fontWeight: "600",
                    }}
                  >
                    {alert.status}
                  </span>
                </div>

                <p
                  style={{
                    margin: "5px 0",
                    color: "#8994a8",
                    fontSize: "11px",
                  }}
                >
                  {alert.employee} •{" "}
                  {alert.department}
                </p>

                <span
                  style={{
                    color: "#596579",
                    fontSize: "10px",
                  }}
                >
                  Detected {alert.time}
                </span>
              </div>

              {/* RISK */}

              <div
                style={{
                  textAlign: "right",
                  minWidth: "70px",
                }}
              >
                <div
                  style={{
                    color: getRiskColor(alert.risk),
                    fontSize: "18px",
                    fontWeight: "700",
                  }}
                >
                  {alert.risk}
                </div>

                <div
                  style={{
                    color: "#596579",
                    fontSize: "9px",
                  }}
                >
                  Risk Score
                </div>
              </div>

              {/* VIEW */}

              <button
                type="button"
                onClick={() => setSelectedAlert(alert)}
                style={{
                  padding: "7px 11px",
                  border:
                    "1px solid #273449",
                  borderRadius: "6px",
                  background: "#0D1524",
                  color: "#60a5fa",
                  cursor: "pointer",
                  fontSize: "10px",
                }}
              >
                View
              </button>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#8994a8",
              fontSize: "13px",
            }}
          >
            No alerts found
          </div>
        )}
      </div>

      {/* ALERT MODAL */}

      {selectedAlert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "430px",
              background: "#121A2B",
              border:
                "1px solid rgba(148,163,184,0.18)",
              borderRadius: "14px",
              padding: "25px",
              boxShadow:
                "0 25px 70px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
              }}
            >
              Alert Details
            </h2>

            <Detail
              label="Employee"
              value={selectedAlert.employee}
            />

            <Detail
              label="Department"
              value={selectedAlert.department}
            />

            <Detail
              label="Alert Type"
              value={selectedAlert.type}
            />

            <Detail
              label="Risk Score"
              value={selectedAlert.risk}
            />

            <Detail
              label="Status"
              value={selectedAlert.status}
            />

            <Detail
              label="Detected"
              value={selectedAlert.time}
            />

            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              style={{
                width: "100%",
                marginTop: "20px",
                height: "42px",
                border: "none",
                borderRadius: "7px",
                background:
                  "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div
      style={{
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148,163,184,0.13)",
        borderRadius: "12px",
        padding: "18px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D1524",
          fontSize: "16px",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: "#8994a8",
            fontSize: "10px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: "4px",
            color: "#f5f7fb",
            fontSize: "19px",
            fontWeight: "600",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "11px 0",
        borderBottom:
          "1px solid #273449",
      }}
    >
      <span
        style={{
          color: "#8994a8",
          fontSize: "12px",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#f5f7fb",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default Alerts;