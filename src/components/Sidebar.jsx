import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: "🏠",
    },
    {
      path: "/employees",
      label: "Employees",
      icon: "👥",
    },
    {
      path: "/alerts",
      label: "Alerts",
      icon: "⚠",
    },
    {
      path: "/reports",
      label: "Reports",
      icon: "📊",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "⚙",
    },
  ];

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "#080d18",
        borderRight:
          "1px solid rgba(148, 163, 184, 0.12)",
        padding: "20px 15px",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {/* LOGO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "5px 8px 25px",
          borderBottom:
            "1px solid rgba(148, 163, 184, 0.12)",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #2563eb, #7c3aed)",
            fontSize: "19px",
            boxShadow:
              "0 8px 20px rgba(37, 99, 235, 0.25)",
          }}
        >
          🛡
        </div>

        <div>
          <div
            style={{
              color: "#f5f7fb",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            AI Insider
          </div>

          <div
            style={{
              color: "#596579",
              fontSize: "10px",
              marginTop: "2px",
            }}
          >
            Threat Dashboard
          </div>
        </div>
      </div>

      {/* MENU */}

      <div style={{ marginTop: "25px" }}>
        <p
          style={{
            margin: "0 10px 10px",
            color: "#596579",
            fontSize: "9px",
            fontWeight: "600",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          Main Menu
        </p>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "11px 12px",
              marginBottom: "5px",
              borderRadius: "8px",
              textDecoration: "none",
              color: isActive
                ? "#ffffff"
                : "#8994a8",
              background: isActive
                ? "rgba(37, 99, 235, 0.16)"
                : "transparent",
              border: isActive
                ? "1px solid rgba(37, 99, 235, 0.22)"
                : "1px solid transparent",
              fontSize: "13px",
              fontWeight: isActive
                ? "600"
                : "400",
              transition: "0.2s ease",
            })}
          >
            <span
              style={{
                width: "22px",
                textAlign: "center",
                fontSize: "15px",
              }}
            >
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* SECURITY STATUS */}

      <div
        style={{
          marginTop: "auto",
          padding: "14px",
          background: "rgba(34, 197, 94, 0.05)",
          border:
            "1px solid rgba(34, 197, 94, 0.12)",
          borderRadius: "9px",
          margin: "35px 5px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
            }}
          ></span>

          <span
            style={{
              color: "#86efac",
              fontSize: "10px",
              fontWeight: "600",
            }}
          >
            SYSTEM ONLINE
          </span>
        </div>

        <p
          style={{
            margin: 0,
            color: "#596579",
            fontSize: "9px",
            lineHeight: "1.5",
          }}
        >
          Security monitoring is active
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;