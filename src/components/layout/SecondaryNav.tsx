import React from 'react';
import { useSecurity, NavSection } from '../../context/SecurityContext';

export const SecondaryNav: React.FC = () => {
  const { activeNav, setActiveNav } = useSecurity();

  const navLinks: { id: NavSection; label: string }[] = [
    { id: 'command-center', label: 'COMMAND CENTER' },
    { id: 'behavior', label: 'BEHAVIOR' },
    { id: 'risk-intelligence', label: 'RISK INTELLIGENCE' },
    { id: 'threat-detection', label: 'THREAT DETECTION' },
    { id: 'investigation', label: 'INVESTIGATION' },
    { id: 'ueba', label: 'UEBA ANALYTICS' },
    { id: 'threat-intel', label: 'THREAT INTELLIGENCE' },
    { id: 'analytics', label: 'ANALYTICS' },
    { id: 'reports', label: 'REPORTS' },
    { id: 'admin', label: 'ADMINISTRATION' },
  ];

  return (
    <nav className="w-full bg-[#040B08] border-b border-[#18E66A]/20 px-3 sm:px-4 flex items-center overflow-x-auto scrollbar-none select-none z-30">
      <div className="flex items-center space-x-1 sm:space-x-2 py-1">
        {navLinks.map((link) => {
          const isActive = 
            activeNav === link.id || 
            (link.id === 'behavior' && activeNav === 'employees') ||
            (link.id === 'threat-detection' && (activeNav === 'alerts' || activeNav === 'telemetry')) ||
            (link.id === 'analytics' && activeNav === 'risk-analytics');

          return (
            <button
              key={link.id}
              onClick={() => setActiveNav(link.id)}
              className={`relative px-3 py-2 text-xs font-mono font-bold tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                isActive
                  ? 'text-[#2DFF78] font-black'
                  : 'text-[#8CA798] hover:text-[#E8FFF0] hover:bg-[#07140E]/60'
              }`}
            >
              <span>{link.label}</span>

              {/* Active Green Glow Underline Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#18E66A] shadow-[0_0_8px_#2DFF78]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
