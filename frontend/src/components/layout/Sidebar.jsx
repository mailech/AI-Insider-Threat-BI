import {
  Shield, LayoutDashboard, Activity, Users,
  FileText, Cpu, BarChart3, Lock, ChevronDown, UserCheck, LogOut, X, Settings, Radio
} from "lucide-react";
import { palette } from "../../styles/theme.js";

const navItems = [
  { id: "analyst", icon: LayoutDashboard, label: "Threat Queue" },
  { id: "soc", icon: Activity, label: "SOC Radar" },
  { id: "manager", icon: BarChart3, label: "Risk Posture" },
  { id: "admin", icon: Lock, label: "Admin Console" },
  { id: "employees", icon: UserCheck, label: "Employees" },
  { id: "activity", icon: Cpu, label: "Activity Logs" },
  { id: "ueba", icon: Users, label: "UEBA Analytics" },
  { id: "reports", icon: FileText, label: "Reports" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const roles = [
  { name: "Security Analyst", user: "A. Reyes", avatar: "AR" },
  { name: "SOC Engineer", user: "J. Vance", avatar: "JV" },
  { name: "Security Manager", user: "E. Rostova", avatar: "ER" },
  { name: "Administrator", user: "M. Vance", avatar: "MV" },
];

export default function Sidebar({ activeTab, onSelectTab, currentRole, onRoleChange, onOpenAuth, mobileOpen, onMobileClose }) {
  const activeUser = roles.find(r => r.name === currentRole) || roles[0];

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 mb-5">
        <div className="flex items-center gap-2.5">
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

        {/* Close button — only visible on mobile */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Core Navigation Links */}
      <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: palette.textFaint }}>
        Core Modules
      </div>
      <nav className="flex flex-col gap-1">
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
              className="flex items-center gap-3 px-3 py-2 rounded-r-lg text-xs font-medium text-left transition-all hover:bg-slate-800/50 hover:text-white cursor-pointer"
            >
              <item.icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* System Online Badge Box (Reference Feature) */}
      <div className="mt-4 px-1">
        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)"
          }}
          className="p-2.5 rounded-xl flex items-center gap-2.5"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 relative"></span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider leading-none">
              System Online
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5 leading-none">
              Security monitoring is active
            </div>
          </div>
        </div>
      </div>

      {/* Role Selector & Static Logout Section */}
      <div style={{ borderTop: `1px solid ${palette.line}` }} className="mt-4 pt-3.5 px-1 space-y-3">
        {/* Active Role Selector */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: palette.textFaint }}>
            Active Session Role
          </div>
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{
                background: palette.raised,
                border: `1px solid ${palette.line}`,
                color: palette.textPrimary
              }}
              className="w-full py-2 px-3 pr-8 rounded-lg text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {roles.map((r) => (
                <option key={r.name} value={r.name} style={{ background: palette.surface, color: palette.textPrimary }}>
                  {r.name} ({r.user})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        {/* Static Logout Option Directly Below Role Selector */}
        <button
          onClick={onOpenAuth}
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)"
          }}
          className="w-full py-2.5 px-3 rounded-xl flex items-center justify-between group hover:bg-red-500/20 hover:border-red-500/40 transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <LogOut size={14} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-red-400 block group-hover:text-red-300">
                Logout
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {activeUser.user}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
            Sign Out
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — always visible on md+ screens */}
      <aside
        style={{ background: palette.surface, borderRight: `1px solid ${palette.line}`, width: 240 }}
        className="hidden md:flex flex-col shrink-0 h-screen py-5 px-3 select-none overflow-y-auto"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay — visible only when mobileOpen is true on small screens */}
      {mobileOpen && (
        <>
          {/* Dark overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onMobileClose}
          />
          {/* Slide-in sidebar panel */}
          <aside
            style={{ background: palette.surface, borderRight: `1px solid ${palette.line}`, width: 260 }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col py-5 px-3 select-none overflow-y-auto md:hidden animate-in slide-in-from-left duration-200 shadow-2xl shadow-black/40"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
