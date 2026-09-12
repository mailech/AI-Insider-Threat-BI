import React from 'react';
import { getRiskTierColor, getSeverityColor, cn } from '@/lib/utils';
import { RiskTier, SeverityLevel } from '@/lib/types';

interface RiskBadgeProps {
  tier?: RiskTier | string;
  severity?: SeverityLevel | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  tier,
  severity,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';
  
  if (severity) {
    const sevColor = getSeverityColor(severity);
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full uppercase tracking-wider font-semibold',
          sevColor,
          sizeClasses,
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {severity}
      </span>
    );
  }

  const tierColors = getRiskTierColor(tier || 'Low');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        tierColors.badge,
        sizeClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {tier || 'Low'}
    </span>
  );
};
