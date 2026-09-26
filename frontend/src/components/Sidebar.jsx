import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Activity,
  AlertTriangle,
  FileSearch,
  BarChart3,
  BrainCircuit,
  UserCheck,
  Settings,
  Flame,
  Radio,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'SOC Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Monitored Employees', path: '/employees', icon: Users },
    { name: 'Daily Activities', path: '/activities', icon: Activity },
    { name: 'Anomalies & Baselines', path: '/anomalies', icon: BrainCircuit },
    { name: 'Security Alerts', path: '/alerts', icon: AlertTriangle, badge: 'LIVE' },
    { name: 'Incident Cases', path: '/incidents', icon: FileSearch },
    { name: 'SOC Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Security Reports', path: '/reports', icon: FileText },
    { name: 'Analyst Profile', path: '/profile', icon: UserCheck },
    ...(user?.role === 'Administrator' ? [{ name: 'Admin Console', path: '/admin', icon: Settings }] : []),
  ];

  return (
    <aside className="w-64 bg-[#090e1f] border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-cyber-cyan">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-wide text-slate-100 flex items-center gap-1.5 font-mono">
            <span className="text-cyan-400">THREAT-BI</span>
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            Behavioral SOC R4.2
          </div>
        </div>
      </div>

      {/* Real-time System Status Pill */}
      <div className="px-4 py-3 m-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-300 font-medium">CERT R4.2 Engine</span>
        </div>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
          ACTIVE
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
            {user?.username?.substring(0, 2).toUpperCase() || 'SO'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-slate-200 truncate">{user?.full_name || user?.username}</div>
            <div className="text-[10px] text-cyan-400/80 font-mono truncate">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
