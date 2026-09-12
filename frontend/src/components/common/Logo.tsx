import React from 'react';

interface LogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ collapsed = false, size = 'md', className = '' }) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Modern geometric AMS pulse/radar badge */}
      <div className={`relative ${iconSize} flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 p-0.5 shadow-[0_0_18px_rgba(139,92,246,0.5)] border border-violet-400/40`}>
        <div className="w-full h-full bg-[#0E0D18] rounded-[10px] flex items-center justify-center relative overflow-hidden">
          {/* Subtle radar sweep background */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.8)_0,transparent_70%)]" />
          
          {/* Pulse / Activity Wave Geometric Monogram */}
          <svg className="w-5 h-5 text-violet-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h3.5l2.5-6 4 12 2.5-7 2.5 3h3" />
            <circle cx="12" cy="12" r="9" strokeOpacity="0.3" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-white ${textSize}`}>
              Activity Management System
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-violet-400/80 font-semibold">
            Behavioral Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
