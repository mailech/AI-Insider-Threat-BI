import React from 'react';
import { 
  ShieldAlert, 
  Search, 
  Bell, 
  Radio, 
  User, 
  Sliders, 
  Activity, 
  Menu,
  Sparkles,
  Zap,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const TopCommandBar: React.FC = () => {
  const { 
    currentRole, 
    setCurrentRole, 
    isTelemetryLive, 
    setIsCommandPaletteOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsMobileSidebarOpen,
    alerts 
  } = useSecurity();

  const unreadAlertsCount = alerts.filter(a => a.status === 'NEW' || a.status === 'ESCALATED').length;

  const handleToggleMenu = () => {
    // On mobile, toggle drawer
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <header className="w-full bg-[#020605] border-b border-[#18E66A]/20 px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-30 select-none">
      
      {/* LEFT: Menu Toggle + Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleToggleMenu}
          className="p-1.5 rounded-lg bg-[#07140E] hover:bg-[#0A1C13] border border-[#18E66A]/25 hover:border-[#18E66A]/50 text-[#73FFA5] hover:text-[#2DFF78] transition-colors"
          title="Toggle Left Menu Bar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-[#18E66A] to-[#0A1C13] p-0.5 flex items-center justify-center shadow-[0_0_10px_rgba(24,230,106,0.3)]">
            <ShieldAlert className="w-5 h-5 text-[#020605]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm tracking-wider text-[#E8FFF0]">
                SENTINEL AI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-[#18E66A]/15 text-[#2DFF78] font-mono text-[9px] font-bold border border-[#18E66A]/30">
                SOC v4.2
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#8CA798] tracking-wider uppercase font-semibold hidden md:inline">
              INSIDER THREAT BEHAVIORAL INTELLIGENCE
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: Global Search (CTRL + K) */}
      <div 
        onClick={() => setIsCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-2.5 w-72 lg:w-96 px-3 py-1.5 rounded-lg bg-[#07140E] border border-[#18E66A]/25 hover:border-[#18E66A]/60 text-[#8CA798] cursor-pointer transition-all shadow-inner"
      >
        <Search className="w-3.5 h-3.5 text-[#18E66A]" />
        <span className="text-xs truncate text-[#8CA798]">
          Search employee, anomaly, IP, host...
        </span>
        <kbd className="ml-auto font-mono text-[10px] bg-[#020605] text-[#2DFF78] px-1.5 py-0.5 rounded border border-[#18E66A]/30 shadow-sm">
          CTRL + K
        </kbd>
      </div>

      {/* RIGHT: AI Engine Status, Alerts, Role & User Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        
        {/* AI Engine Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#07140E] border border-[#18E66A]/25 text-[#E8FFF0] font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#2DFF78] animate-pulse" />
          <span className="text-[#2DFF78] font-bold">AI ENGINE ONLINE</span>
          <span className="text-[#8CA798]">•</span>
          <span className="text-[#8CA798] text-[10px]">12.8K EPS</span>
        </div>

        {/* Notifications Icon */}
        <div 
          onClick={() => setIsCommandPaletteOpen(true)}
          className="relative p-1.5 rounded-lg bg-[#07140E] hover:bg-[#0A1C13] border border-[#18E66A]/25 hover:border-[#18E66A]/50 text-[#73FFA5] cursor-pointer transition-colors"
          title="Active Risk Alerts"
        >
          <Bell className="w-4 h-4 text-[#2DFF78]" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF334B] text-white font-mono text-[9px] font-bold flex items-center justify-center border border-[#020605]">
              {unreadAlertsCount}
            </span>
          )}
        </div>

        {/* Role Selector Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#07140E] px-2 py-1 rounded-lg border border-[#18E66A]/25">
          <Sliders className="w-3.5 h-3.5 text-[#18E66A]" />
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as any)}
            className="bg-transparent text-[#E8FFF0] font-mono text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="SOC_ANALYST" className="bg-[#07140E] text-[#E8FFF0]">SOC Analyst</option>
            <option value="ADMIN" className="bg-[#07140E] text-[#E8FFF0]">Global Admin</option>
            <option value="THREAT_HUNTER" className="bg-[#07140E] text-[#E8FFF0]">Threat Hunter</option>
            <option value="COMPLIANCE_OFFICER" className="bg-[#07140E] text-[#E8FFF0]">Compliance Officer</option>
          </select>
        </div>

        {/* User Identity Pill: Authar Morgan */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#18E66A]/20">
          <div className="w-7 h-7 rounded-full bg-[#0A1C13] border border-[#18E66A]/50 flex items-center justify-center text-[#2DFF78] font-bold font-mono text-xs shadow-sm">
            AM
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="font-mono font-bold text-[#E8FFF0] text-[11px]">Authar Morgan</span>
            <span className="text-[9px] text-[#8CA798]">Principal Analyst</span>
          </div>
        </div>

      </div>

    </header>
  );
};
