import React from 'react';
import { SeverityLevel } from '../../types';

interface SecurityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ 
  severity, 
  size = 'md',
  className = '' 
}) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#FF334B]/15 text-[#FF334B] border-[#FF334B]/40 shadow-[0_0_8px_rgba(255,51,75,0.25)]';
      case 'HIGH':
        return 'bg-[#FF7043]/15 text-[#FF7043] border-[#FF7043]/40 shadow-[0_0_8px_rgba(255,112,67,0.25)]';
      case 'MEDIUM':
        return 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/40';
      case 'LOW':
        return 'bg-[#18E66A]/15 text-[#2DFF78] border-[#18E66A]/40 shadow-[0_0_8px_rgba(24,230,106,0.2)]';
      case 'INFORMATIONAL':
      default:
        return 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-[9px] px-1.5 py-0.5';
      case 'lg':
        return 'text-xs px-3 py-1';
      case 'md':
      default:
        return 'text-[10px] px-2 py-0.5';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded border ${getSeverityStyles()} ${getSizeStyles()} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{severity}</span>
    </span>
  );
};
