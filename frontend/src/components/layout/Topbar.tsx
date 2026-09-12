'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/lib/types';
import { Shield, Sparkles, ChevronDown, Check, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedScenariosModal } from '@/components/modals/GuidedScenariosModal';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onOpenShortcuts?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, onOpenShortcuts }) => {
  const { user, switchDemoRole } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [scenariosModalOpen, setScenariosModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const roles: UserRole[] = [
    'Administrator',
    'Security Manager',
    'SOC Engineer',
    'Security Analyst',
  ];

  const handleRoleSelect = async (role: UserRole) => {
    setRoleDropdownOpen(false);
    setIsSwitching(true);
    try {
      await switchDemoRole(role);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-violet-500/10 bg-[#09090E]/80 backdrop-blur-md">
      {/* Title / Context */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          {title || 'Security Dashboard'}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        )}
      </div>

      {/* Right Controls & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Guided Attack Scenarios Showcase Button */}
        <button
          type="button"
          onClick={() => setScenariosModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/35 text-violet-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.2)]"
          title="Guided Attack Scenarios Showcase (Verified Real Data Only)"
        >
          <Sparkles size={13} className="text-violet-400" />
          <span>Demo Scenarios</span>
        </button>

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:border-violet-500/30 text-xs transition-all cursor-pointer"
            title="Keyboard Shortcuts (Press '?')"
          >
            <Keyboard size={14} className="text-violet-400" />
            <kbd className="text-[10px] font-mono font-semibold px-1 rounded bg-white/10 text-slate-300">?</kbd>
          </button>
        )}

        {/* Real-time Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Telemetry Stream Active</span>
        </div>


        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            disabled={isSwitching}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:border-violet-500/50 transition-all text-xs font-medium"
          >
            <Shield size={14} className="text-violet-400" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
                Viewing As
              </span>
              <span className="text-white font-semibold">{user?.role}</span>
            </div>
            <ChevronDown size={14} className="text-violet-400 ml-1" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#151322] border border-violet-500/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-violet-400" /> Switch Role Profile
                </span>
              </div>

              {roles.map((r) => {
                const isSelected = user?.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors',
                      isSelected
                        ? 'bg-violet-600/20 text-violet-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{r}</span>
                    {isSelected && <Check size={14} className="text-violet-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Guided Attack Scenarios Modal */}
      <GuidedScenariosModal
        isOpen={scenariosModalOpen}
        onClose={() => setScenariosModalOpen(false)}
      />
    </header>
  );
};
