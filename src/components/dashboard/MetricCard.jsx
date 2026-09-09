import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function MetricCard({
  number,
  title,
  change,
  color = '#ef4444',
  icon: Icon
}) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${isHovered ? color + '66' : theme.border}`,
        borderRadius: '12px',
        padding: '20px 22px',
        boxShadow: isHovered
          ? `0 8px 24px ${color}15, ${theme.shadow}`
          : theme.shadow,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top row: Number and Icon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '800',
              color: theme.textPrimary,
              fontFeatureSettings: '"tnum"',
              lineHeight: 1.1
            }}
          >
            {number}
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '500',
              color: theme.textSecondary,
              marginTop: '6px'
            }}
          >
            {title}
          </div>
        </div>

        {Icon && (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: `${color}15`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Bottom delta indicator */}
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: '600',
            color: color,
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: `${color}12`
          }}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
