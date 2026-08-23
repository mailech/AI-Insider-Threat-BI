import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <header
      style={{
        height: "70px",
        background: "rgba(18, 26, 43, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        boxSizing: "border-box",
        boxShadow: "0 8px 25px rgba(0,0,0,0.18)",
      }}
    >
      {/* LEFT */}

      <div>
        <h2
          style={{
            margin: 0,
            color: "#f5f7fb",
            fontSize: "18px",
            fontWeight: "600",
          }}
        >
          Security Dashboard
        </h2>

        <p
          style={{
            margin: "3px 0 0",
            color: "#596579",
            fontSize: "10px",
          }}
        >
          AI-powered insider threat monitoring
        </p>
      </div>

      {/* RIGHT */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        {/* Notification */}

        <button
          type="button"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "9px",
            border:
              "1px solid rgba(148, 163, 184, 0.13)",
            background: "#0D1524",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          🔔
        </button>

        {/* ADMIN */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            paddingLeft: "12px",
            borderLeft:
              "1px solid rgba(148, 163, 184, 0.13)",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, #2563eb, #4f46e5)",
              fontSize: "14px",
            }}
          >
            👤
          </div>

          <div>
            <div
              style={{
                color: "#e5e7eb",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              Admin
            </div>

            <div
              style={{
                color: "#596579",
                fontSize: "9px",
              }}
            >
              Security Admin
            </div>
          </div>
        </div>

        {/* LOGOUT */}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            height: "36px",
            padding: "0 13px",
            border:
              "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "7px",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#f87171",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;