import { useState, useEffect } from "react";
import { Settings, Shield, Bell, Mail, RefreshCw, CheckCircle2, User, Server } from "lucide-react";
import { palette } from "../styles/theme.js";

export default function SettingsPage({ currentRole = "Security Analyst" }) {
  const [riskAlerts, setRiskAlerts] = useState(() => {
    const saved = localStorage.getItem("aegis_pref_risk_alerts");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [emailNotifs, setEmailNotifs] = useState(() => {
    const saved = localStorage.getItem("aegis_pref_email_notifs");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem("aegis_pref_auto_refresh");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    localStorage.setItem("aegis_pref_risk_alerts", JSON.stringify(riskAlerts));
    localStorage.setItem("aegis_pref_email_notifs", JSON.stringify(emailNotifs));
    localStorage.setItem("aegis_pref_auto_refresh", JSON.stringify(autoRefresh));
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
    }, 2500);
  };

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Application Settings & Preferences</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings size={12} className="animate-spin-slow" />
              v1.0.0
            </span>
          </div>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Manage your user session profile, telemetry notification triggers, and platform operational parameters
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedToast && (
            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 size={15} />
              ✓ Settings saved
            </div>
          )}
          <button
            onClick={handleSave}
            style={{ background: palette.accent, color: palette.void }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Profile & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Administrator Profile Section */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <User size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                User Session Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentRole.includes("Analyst") ? "Alex Reyes" : currentRole.includes("SOC") ? "Jordan Vance" : currentRole.includes("Manager") ? "Elena Rostova" : "Marcus Vance"}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono font-medium cursor-not-allowed opacity-90 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Corporate Email
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentRole.includes("Analyst") ? "a.reyes@aegis-security.io" : currentRole.includes("SOC") ? "j.vance@aegis-security.io" : currentRole.includes("Manager") ? "e.rostova@aegis-security.io" : "m.vance@aegis-security.io"}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono font-medium cursor-not-allowed opacity-90 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Scope Role
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentRole}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.accent }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold cursor-not-allowed opacity-90 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Security Preferences Section */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Shield size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Security & Telemetry Notification Preferences
              </h2>
            </div>

            <div className="space-y-4">
              {/* Toggle 1: Risk Alerts */}
              <div
                style={{ background: palette.raised, border: `1px solid ${palette.line}` }}
                className="p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Risk Alerts</h3>
                    <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                      Receive notifications when high-risk activity (Risk Score ≥ 70) is detected across identities
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={riskAlerts}
                    onChange={(e) => setRiskAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Toggle 2: Email Notifications */}
              <div
                style={{ background: palette.raised, border: `1px solid ${palette.line}` }}
                className="p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Email Notifications</h3>
                    <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                      Receive security digests and critical incident escalation briefs through corporate email
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Toggle 3: Automatic Dashboard Refresh */}
              <div
                style={{ background: palette.raised, border: `1px solid ${palette.line}` }}
                className="p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Automatic Dashboard Refresh</h3>
                    <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                      Automatically refresh telemetry streams and behavioral anomaly charts every 30 seconds
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: System Information */}
        <div className="space-y-6">
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Server size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                System Information
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Application</span>
                <span className="font-semibold text-white">AI Insider Threat BI</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Platform Version</span>
                <span className="font-mono text-cyan-400 font-bold">1.0.0</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Security Status</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Operational
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Runtime Environment</span>
                <span className="font-mono text-amber-400 font-semibold">Development</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Compliance Standard</span>
                <span className="text-slate-300 font-medium">ISO 27001 / NIST</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Telemetry Engine</span>
                <span className="font-mono text-cyan-400">FastAPI & PyTorch ML</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
