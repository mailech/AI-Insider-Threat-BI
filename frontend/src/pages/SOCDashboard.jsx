import { useState, useEffect } from "react";
import { Activity, ShieldAlert, Cpu, Radio, Zap, Eye, CheckCircle2 } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function SOCDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    api.getSOCMetrics().then(data => {
      if (data) setMetrics(data);
    });
    api.getActivities().then(data => {
      if (data) setActivities(data);
    });
  }, []);

  const filteredActivities = filterType === "All" 
    ? activities 
    : activities.filter(a => a.activity_type.toLowerCase().includes(filterType.toLowerCase()));

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">SOC Operations & Live Radar</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              <Radio size={12} className="animate-pulse text-red-400" />
              LIVE RADAR
            </span>
          </div>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Real-time security event telemetry, anomaly stream, and entity behavior monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ background: palette.raised, border: `1px solid ${palette.line}` }} className="px-4 py-2 rounded-xl flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">DEFCON Threat Status</div>
              <div className="text-sm font-bold text-amber-400">{metrics?.active_threat_level || "ELEVATED (LEVEL 3)"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stream Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">Daily Event Volume</span>
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics?.total_events_today ? metrics.total_events_today.toLocaleString() : "142,850"}
          </div>
          <div className="text-xs text-emerald-400 font-medium mt-1">↑ 12.4% vs 24h baseline</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium font-mono">Flagged Anomalies</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics?.anomalies_flagged || "14"}
          </div>
          <div className="text-xs text-amber-400 font-medium mt-1">8 IsolationForest hits</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">In-Flight Investigations</span>
            <Eye size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics?.investigations_in_flight || "3"}
          </div>
          <div className="text-xs text-cyan-400 font-medium mt-1">2 assigned to Tier-2 SOC</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">Auto-Mitigations</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">99.4%</div>
          <div className="text-xs text-emerald-400 font-medium mt-1">0 breach false-negatives</div>
        </div>
      </div>

      {/* Main SOC Layout: Live Event Stream & Threat Radar Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Telemetry (2 Columns) */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="lg:col-span-2 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-cyan-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Real-Time Event Stream</h2>
            </div>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs">
              {["All", "Login", "File", "USB", "Privilege"].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    background: filterType === t ? palette.accent : "transparent",
                    color: filterType === t ? palette.void : palette.textMuted
                  }}
                  className="px-2.5 py-1 rounded font-medium transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                style={{ background: palette.raised, border: `1px solid ${act.is_anomaly ? "rgba(239, 68, 68, 0.3)" : palette.line}` }}
                className="p-3.5 rounded-lg flex items-start justify-between gap-3 hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      act.risk_impact >= 80 ? "bg-red-500 shadow-lg shadow-red-500/50 animate-ping" : act.risk_impact >= 50 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{act.employee_name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {act.employee_id}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">{act.activity_type}</span>
                    </div>
                    <p style={{ color: palette.textPrimary }} className="text-xs mt-1">
                      {act.details}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                      <span>IP: {act.ip_address}</span>
                      <span>Device: {act.device_id}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 block">{act.timestamp}</span>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      act.risk_impact >= 80 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Impact: {act.risk_impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Intelligence & Active Radar Panel (1 Column) */}
        <div className="space-y-6">
          {/* Active Threat Matrix */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              Department Anomaly Density
            </h3>

            <div className="space-y-3">
              {[
                { dept: "Finance", score: 92, count: "4 Anomaly Events", color: "#EF4444" },
                { dept: "IT Admin", score: 88, count: "3 Anomaly Events", color: "#EF4444" },
                { dept: "Engineering", score: 74, count: "2 Anomaly Events", color: "#F59E0B" },
                { dept: "Legal Counsel", score: 79, count: "2 Anomaly Events", color: "#F59E0B" },
                { dept: "Human Resources", score: 28, count: "0 Critical Events", color: "#10B981" },
              ].map((item) => (
                <div key={item.dept}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span style={{ color: palette.textPrimary }}>{item.dept}</span>
                    <span style={{ color: item.color }} className="font-bold font-mono">{item.score}% Risk</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.score}%`, background: item.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Intelligence Feed */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-2 border-b border-slate-800">
              Threat Intelligence Feeds
            </h3>
            <div className="space-y-3">
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-cyan-400 font-bold font-mono block mb-1">IOC-MATCH-902</span>
                <p className="text-slate-300">Known cloud exfiltration user-agent detected on Finance subnet.</p>
              </div>
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-amber-400 font-bold font-mono block mb-1">CVE-2026-PRIV-3</span>
                <p className="text-slate-300">Active Directory Kerberoasting attempt flagged by IsolationForest engine.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
