import React from 'react';

export const RiskBadge = ({ level, score }) => {
  const getColors = () => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return 'bg-red-950/80 text-red-400 border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse';
      case 'high':
        return 'bg-rose-950/70 text-rose-400 border-rose-800';
      case 'medium':
        return 'bg-amber-950/70 text-amber-400 border-amber-800';
      case 'low':
      default:
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-800';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getColors()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{level || 'Low'}</span>
      {score !== undefined && <span className="font-mono opacity-80">({score})</span>}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const getColors = () => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'informational':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getColors()}`}>
      {severity || 'Informational'}
    </span>
  );
};
