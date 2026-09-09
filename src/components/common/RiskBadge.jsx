import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function RiskBadge({ riskLevel = 'Low', size = 'medium' }) {
  const { theme } = useTheme();

  let bg = theme.lowBg;
  let text = theme.lowText;
  let dotColor = '#10b981';
  let isPulse = false;

  const level = String(riskLevel).toLowerCase();

  if (level === 'high' || level === 'critical') {
    bg = theme.highBg;
    text = theme.highText;
    dotColor = '#ef4444';
    isPulse = true;
  } else if (level === 'medium' || level === 'med') {
    bg = theme.medBg;
    text = theme.medText;
    dotColor = '#f97316';
  }

  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSmall ? '2px 7px' : '3px 9px',
        borderRadius: '999px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: '600',
        letterSpacing: '0.01em',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${text}33`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        className={isPulse ? 'pulse-dot' : ''}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {riskLevel}
    </span>
  );
}
