import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  Shield,
  Activity,
  Cpu,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#090e1f]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input / Quick Filter */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee ID (e.g. AAE0190), alert, case..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/employees?search=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>
      </div>

      {/* Real-time Telemetry & Profile Action */}
      <div className="flex items-center gap-4">
        {/* ML Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>IsoForest + XGBoost:</span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>

        {/* Live Alerts Notification button */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
          title="View Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* User Role Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>{user?.role || 'Analyst'}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
