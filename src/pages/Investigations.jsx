import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  getInvestigationDetails,
  getRiskExplainability,
  getEmployees,
  getDatasetRisk
} from "../services/api";

function Investigations() {
  const [searchParams] = useSearchParams();
  const initialEmpId = searchParams.get("emp") || "EMP_ADMIN";

  const [selectedEmpId, setSelectedEmpId] = useState(initialEmpId);
  const [employeeInput, setEmployeeInput] = useState(initialEmpId);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [explain, setExplain] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEmployeesList = async () => {
      try {
        const token = localStorage.getItem("token");
        const dataset = await getDatasetRisk(token);
        if (dataset && dataset.users) {
          const list = dataset.users.map((u) => u.user);
          if (!list.includes("EMP_ADMIN")) list.unshift("EMP_ADMIN");
          setEmployeesList(list.slice(0, 50));
        }
      } catch (err) {
        console.error("Error loading employees list:", err);
      }
    };
    loadEmployeesList();
  }, []);

  useEffect(() => {
    const fetchInvestigation = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const data = await getInvestigationDetails(selectedEmpId, token);
        setDetails(data);

        try {
          const exp = await getRiskExplainability(selectedEmpId, token);
          setExplain(exp);
        } catch (e) {
          console.warn("Explainability API error:", e);
        }
      } catch (err) {
        console.error("Failed to load investigation:", err);
        setError("Could not load investigation profile for " + selectedEmpId);
      } finally {
        setLoading(false);
      }
    };

    if (selectedEmpId) {
      fetchInvestigation();
    }
  }, [selectedEmpId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (employeeInput.trim()) {
      setSelectedEmpId(employeeInput.trim());
    }
  };

  const getThreatStyle = (level) => {
    if (level === "CRITICAL") return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
    if (level === "HIGH") return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    if (level === "MEDIUM") return { color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" };
    return { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
  };

  const threatStyle = getThreatStyle(details?.risk_summary?.threat_level || "LOW");

  return (
    <div style={{ width: "100%", color: "#f5f7fb" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "25px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "28px" }}>Employee Investigation</h1>
          <p style={{ margin: 0, color: "#8994a8", fontSize: "14px" }}>
            Investigate behavioral risk, telemetry timeline, and explainable risk factors
          </p>
        </div>

        {/* SEARCH SELECTOR */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={employeesList.includes(selectedEmpId) ? selectedEmpId : ""}
            onChange={(e) => {
              if (e.target.value) {
                setEmployeeInput(e.target.value);
                setSelectedEmpId(e.target.value);
              }
            }}
            style={{
              height: "40px",
              padding: "0 12px",
              background: "#0D1524",
              border: "1px solid #273449",
              borderRadius: "8px",
              color: "#f5f7fb",
              fontSize: "13px"
            }}
          >
            <option value="">Select Monitored User...</option>
            {employeesList.map((emp) => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Or enter Employee ID..."
            value={employeeInput}
            onChange={(e) => setEmployeeInput(e.target.value)}
            style={{
              height: "40px",
              padding: "0 14px",
              background: "#0D1524",
              border: "1px solid #273449",
              borderRadius: "8px",
              color: "#f5f7fb",
              fontSize: "13px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              height: "40px",
              padding: "0 18px",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "13px"
            }}
          >
            Investigate
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#8994a8", background: "rgba(18, 26, 43, 0.88)", borderRadius: "14px" }}>
          Analyzing employee telemetry & behavioral data...
        </div>
      ) : error ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "14px" }}>
          {error}
        </div>
      ) : details && (
        <>
          {/* TOP PROFILE & RISK SUMMARY */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "25px" }}>
            
            {/* PROFILE CARD */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
                <div style={{
                  width: "50px", height: "50px", borderRadius: "12px",
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px"
                }}>
                  👤
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>{details.profile?.name}</h3>
                  <span style={{ color: "#8994a8", fontSize: "12px" }}>ID: {details.profile?.employee_id}</span>
                </div>
              </div>

              <div style={infoRowStyle}>
                <span style={labelStyle}>Email</span>
                <span style={valueStyle}>{details.profile?.email}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Department</span>
                <span style={valueStyle}>{details.profile?.department}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Access Role</span>
                <span style={valueStyle}>{details.profile?.role}</span>
              </div>
            </div>

            {/* RISK OVERVIEW CARD */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 15px", fontSize: "16px", color: "#8994a8" }}>Calculated Security Risk</h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "36px", fontWeight: "800", color: threatStyle.color }}>
                    {details.risk_summary?.threat_score}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8994a8" }}>Threat Score (0 - 100)</div>
                </div>

                <div style={{
                  padding: "10px 18px",
                  borderRadius: "20px",
                  background: threatStyle.bg,
                  color: threatStyle.color,
                  fontWeight: "700",
                  fontSize: "14px",
                  letterSpacing: "0.5px"
                }}>
                  {details.risk_summary?.threat_level} THREAT
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "11px", color: "#596579", lineHeight: "1.5" }}>
                Score computed over 72h lookback window using Isolation Forest anomaly detection & weighted behavioral factors.
              </p>
            </div>
          </div>

          {/* EXPLAINABLE RISK FACTORS & INDICATORS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px", marginBottom: "25px" }}>
            
            {/* FACTOR WEIGHT BREAKDOWN */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>Risk Factor Breakdown</h3>
              <p style={{ margin: "0 0 20px", color: "#8994a8", fontSize: "12px" }}>
                Empirical weight contributions based on current risk formula
              </p>

              <FactorBar label="Anomaly Score (35%)" percent={details.risk_summary?.factor_weights?.anomaly_percent || 35} color="#ef4444" />
              <FactorBar label="Activity Frequency (25%)" percent={details.risk_summary?.factor_weights?.frequency_percent || 25} color="#f59e0b" />
              <FactorBar label="Asset Criticality (25%)" percent={details.risk_summary?.factor_weights?.asset_criticality_percent || 25} color="#60a5fa" />
              <FactorBar label="Severity Factor (15%)" percent={details.risk_summary?.factor_weights?.severity_percent || 15} color="#a855f7" />
            </div>

            {/* EMPIRICAL INDICATORS */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>Supporting Indicators</h3>
              <p style={{ margin: "0 0 20px", color: "#8994a8", fontSize: "12px" }}>
                Empirical behavioral indicators captured for this employee
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <IndicatorTile title="Total Telemetry Events" value={explain?.indicators?.total_telemetry_events ?? details.telemetry_logs?.length ?? 0} icon="📊" />
                <IndicatorTile title="High/Critical Severity" value={explain?.indicators?.high_critical_events ?? 0} icon="🚨" highlight={explain?.indicators?.high_critical_events > 0} />
                <IndicatorTile title="After-Hours Logins" value={explain?.indicators?.after_hours_logins ?? 0} icon="🌙" />
                <IndicatorTile title="File Accesses" value={explain?.indicators?.file_accesses ?? 0} icon="📁" />
                <IndicatorTile title="Weekend Activity" value={explain?.indicators?.weekend_logins ?? 0} icon="📅" />
                <IndicatorTile title="Unique Devices / PCs" value={explain?.indicators?.unique_pcs ?? 1} icon="💻" />
              </div>
            </div>
          </div>

          {/* RISK HISTORY TREND */}
          {details.history && details.history.length > 0 && (
            <div style={{ ...cardStyle, marginBottom: "25px" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>Historical Risk Trend</h3>
              <p style={{ margin: "0 0 20px", color: "#8994a8", fontSize: "12px" }}>
                Threat score changes recorded over time
              </p>

              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={details.history.map(h => ({
                  time: new Date(h.timestamp).toLocaleDateString() + " " + new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  score: h.threat_score
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273449" />
                  <XAxis dataKey="time" stroke="#8994a8" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#8994a8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#121A2B", border: "1px solid #273449", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TELEMETRY LOGS TIMELINE / TABLE */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>Recent Telemetry & Activity Logs</h3>
            <p style={{ margin: "0 0 20px", color: "#8994a8", fontSize: "12px" }}>
              Activity stream stored in MongoDB for employee {selectedEmpId}
            </p>

            {details.telemetry_logs && details.telemetry_logs.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Timestamp</th>
                      <th style={tableHeaderStyle}>Event / Activity</th>
                      <th style={tableHeaderStyle}>Severity</th>
                      <th style={tableHeaderStyle}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.telemetry_logs.map((log, idx) => {
                      const sev = (log.severity || "LOW").toUpperCase();
                      const sevColor = sev === "CRITICAL" ? "#ef4444" : (sev === "HIGH" ? "#f59e0b" : "#22c55e");

                      return (
                        <tr key={idx}>
                          <td style={tableCellStyle}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}</td>
                          <td style={tableCellStyle}><strong>{log.activity_type || "Activity"}</strong></td>
                          <td style={tableCellStyle}>
                            <span style={{ padding: "4px 8px", borderRadius: "10px", background: `${sevColor}22`, color: sevColor, fontSize: "10px", fontWeight: "700" }}>
                              {sev}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, color: "#8994a8" }}>{log.description || "N/A"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "#8994a8", fontSize: "13px" }}>
                No telemetry activity logs found in MongoDB for this employee.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FactorBar({ label, percent, color }) {
  const safePct = Math.min(100, Math.max(0, percent));
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
        <span style={{ color: "#cbd5e1" }}>{label}</span>
        <span style={{ color: color, fontWeight: "600" }}>{safePct}%</span>
      </div>
      <div style={{ height: "7px", background: "#0D1524", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ width: `${safePct}%`, height: "100%", background: color, borderRadius: "10px" }}></div>
      </div>
    </div>
  );
}

function IndicatorTile({ title, value, icon, highlight }) {
  return (
    <div style={{
      background: highlight ? "rgba(239, 68, 68, 0.12)" : "#0D1524",
      border: highlight ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #273449",
      borderRadius: "10px",
      padding: "12px",
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "10px", color: "#8994a8" }}>{title}</div>
        <div style={{ fontSize: "16px", fontWeight: "700", color: highlight ? "#ef4444" : "#f5f7fb", marginTop: "2px" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "rgba(18, 26, 43, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.13)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
};

const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #273449",
};

const labelStyle = {
  color: "#8994a8",
  fontSize: "12px",
};

const valueStyle = {
  color: "#f5f7fb",
  fontSize: "12px",
  fontWeight: "600",
};

const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};

const tableCellStyle = {
  padding: "12px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "12px",
  borderBottom: "1px solid rgba(39, 52, 73, 0.7)",
};

export default Investigations;
