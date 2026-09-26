import React from 'react';

export const SeverityBadge = ({ severity, size = 'md' }) => {
  const sev = (severity || 'LOW').toUpperCase();

  const styles = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border ${styles[sev] || styles.LOW} ${sizeClasses[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sev === 'CRITICAL' ? 'bg-rose-400' : sev === 'HIGH' ? 'bg-orange-400' : sev === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
      {sev}
    </span>
  );
};

export default SeverityBadge;
