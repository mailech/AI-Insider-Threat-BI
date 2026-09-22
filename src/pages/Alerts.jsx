import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAlerts,
  updateAlertStatus,
  assignAlert,
  resolveAlert
} from "../services/api";

function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Modals state
  const [assignModalAlert, setAssignModalAlert] = useState(null);
  const [investigatorInput, setInvestigatorInput] = useState("");
  const [resolveModalAlert, setResolveModalAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const role = localStorage.getItem("role") || "SECURITY_ANALYST";
  const userEmail = localStorage.getItem("email") || "security@company.com";
  const isAuthorizedToManage = ["ADMINISTRATOR", "SECURITY_MANAGER", "SOC_ENGINEER"].includes(role);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const data = await getAlerts(token);
      setAlerts(Array.isArray(data) ? data : data.alerts || []);
    } catch (error) {
      console.error("Alerts API error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleStatusChange = async (alertId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await updateAlertStatus(alertId, newStatus, token);
      await loadAlerts();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalAlert || !investigatorInput.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await assignAlert(assignModalAlert.alert_id || assignModalAlert.id, investigatorInput.trim(), token);
      setAssignModalAlert(null);
      setInvestigatorInput("");
      await loadAlerts();
    } catch (err) {
      alert("Failed to assign investigator: " + err.message);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveModalAlert) return;
    try {
      const token = localStorage.getItem("token");
      await resolveAlert(resolveModalAlert.alert_id || resolveModalAlert.id, resolutionNotes.trim(), token);
      setResolveModalAlert(null);
      setResolutionNotes("");
      await loadAlerts();
    } catch (err) {
      alert("Failed to resolve alert: " + err.message);
    }
  };

  const handleInvestigateClick = async (alert) => {
    try {
      const token = localStorage.getItem("token");
      const id = alert.alert_id || alert.id;
      await updateAlertStatus(id, "UNDER_INVESTIGATION", token);
    } catch (e) {
      console.warn("Status update error on navigate:", e);
    }
    navigate(`/investigations?emp=${alert.employee_id || alert.employee}`);
  };

  const filteredAlerts = alerts.filter((alert) => {
    const status = (alert.status || "NEW").toUpperCase();
    const level = (alert.threat_level || alert.severity || "LOW").toUpperCase();

    const matchesStatus = statusFilter === "ALL" || status === statusFilter;
    const matchesLevel = levelFilter === "ALL" || level === levelFilter;

    return matchesStatus && matchesLevel;
  });

  const getRiskColor = (level, score) => {
    if (level === "CRITICAL" || score >= 80) return "#ef4444";
    if (level === "HIGH" || score >= 60) return "#f59e0b";
    if (level === "MEDIUM" || score >= 30) return "#eab308";
    return "#22c55e";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "NEW": return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
      case "ACKNOWLEDGED": return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
      case "UNDER_INVESTIGATION": return { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.15)" };
      case "RESOLVED": return { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
      case "CLOSED": return { color: "#8994a8", bg: "rgba(137, 148, 168, 0.15)" };
      default: return { color: "#8994a8", bg: "rgba(137, 148, 168, 0.15)" };
    }
  };

  const totalAlerts = alerts.length;
  const newAlerts = alerts.filter(a => a.status === "NEW").length;
  const inProgressAlerts = alerts.filter(a => a.status === "UNDER_INVESTIGATION" || a.status === "ACKNOWLEDGED").length;
  const resolvedAlerts = alerts.filter(a => a.status === "RESOLVED" || a.status === "CLOSED").length;

  return (
    <div style={{ width: "100%", color: "#f5f7fb" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "25px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "28px" }}>Security Alerts Lifecycle</h1>
        <p style={{ margin: 0, color: "#8994a8", fontSize: "14px" }}>
          Monitor, assign, investigate, and resolve security alerts with complete audit trail
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px", marginBottom: "25px" }}>
        <SummaryCard title="Total Alerts" value={loading ? "..." : totalAlerts} icon="🔔" />
        <SummaryCard title="New Alerts" value={loading ? "..." : newAlerts} icon="🚨" highlight={newAlerts > 0} />
        <SummaryCard title="Under Investigation" value={loading ? "..." : inProgressAlerts} icon="🔍" />
        <SummaryCard title="Resolved Alerts" value={loading ? "..." : resolvedAlerts} icon="✅" />
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "18px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Alert Queue</h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Threat Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Severity Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* ALERT LIST */}
      <div style={{
        background: "rgba(18, 26, 43, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 15px 40px rgba(0,0,0,0.22)"
      }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8994a8" }}>Loading security alerts...</div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const level = (alert.threat_level || alert.severity || "LOW").toUpperCase();
            const status = (alert.status || "NEW").toUpperCase();
            const score = Number(alert.risk_score || alert.risk || 50);
            const riskColor = getRiskColor(level, score);
            const badge = getStatusBadge(status);

            return (
              <div key={alert.id} style={{
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
                borderBottom: "1px solid rgba(39, 52, 73, 0.7)",
                flexWrap: "wrap"
              }}>
                {/* ICON */}
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${riskColor}22`, fontSize: "18px", flexShrink: 0
                }}>
                  {level === "CRITICAL" || level === "HIGH" ? "🚨" : "⚠️"}
                </div>

                {/* DETAILS */}
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f5f7fb" }}>
                      {alert.alert_id || `ALT-${alert.id}`}
                    </span>
                    <span style={{ fontSize: "13px", color: "#8994a8" }}>• {alert.activity_type || alert.activity || "Suspicious Activity"}</span>
                    <span style={{ padding: "3px 8px", borderRadius: "10px", background: badge.bg, color: badge.color, fontSize: "10px", fontWeight: "700" }}>
                      {status}
                    </span>
                  </div>

                  <p style={{ margin: "5px 0", color: "#8994a8", fontSize: "12px" }}>
                    Employee: <strong style={{ color: "#cbd5e1" }}>{alert.employee_id || alert.employee}</strong>
                    {alert.assigned_to && (
                      <span style={{ marginLeft: "10px", color: "#60a5fa" }}>
                        👤 Assigned: {alert.assigned_to}
                      </span>
                    )}
                  </p>

                  <div style={{ color: "#596579", fontSize: "11px" }}>
                    {alert.description} • {alert.created_at || alert.updated_at ? new Date(alert.created_at || alert.updated_at).toLocaleString() : "Recent"}
                  </div>
                </div>

                {/* SCORE */}
                <div style={{ textAlign: "right", minWidth: "75px" }}>
                  <div style={{ color: riskColor, fontSize: "20px", fontWeight: "800" }}>
                    {score.toFixed(1)}
                  </div>
                  <div style={{ color: "#596579", fontSize: "10px" }}>Risk Score</div>
                </div>

                {/* ACTIONS */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {/* Investigate button */}
                  <button
                    type="button"
                    onClick={() => handleInvestigateClick(alert)}
                    style={btnPrimaryStyle}
                  >
                    Investigate
                  </button>

                  {isAuthorizedToManage && status === "NEW" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(alert.alert_id || alert.id, "ACKNOWLEDGED")}
                      style={btnSecondaryStyle}
                    >
                      Acknowledge
                    </button>
                  )}

                  {isAuthorizedToManage && status !== "RESOLVED" && status !== "CLOSED" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignModalAlert(alert);
                          setInvestigatorInput(alert.assigned_to || userEmail);
                        }}
                        style={btnSecondaryStyle}
                      >
                        Assign
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResolveModalAlert(alert);
                          setResolutionNotes(alert.resolution_notes || "");
                        }}
                        style={btnSuccessStyle}
                      >
                        Resolve
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedAlert(alert)}
                    style={btnOutlineStyle}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "#8994a8" }}>No security alerts found matching the selected filters.</div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedAlert && (
        <Modal title="Alert Security Profile" onClose={() => setSelectedAlert(null)}>
          <Detail label="Alert ID" value={selectedAlert.alert_id || `ALT-${selectedAlert.id}`} />
          <Detail label="Employee ID" value={selectedAlert.employee_id || selectedAlert.employee} />
          <Detail label="Risk Score" value={selectedAlert.risk_score || selectedAlert.risk} />
          <Detail label="Threat Level" value={selectedAlert.threat_level || selectedAlert.severity} />
          <Detail label="Status" value={selectedAlert.status} />
          <Detail label="Activity Type" value={selectedAlert.activity_type || selectedAlert.activity} />
          <Detail label="Description" value={selectedAlert.description} />
          <Detail label="Assigned To" value={selectedAlert.assigned_to || "Unassigned"} />
          {selectedAlert.resolution_notes && (
            <Detail label="Resolution Notes" value={selectedAlert.resolution_notes} />
          )}
          <Detail label="Created Time" value={selectedAlert.created_at ? new Date(selectedAlert.created_at).toLocaleString() : "N/A"} />

          <button
            type="button"
            onClick={() => setSelectedAlert(null)}
            style={{ ...btnPrimaryStyle, width: "100%", marginTop: "20px", height: "40px" }}
          >
            Close
          </button>
        </Modal>
      )}

      {/* ASSIGN MODAL */}
      {assignModalAlert && (
        <Modal title="Assign Security Investigator" onClose={() => setAssignModalAlert(null)}>
          <form onSubmit={handleAssignSubmit}>
            <p style={{ fontSize: "13px", color: "#8994a8", marginBottom: "15px" }}>
              Assign investigator for Alert <strong>{assignModalAlert.alert_id || assignModalAlert.id}</strong> (Employee: {assignModalAlert.employee_id})
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#8994a8", marginBottom: "6px" }}>Investigator Email / Identifier</label>
              <input
                type="text"
                value={investigatorInput}
                onChange={(e) => setInvestigatorInput(e.target.value)}
                required
                style={{
                  width: "100%", height: "40px", padding: "0 12px", background: "#0D1524",
                  border: "1px solid #273449", borderRadius: "8px", color: "#f5f7fb", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={{ ...btnPrimaryStyle, flex: 1, height: "40px" }}>Confirm Assignment</button>
              <button type="button" onClick={() => setAssignModalAlert(null)} style={{ ...btnOutlineStyle, flex: 1, height: "40px" }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESOLVE MODAL */}
      {resolveModalAlert && (
        <Modal title="Resolve Security Alert" onClose={() => setResolveModalAlert(null)}>
          <form onSubmit={handleResolveSubmit}>
            <p style={{ fontSize: "13px", color: "#8994a8", marginBottom: "15px" }}>
              Provide investigation summary & resolution notes for Alert <strong>{resolveModalAlert.alert_id || resolveModalAlert.id}</strong>
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#8994a8", marginBottom: "6px" }}>Resolution Notes / Action Taken</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                placeholder="e.g., Verified authorized after-hours maintenance activity. User identity confirmed."
                style={{
                  width: "100%", padding: "10px", background: "#0D1524",
                  border: "1px solid #273449", borderRadius: "8px", color: "#f5f7fb", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={{ ...btnSuccessStyle, flex: 1, height: "40px" }}>Mark as Resolved</button>
              <button type="button" onClick={() => setResolveModalAlert(null)} style={{ ...btnOutlineStyle, flex: 1, height: "40px" }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, highlight }) {
  return (
    <div style={{
      background: highlight ? "rgba(239, 68, 68, 0.12)" : "rgba(18, 26, 43, 0.88)",
      border: highlight ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(148, 163, 184, 0.13)",
      borderRadius: "12px", padding: "18px", display: "flex", alignItems: "center", gap: "12px"
    }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "9px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0D1524", fontSize: "16px"
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: "#8994a8", fontSize: "10px" }}>{title}</div>
        <div style={{ marginTop: "4px", color: highlight ? "#ef4444" : "#f5f7fb", fontSize: "19px", fontWeight: "600" }}>{value}</div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        width: "100%", maxWidth: "450px", background: "#121A2B",
        border: "1px solid rgba(148,163,184,0.18)", borderRadius: "14px", padding: "25px",
        boxShadow: "0 25px 70px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h3 style={{ margin: 0, fontSize: "18px" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8994a8", fontSize: "18px", cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "15px", padding: "10px 0", borderBottom: "1px solid #273449" }}>
      <span style={{ color: "#8994a8", fontSize: "12px" }}>{label}</span>
      <span style={{ color: "#f5f7fb", fontSize: "12px", fontWeight: "600", textAlign: "right" }}>{value || "-"}</span>
    </div>
  );
}

const selectStyle = {
  height: "38px", padding: "0 12px", background: "#0D1524",
  border: "1px solid #273449", borderRadius: "8px", color: "#f5f7fb", fontSize: "12px", cursor: "pointer"
};

const btnPrimaryStyle = {
  padding: "7px 12px", background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  border: "none", borderRadius: "6px", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "600"
};

const btnSecondaryStyle = {
  padding: "7px 12px", background: "#0D1524",
  border: "1px solid #273449", borderRadius: "6px", color: "#60a5fa", cursor: "pointer", fontSize: "11px"
};

const btnSuccessStyle = {
  padding: "7px 12px", background: "rgba(34, 197, 94, 0.15)",
  border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "6px", color: "#22c55e", cursor: "pointer", fontSize: "11px", fontWeight: "600"
};

const btnOutlineStyle = {
  padding: "7px 12px", background: "transparent",
  border: "1px solid #273449", borderRadius: "6px", color: "#8994a8", cursor: "pointer", fontSize: "11px"
};

export default Alerts;