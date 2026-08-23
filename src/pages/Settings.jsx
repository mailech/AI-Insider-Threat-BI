import { useState } from "react";

function Settings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2000);
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
          Settings
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Manage dashboard and security preferences
        </p>
      </div>

      {/* PROFILE */}

      <Section title="Administrator Profile">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "55px",
              height: "55px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, #2563eb, #4f46e5)",
              fontSize: "22px",
            }}
          >
            👤
          </div>

          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
              }}
            >
              Admin
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                color: "#8994a8",
                fontSize: "11px",
              }}
            >
              Security Administrator
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px",
          }}
        >
          <InputField
            label="Name"
            value="Admin"
          />

          <InputField
            label="Email"
            value="admin@company.com"
          />

          <InputField
            label="Role"
            value="Security Admin"
          />
        </div>
      </Section>

      {/* SECURITY */}

      <Section title="Security Preferences">
        <SettingRow
          title="Risk Alerts"
          description="Receive notifications when high-risk activity is detected"
          checked={riskAlerts}
          onChange={setRiskAlerts}
        />

        <SettingRow
          title="Email Notifications"
          description="Receive security alerts through email"
          checked={emailAlerts}
          onChange={setEmailAlerts}
        />

        <SettingRow
          title="Automatic Dashboard Refresh"
          description="Automatically refresh security data"
          checked={autoRefresh}
          onChange={setAutoRefresh}
        />
      </Section>

      {/* SYSTEM */}

      <Section title="System Information">
        <InfoRow
          label="Application"
          value="AI Insider Threat Dashboard"
        />

        <InfoRow
          label="Version"
          value="1.0.0"
        />

        <InfoRow
          label="Security Status"
          value="Operational"
        />

        <InfoRow
          label="Environment"
          value="Development"
        />
      </Section>

      {/* SAVE */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "15px",
          marginTop: "20px",
        }}
      >
        {saved && (
          <span
            style={{
              color: "#86efac",
              fontSize: "11px",
            }}
          >
            ✓ Settings saved
          </span>
        )}

        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "7px",
            background:
              "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "white",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ---------------- SECTION ---------------- */

function Section({ title, children }) {
  return (
    <div
      style={{
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        padding: "22px",
        marginBottom: "20px",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.18)",
      }}
    >
      <h2
        style={{
          margin: "0 0 20px",
          fontSize: "17px",
        }}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}

/* ---------------- INPUT ---------------- */

function InputField({ label, value }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "7px",
          color: "#8994a8",
          fontSize: "11px",
        }}
      >
        {label}
      </label>

      <input
        value={value}
        readOnly
        style={{
          width: "100%",
          height: "42px",
          padding: "0 12px",
          boxSizing: "border-box",
          background: "#0D1524",
          border: "1px solid #273449",
          borderRadius: "8px",
          color: "#cbd5e1",
          outline: "none",
          fontSize: "12px",
        }}
      />
    </div>
  );
}

/* ---------------- TOGGLE ---------------- */

function SettingRow({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "15px 0",
        borderBottom:
          "1px solid rgba(39,52,73,0.7)",
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 5px",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "10px",
          }}
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: "44px",
          height: "24px",
          border: "none",
          borderRadius: "20px",
          background: checked
            ? "#2563eb"
            : "#273449",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          transition: "0.2s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "4px",
            left: checked ? "24px" : "4px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "white",
            transition: "0.2s ease",
          }}
        />
      </button>
    </div>
  );
}

/* ---------------- INFO ---------------- */

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "13px 0",
        borderBottom:
          "1px solid rgba(39,52,73,0.7)",
      }}
    >
      <span
        style={{
          color: "#8994a8",
          fontSize: "11px",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            label === "Security Status"
              ? "#86efac"
              : "#cbd5e1",
          fontSize: "11px",
          fontWeight: "600",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default Settings;