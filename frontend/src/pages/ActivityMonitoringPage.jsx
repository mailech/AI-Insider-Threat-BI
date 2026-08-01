import { useState, useEffect } from "react";
import { Cpu, HardDrive, ShieldAlert, Filter, Search, RefreshCw, AlertCircle } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function ActivityMonitoringPage() {
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadActivities = () => {
    api.getActivities(filterType, null, anomaliesOnly).then(data => {
      if (data) setActivities(data);
    });
  };

  useEffect(() => {
    loadActivities();
  }, [filterType, anomaliesOnly]);

  const filtered = activities.filter(a => 
    searchTerm === "" ||
    a.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.ip_address.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Employee Activity Monitoring Engine</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Continuous ingestion across login attempts, file exfiltration, remote VPN sessions, privilege changes, and USB peripherals
          </p>
        </div>

        <button
          onClick={loadActivities}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} className="text-cyan-400" />
          Refresh Pipeline
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider mr-2">Telemetry Filter:</span>
          {["All", "Login", "File Access", "File Download", "Data Transfer", "USB Device", "Privilege Change", "Remote Access"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? palette.accent : palette.raised,
                color: filterType === type ? palette.void : palette.textMuted,
                border: `1px solid ${filterType === type ? palette.accent : palette.line}`
              }}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anomaliesOnly}
              onChange={(e) => setAnomaliesOnly(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            Show Flagged Anomalies Only
          </label>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name or IP..."
              style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* Activities Data Table */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ background: palette.raised, borderBottom: `1px solid ${palette.line}` }} className="text-slate-400 font-mono">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Activity Category</th>
              <th className="py-3 px-4">Ingested Telemetry Event</th>
              <th className="py-3 px-4">IP / Hostname</th>
              <th className="py-3 px-4">Risk Impact</th>
              <th className="py-3 px-4">Anomaly Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((act) => (
              <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-mono text-slate-400">{act.timestamp}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{act.employee_name}</div>
                  <div className="text-[10px] font-mono text-cyan-400">{act.employee_id}</div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-200">{act.activity_type}</td>
                <td className="py-3.5 px-4 text-slate-300 max-w-sm">{act.details}</td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  <div>{act.ip_address}</div>
                  <div className="text-[10px] text-slate-500">{act.device_id}</div>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold">
                  <span style={{ color: act.risk_impact >= 75 ? "#EF4444" : act.risk_impact >= 40 ? "#F59E0B" : "#10B981" }}>
                    {act.risk_impact} / 100
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  {act.is_anomaly ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      <AlertCircle size={12} />
                      ANOMALY
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
