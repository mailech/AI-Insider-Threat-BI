'use client';

import React from 'react';
import { Shield } from 'lucide-react';

interface MitreBadgeProps {
  techniqueId?: string | null;
  techniqueName?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export const MitreBadge: React.FC<MitreBadgeProps> = ({
  techniqueId,
  techniqueName,
  size = 'sm',
  className = '',
}) => {
  if (!techniqueId) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-semibold transition-colors bg-sky-500/10 text-sky-300 border border-sky-500/25 hover:bg-sky-500/20 ${
        size === 'sm' ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'
      } ${className}`}
      title={techniqueName ? `MITRE ATT&CK ${techniqueId}: ${techniqueName}` : `MITRE ATT&CK ${techniqueId}`}
    >
      <Shield size={size === 'sm' ? 9 : 11} className="text-sky-400" />
      <span>{techniqueId}</span>
      {techniqueName && size === 'md' && (
        <span className="text-slate-400 font-normal truncate max-w-[120px] hidden sm:inline">
          {techniqueName}
        </span>
      )}
    </span>
  );
};
