import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Cpu, Gauge,
  Radio, AlertTriangle, FileText, Settings, ShieldCheck,
  Zap, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { role } = useAuth();

  const getDashboardPath = () => {
    switch (role) {
      case 'SOC Engineer': return '/soc';
      case 'Security Manager': return '/manager';
      case 'Administrator': return '/admin-dash';
      case 'Security Analyst':
      default:
        return '/analyst';
    }
  };

  const navItems = [
    { label: 'Role Dashboard', path: getDashboardPath(), icon: LayoutDashboard, exact: true },
    { label: 'Employees & Assets', path: '/employees', icon: Users },
    { label: 'Activity Monitoring', path: '/activities', icon: Activity },
    { label: 'Behavioral Profiling / UEBA', path: '/ueba', icon: Radio },
    { label: 'AI Anomaly Detection', path: '/anomalies', icon: Cpu },
    { label: 'Insider Risk Scoring', path: '/risk-scoring', icon: Gauge },
    { label: 'Threat Alerts', path: '/alerts', icon: AlertTriangle },
    { label: 'Incident Management', path: '/incidents', icon: ShieldCheck },
    { label: 'Reports & Export', path: '/reports', icon: FileText },
    { label: 'Attack Simulator / Admin', path: '/admin-control', icon: Zap },
  ];

  return (
    <aside className="w-64 bg-[#0d1320] border-r border-slate-800 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">SOC Navigation</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Quick Role Dashboards Switch */}
        <div className="pt-4 border-t border-slate-800/80">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Role Views</p>
          <div className="space-y-1">
            <NavLink
              to="/analyst"
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-cyan-400 bg-slate-800/80 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              &bull; Security Analyst View
            </NavLink>
            <NavLink
              to="/soc"
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-cyan-400 bg-slate-800/80 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              &bull; SOC Engineer View
            </NavLink>
            <NavLink
              to="/manager"
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-cyan-400 bg-slate-800/80 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              &bull; Security Manager View
            </NavLink>
            <NavLink
              to="/admin-dash"
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-cyan-400 bg-slate-800/80 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              &bull; Administrator View
            </NavLink>
          </div>
        </div>
      </div>

      {/* System Status Pill */}
      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <span>ML Ensemble</span>
          <span className="text-emerald-400 font-mono">100% ONLINE</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">5 Models Active &bull; FastAPI 2.0</p>
      </div>
    </aside>
  );
};
