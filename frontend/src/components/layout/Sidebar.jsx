import {
  Shield, LayoutDashboard, AlertTriangle, Activity, Users,
  FileText, Settings, UserCircle2, Cpu, BarChart3, Lock, ChevronDown, UserCheck
} from "lucide-react";
import { palette } from "../../styles/theme.js";

const navItems = [
  { id: "analyst", icon: LayoutDashboard, label: "Threat Queue" },
  { id: "soc", icon: Activity, label: "SOC Radar" },
  { id: "manager", icon: BarChart3, label: "Risk Posture" },
  { id: "admin", icon: Lock, label: "Admin Console" },
  { id: "employees", icon: UserCheck, label: "Employee Profiles" },
  { id: "activity", icon: Cpu, label: "Activity Logs" },
  { id: "ueba", icon: Users, label: "UEBA Analytics" },
];

const roles = [
  { name: "Security Analyst", user: "A. Reyes", avatar: "AR" },
  { name: "SOC Engineer", user: "J. Vance", avatar: "JV" },
  { name: "Security Manager", user: "E. Rostova", avatar: "ER" },
  { name: "Administrator", user: "M. Vance", avatar: "MV" },
];

export default function Sidebar({ activeTab, onSelectTab, currentRole, onRoleChange, onOpenReport, onOpenAuth }) {
  return (
    <aside
      style={{ background: palette.surface, borderRight: `1px solid ${palette.line}`, width: 240 }}
      className="hidden md:flex flex-col shrink-0 min-h-screen py-5 px-3 select-none"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div style={{ background: palette.accent }} className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Shield size={18} color={palette.void} strokeWidth={2.5} />
        </div>
        <div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }} className="text-lg font-bold text-white block leading-none">
            AEGIS
          </span>
          <span style={{ color: palette.textFaint }} className="text-[10px] uppercase tracking-wider font-semibold">
            Behavioral Intel
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: palette.textFaint }}>
        Core Modules
      </div>
      <nav className="flex flex-col gap-1 mb-6">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                background: isActive ? palette.raised2 : "transparent",
                color: isActive ? palette.accent : palette.textMuted,
                borderLeft: isActive ? `3px solid ${palette.accent}` : "3px solid transparent"
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium text-left transition-all hover:bg-slate-800/50 hover:text-white"
            >
              <item.icon size={17} />
              {item.label}
            </button>
          );
        })}

        <button
          onClick={onOpenReport}
          style={{ color: palette.textMuted }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors hover:bg-slate-800/50 hover:text-white mt-2"
        >
          <FileText size={17} />
          Reports & Export
        </button>
      </nav>

      {/* Role Switcher Widget */}
      <div style={{ borderTop: `1px solid ${palette.line}` }} className="mt-auto pt-4 px-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: palette.textFaint }}>
          Active Session Role
        </div>
        <div className="relative group">
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value)}
            style={{
              background: palette.raised,
              border: `1px solid ${palette.line}`,
              color: palette.textPrimary
            }}
            className="w-full py-2 px-3 pr-8 rounded-lg text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:border-cyan-500"
          >
            {roles.map((r) => (
              <option key={r.name} value={r.name} style={{ background: palette.surface, color: palette.textPrimary }}>
                {r.name} ({r.user})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
        </div>

        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2.5 mt-3 pt-3 border-t border-slate-800/60 w-full text-left hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors"
        >
          <UserCircle2 size={30} color={palette.accent} />
          <div className="min-w-0 flex-1">
            <div style={{ color: palette.textPrimary }} className="text-xs font-semibold truncate">
              {roles.find(r => r.name === currentRole)?.user || "A. Reyes"}
            </div>
            <div style={{ color: palette.textFaint }} className="text-[11px] truncate">
              {currentRole} • Auth Portal
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
