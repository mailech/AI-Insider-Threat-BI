import { useState, useEffect } from "react";
import { Search, ShieldCheck, Download, Key, Menu, X, Bell } from "lucide-react";
import { palette } from "../../styles/theme.js";

export default function TopBar({ query, onQueryChange, onOpenReport, currentRole, onOpenAuth, onToggleSidebar, onSelectAlerts }) {
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/health")
      .then(res => res.ok ? setBackendOnline(true) : setBackendOnline(false))
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <header
      style={{ background: palette.surface, borderBottom: `1px solid ${palette.line}` }}
      className="h-14 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 shrink-0"
    >
      {/* Left Side: Menu Button (mobile) + Search */}
      <div className="flex items-center gap-2 max-w-md w-full">
        {/* Hamburger Menu Button — visible only on small screens */}
        <button
          onClick={onToggleSidebar}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Search Input with Clear Button */}
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
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notification Bell */}
        <button
          onClick={onSelectAlerts}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Active Security Alerts"
        >
          <Bell size={15} className="text-slate-300" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            3
          </span>
        </button>

        {/* Backend Connectivity Status Pill */}
        <div
          title={backendOnline ? "FastAPI ML Backend Connected" : "Running in Client Fallback Mode"}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{
            background: backendOnline ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
            color: backendOnline ? "#10B981" : "#F59E0B",
            border: `1px solid ${backendOnline ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
          }}
        >
          <span className={`w-2 h-2 rounded-full ${backendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {backendOnline ? "FastAPI Live" : "Client Engine"}
        </div>

        {/* Auth Portal Button */}
        <button
          onClick={onOpenAuth}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Key size={14} className="text-cyan-400" />
          Auth Portal
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenReport}
          style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Download size={14} className="text-cyan-400" />
          Report PDF/CSV
        </button>

        {/* Role Badge */}
        <div
          style={{ background: palette.raised2, border: `1px solid ${palette.line}` }}
          className="px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
        >
          <ShieldCheck size={14} className="text-cyan-400" />
          <span style={{ color: palette.textPrimary }} className="hidden sm:inline">{currentRole || "Security Analyst"}</span>
          <span style={{ color: palette.textPrimary }} className="sm:hidden">{(currentRole || "Analyst").split(" ").pop()}</span>
        </div>
      </div>
    </header>
  );
}
