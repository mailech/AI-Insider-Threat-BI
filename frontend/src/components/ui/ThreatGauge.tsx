import React from 'react';
import { getRiskTierColor } from '@/lib/utils';
import { RiskTier } from '@/lib/types';

interface ThreatGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ThreatGauge: React.FC<ThreatGaugeProps> = ({
  score,
  size = 180,
  strokeWidth = 14,
  showLabel = true,
  label,
  className = '',
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 270 degree semi-open arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clampedScore / 100) * arcLength;

  let tier: RiskTier = 'Low';
  if (clampedScore >= 80) tier = 'Critical';
  else if (clampedScore >= 60) tier = 'High';
  else if (clampedScore >= 30) tier = 'Medium';

  const tierColors = getRiskTierColor(tier);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-135"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Glowing Animated Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tierColors.hex}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${tierColors.glow})`,
            }}
          />
        </svg>

        {/* Center Numerical Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
            {clampedScore}%
          </span>
          <span
            className="text-[10px] uppercase font-bold tracking-widest mt-0.5"
            style={{ color: tierColors.hex }}
          >
            {label || tier}
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            Fleet Threat Score
          </span>
        </div>
      )}
    </div>
  );
};
