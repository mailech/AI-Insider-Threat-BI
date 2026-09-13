import { useEffect, useState } from "react";
import { getDatasetRisk } from "../services/api";

function UserInfo() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem("role") || "SECURITY_ANALYST";

const displayRole = role
  .replaceAll("_", " ")
  .replace(/\b\w/g, (char) => char.toUpperCase());

const email = localStorage.getItem("email") || "analyst@itbis.internal";

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");

        const result = await getDatasetRisk(token);

        console.log("User Info Dataset:", result);

        setUsers(result.users || []);
      } catch (error) {
        console.error(
          "User info API error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  const totalUsers = users.length;

  const highRiskUsers = users.filter(
    (user) =>
      user.threat_level === "HIGH" ||
      user.threat_level === "CRITICAL"
  ).length;

  const averageRisk =
    totalUsers > 0
      ? Math.round(
          users.reduce(
            (sum, user) =>
              sum +
              (Number(user.anomaly_score) || 0),
            0
          ) / totalUsers
        )
      : 0;

  return (
    <div
      style={{
        marginTop: "25px",
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        padding: "22px",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.22)",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          paddingBottom: "20px",
          borderBottom:
            "1px solid #273449",
        }}
      >

        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #2563eb, #4f46e5)",
            fontSize: "23px",
            boxShadow:
              "0 8px 20px rgba(37, 99, 235, 0.25)",
          }}
        >
          👤
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            {displayRole} Profile
          </h2>

          <p
            style={{
              margin: "4px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            {displayRole}
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "6px 10px",
            borderRadius: "20px",
            background:
              "rgba(34, 197, 94, 0.08)",
            border:
              "1px solid rgba(34, 197, 94, 0.15)",
          }}
        >

          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow:
                "0 0 8px #22c55e",
            }}
          ></span>

          <span
            style={{
              color: "#86efac",
              fontSize: "10px",
              fontWeight: "600",
            }}
          >
            ONLINE
          </span>

        </div>
      </div>

      {/* PROFILE INFORMATION */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginTop: "20px",
        }}
      >

        <InfoItem
          label="Name"
          value={displayRole}
        />

        <InfoItem
          label="Email"
          value={email}
        />

        <InfoItem
          label="Role"
          value={displayRole}
        />

        <InfoItem
          label="System"
          value="ITBIS"
        />

      </div>

      {/* SECURITY OVERVIEW */}

      <div
        style={{
          marginTop: "20px",
          paddingTop: "20px",
          borderTop:
            "1px solid #273449",
        }}
      >

        <h3
          style={{
            margin: "0 0 15px",
            fontSize: "14px",
          }}
        >
          Security Overview
        </h3>

        {loading ? (

          <div
            style={{
              padding: "20px",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            Loading security statistics...
          </div>

        ) : (

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
            }}
          >

            <SecurityStat
              label="Users Monitored"
              value={totalUsers}
            />

            <SecurityStat
              label="High Risk Users"
              value={highRiskUsers}
            />

            <SecurityStat
              label="Average Risk"
              value={`${averageRisk}%`}
            />

          </div>

        )}

      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div
      style={{
        padding: "14px",
        background: "#0D1524",
        border: "1px solid #273449",
        borderRadius: "8px",
      }}
    >

      <div
        style={{
          color: "#596579",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#e5e7eb",
          fontSize: "12px",
        }}
      >
        {value}
      </div>

    </div>
  );
}

function SecurityStat({ label, value }) {
  return (
    <div
      style={{
        padding: "14px",
        background:
          "rgba(13, 21, 36, 0.7)",
        borderRadius: "8px",
        border:
          "1px solid #273449",
      }}
    >

      <div
        style={{
          color: "#8994a8",
          fontSize: "10px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#60a5fa",
          fontSize: "20px",
          fontWeight: "600",
        }}
      >
        {value}
      </div>

    </div>
  );
}

export default UserInfo;