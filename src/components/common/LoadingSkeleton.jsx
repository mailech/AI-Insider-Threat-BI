import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * LoadingSkeleton component
 * Provides accessible, sleek shimmer placeholders during asynchronous operations.
 *
 * @param {string} height - Height of skeleton block (e.g. '20px', '48px')
 * @param {string} width - Width of skeleton block (e.g. '100%', '160px')
 * @param {string} borderRadius - Border radius (e.g. '6px', '12px')
 * @param {number} lines - Number of lines to render if multi-line text
 * @param {object} style - Extra inline styles
 */
export default function LoadingSkeleton({
  height = '20px',
  width = '100%',
  borderRadius = '6px',
  lines = 1,
  style = {}
}) {
  const { theme } = useTheme();

  if (lines > 1) {
    return (
      <div
        role="status"
        aria-label="Loading content..."
        style={{ display: 'flex', flexDirection: 'column', gap: '8px', width }}
      >
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="skeleton-shimmer"
            style={{
              height,
              width: idx === lines - 1 ? '70%' : '100%',
              borderRadius,
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.borderSubtle}`,
              ...style
            }}
          />
        ))}
        <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className="skeleton-shimmer"
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: theme.surfaceVariant,
        border: `1px solid ${theme.borderSubtle}`,
        ...style
      }}
    >
      <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        Loading...
      </span>
    </div>
  );
}
