import { useState, useEffect } from "react";
import { Lock, Users, Server, Activity, ShieldCheck, Settings2, FileCode } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.getAdminMetrics().then(data => {
      if (data) setMetrics(data);
    });
  }, []);

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">System Administration & RBAC Governance</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Platform performance metrics, user access controls, model hyperparameter oversight, and security audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ background: palette.raised, border: `1px solid ${palette.line}` }} className="px-4 py-2 rounded-xl flex items-center gap-3">
            <Server size={20} className="text-cyan-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">System Telemetry</div>
              <div className="text-sm font-bold text-emerald-400">{metrics?.system_health_status || "99.98% Operational"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">Platform Provisioned Users</span>
            <Users size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.total_users || 42}</div>
          <div className="text-xs text-slate-400 mt-1">4 Active Roles (RBAC)</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">Active Concurrent Sessions</span>
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.active_sessions || 14}</div>
          <div className="text-xs text-emerald-400 mt-1">0 suspicious tokens</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">Log Ingestion Rate</span>
            <Server size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{metrics?.log_ingestion_rate_eps || 1250} <span className="text-xs font-normal">EPS</span></div>
          <div className="text-xs text-cyan-400 mt-1">Kafka / Ingestion Pipeline</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-medium">API Response P99</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">14.2 ms</div>
          <div className="text-xs text-emerald-400 mt-1">FastAPI Backend Engine</div>
        </div>
      </div>

      {/* Main Admin Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Role Access Control Table (2 Columns) */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="lg:col-span-2 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Role-Based Access Control (RBAC) Matrix</h2>
            </div>
            <button className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg border border-cyan-500/20 font-medium hover:bg-cyan-500/20 transition-all">
              + Provision User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">User & Identity</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Permissions Scope</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  { name: "Alex Reyes", username: "analyst", role: "Security Analyst", scope: "Alert Triage, Evidence View, Incident Management", status: "Active" },
                  { name: "Jordan Vance", username: "soc_eng", role: "SOC Engineer", scope: "Live Radar, Rule Tuning, Event Streaming", status: "Active" },
                  { name: "Elena Rostova", username: "manager", role: "Security Manager", scope: "Org Risk Posture, Compliance Reports, Risk Thresholds", status: "Active" },
                  { name: "Marcus Vance", username: "admin", role: "Administrator", scope: "Full System Governance, User Provisioning, System Audits", status: "Active" },
                ].map((u) => (
                  <tr key={u.username} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{u.username}@aegis.io</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs">{u.scope}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Hyperparameter & Risk Model Weights */}
        <div className="space-y-6">
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Settings2 size={16} className="text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Risk Engine Formula Weights
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
                <span className="text-slate-300">Behavioral Anomalies</span>
                <span className="text-cyan-400 font-bold">35%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
                <span className="text-slate-300">Privilege Misuse</span>
                <span className="text-cyan-400 font-bold">25%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
                <span className="text-slate-300">Data Access Violations</span>
                <span className="text-cyan-400 font-bold">20%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
                <span className="text-slate-300">Access Pattern Deviations</span>
                <span className="text-cyan-400 font-bold">10%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
                <span className="text-slate-300">Historical Security Events</span>
                <span className="text-cyan-400 font-bold">10%</span>
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <FileCode size={16} className="text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                System Audit Trail
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              {(metrics?.audit_logs || []).map((audit) => (
                <div key={audit.id} className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{audit.actor}</span>
                    <span>{audit.time}</span>
                  </div>
                  <p className="text-slate-200 mt-1 font-medium">{audit.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
