import { useState, useEffect } from "react";
import { Search, Bell, ShieldCheck, Download, LogIn } from "lucide-react";
import { palette } from "../../styles/theme.js";

export default function TopBar({ query, onQueryChange, onOpenReport, currentRole, onOpenAuth }) {
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/health")
      .then(res => res.ok ? setBackendOnline(true) : setBackendOnline(false))
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <header
      style={{ background: palette.surface, borderBottom: `1px solid ${palette.line}` }}
      className="h-14 px-6 flex items-center justify-between sticky top-0 z-10"
    >
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md w-full">
        <div className="relative w-full">
          <Search size={15} style={{ color: palette.textFaint }} className="absolute left-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search employee, alert ID, anomaly category..."
            style={{
              background: palette.raised,
              border: `1px solid ${palette.line}`,
              color: palette.textPrimary,
            }}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status Pill */}
        <div
          title={backendOnline ? "FastAPI ML Backend Connected" : "Running in Client Fallback Mode"}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{
            background: backendOnline ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
            color: backendOnline ? "#10B981" : "#F59E0B",
            border: `1px solid ${backendOnline ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
          }}
        >
          <span className={`w-2 h-2 rounded-full ${backendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {backendOnline ? "FastAPI Live" : "Client Engine"}
        </div>

        {/* Auth Sign In Button */}
        <button
          onClick={onOpenAuth}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogIn size={14} className="text-cyan-400" />
          JWT & OAuth2 Sign In
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenReport}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Download size={14} className="text-cyan-400" />
          Report PDF/CSV
        </button>

        {/* Role Badge */}
        <div
          style={{ background: palette.raised2, border: `1px solid ${palette.line}` }}
          className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <ShieldCheck size={14} className="text-cyan-400" />
          <span style={{ color: palette.textPrimary }}>{currentRole || "Security Analyst"}</span>
        </div>
      </div>
    </header>
  );
}
