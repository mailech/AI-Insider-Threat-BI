import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const data = await getAuditLogs(token);
        setLogs(data);
      } catch (err) {
        console.error("Audit logs API error:", err);
        setError("You may not have permission to view security audit logs.");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filter === "ALL" || log.action === filter;
    const searchText = search.toLowerCase();
    const matchesSearch =
      !search ||
      (log.actor || "").toLowerCase().includes(searchText) ||
      (log.action || "").toLowerCase().includes(searchText) ||
      (log.target || "").toLowerCase().includes(searchText) ||
      (log.details || "").toLowerCase().includes(searchText);

    return matchesAction && matchesSearch;
  });

  const getActionBadge = (action) => {
    if (action.includes("FAILED")) {
      return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
    }
    if (action.includes("RESOLVED") || action.includes("SUCCESS")) {
      return { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
    }
    if (action.includes("ALERT") || action.includes("UPDATE")) {
      return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    }
    return { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.15)" };
  };

  return (
    <div style={{ width: "100%", color: "#f5f7fb" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "25px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "28px" }}>Security Audit Trail</h1>
        <p style={{ margin: 0, color: "#8994a8", fontSize: "14px" }}>
          Application-level audit trail tracking administrative, authentication, alert, and investigation actions
        </p>
      </div>

      {/* FILTERS & SEARCH */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: "38px",
              padding: "0 14px",
              background: "#0D1524",
              border: "1px solid #273449",
              borderRadius: "8px",
              color: "#f5f7fb",
              fontSize: "13px",
              minWidth: "240px",
              outline: "none"
            }}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            height: "38px",
            padding: "0 12px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            fontSize: "13px"
          }}
        >
          <option value="ALL">All Actions</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="ALERT_STATUS_UPDATE">ALERT_STATUS_UPDATE</option>
          <option value="ALERT_ASSIGNED">ALERT_ASSIGNED</option>
          <option value="ALERT_RESOLVED">ALERT_RESOLVED</option>
          <option value="INVESTIGATION_VIEW">INVESTIGATION_VIEW</option>
          <option value="EMPLOYEE_CREATE">EMPLOYEE_CREATE</option>
        </select>
      </div>

      {/* TABLE */}
      <div style={{
        background: "rgba(18, 26, 43, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 15px 40px rgba(0,0,0,0.25)"
      }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8994a8" }}>Loading security audit trail...</div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>{error}</div>
        ) : filteredLogs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Timestamp</th>
                  <th style={tableHeaderStyle}>Actor</th>
                  <th style={tableHeaderStyle}>Action</th>
                  <th style={tableHeaderStyle}>Target Entity</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={tableCellStyle}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}</td>
                      <td style={{ ...tableCellStyle, fontWeight: "600" }}>{log.actor}</td>
                      <td style={tableCellStyle}>
                        <span style={{ padding: "4px 9px", borderRadius: "10px", background: badge.bg, color: badge.color, fontSize: "10px", fontWeight: "700" }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, color: "#cbd5e1" }}>{log.target || "SYSTEM"}</td>
                      <td style={tableCellStyle}>
                        <span style={{ color: log.status === "SUCCESS" ? "#22c55e" : "#ef4444", fontWeight: "600", fontSize: "11px" }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, color: "#8994a8", maxWidth: "300px" }}>{log.details || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "#8994a8" }}>No audit log entries found matching filter.</div>
        )}
      </div>
    </div>
  );
}

const tableHeaderStyle = {
  padding: "13px 15px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};

const tableCellStyle = {
  padding: "13px 15px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "12px",
  borderBottom: "1px solid rgba(39, 52, 73, 0.7)",
};

export default AuditLogs;
