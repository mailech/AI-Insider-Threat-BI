import React, { useState } from 'react';
import { 
  Search, 
  Terminal, 
  Users, 
  Flame, 
  ShieldAlert, 
  Activity, 
  Lock, 
  Database,
  ArrowRight
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    employees, 
    setSelectedEmployeeId, 
    setActiveNav,
    openContainmentModal 
  } = useSecurity();

  const [search, setSearch] = useState('');

  if (!isCommandPaletteOpen) return null;

  const quickActions = [
    { label: 'Investigate Authar Morgan (EMP-1042)', icon: Users, action: () => { setSelectedEmployeeId('EMP-1042'); setActiveNav('employees'); } },
    { label: 'Quarantine Host DESKTOP-7G8H2', icon: Lock, action: () => openContainmentModal('EMP-1042', 'ISOLATE') },
    { label: 'Open Behavioral Threat Surface Graph', icon: Activity, action: () => setActiveNav('threat-map') },
    { label: 'Live Telemetry Ingestion Terminal', icon: Terminal, action: () => setActiveNav('telemetry') },
    { label: 'Review MITRE ATT&CK Detections', icon: ShieldAlert, action: () => setActiveNav('threat-detection') },
    { label: 'Generate Executive Threat Dossier', icon: Database, action: () => setActiveNav('reports') },
  ];

  const filtered = quickActions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-24 p-4 font-mono select-none">
      <div 
        className="cyber-panel rounded-xl max-w-xl w-full p-3 space-y-3 shadow-2xl border border-[#18E66A]/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#020605] rounded-lg border border-[#18E66A]/30">
          <Search className="w-4 h-4 text-[#18E66A]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, identity (Authar Morgan), or SOC shortcut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[#E8FFF0] placeholder-[#567363] w-full focus:outline-none"
          />
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-[#0A1C13] border border-[#18E66A]/20 text-[#8CA798]">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => {
                  item.action();
                  setIsCommandPaletteOpen(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#0A1C13] border border-transparent hover:border-[#18E66A]/30 cursor-pointer transition-colors text-xs text-[#E8FFF0]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#18E66A]" />
                  <span>{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8CA798]" />
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
          <span>Sentinel AI SOC Command Quick Launcher</span>
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-[#FF7043] hover:underline"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
