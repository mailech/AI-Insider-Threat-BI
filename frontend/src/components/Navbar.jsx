import React from 'react';
import { Shield, Bell, User as UserIcon, LogOut, Terminal, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, role, logout, login } = useAuth();

  const handleRoleQuickSwitch = async (e) => {
    const targetRole = e.target.value;
    const roleAccounts = {
      'Security Analyst': { email: 'analyst@soc.corp', pass: 'analyst123' },
      'SOC Engineer': { email: 'soc@soc.corp', pass: 'soc123' },
      'Security Manager': { email: 'manager@soc.corp', pass: 'manager123' },
      'Administrator': { email: 'admin@soc.corp', pass: 'admin123' },
    };
    if (roleAccounts[targetRole]) {
      await login(roleAccounts[targetRole].email, roleAccounts[targetRole].pass);
    }
  };

  return (
    <header className="h-16 bg-[#111827]/95 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>INSIDER</span>
              <span className="text-cyan-400">THREAT</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">AI SOC 2.0</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            DEFCON 4 &bull; LIVE SENSORS ACTIVE &bull; ENTERPRISE UEBA
          </p>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* Role Quick Switcher for Evaluation / Viva */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 hidden sm:inline">Active Persona:</span>
          <select
            value={role || 'Security Analyst'}
            onChange={handleRoleQuickSwitch}
            className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
          >
            <option value="Security Analyst" className="bg-slate-900 text-slate-200">Security Analyst</option>
            <option value="SOC Engineer" className="bg-slate-900 text-slate-200">SOC Engineer</option>
            <option value="Security Manager" className="bg-slate-900 text-slate-200">Security Manager</option>
            <option value="Administrator" className="bg-slate-900 text-slate-200">Administrator</option>
          </select>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-200">{user?.name || 'SOC User'}</p>
            <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
