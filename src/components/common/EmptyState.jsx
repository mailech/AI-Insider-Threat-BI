import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function EmptyState({
  title = 'No Monitored Personnel Found',
  description = 'No employee records match your active search and risk filter criteria.',
  onReset
}) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          backgroundColor: theme.surfaceVariant,
          border: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.textSecondary,
          marginBottom: '16px'
        }}
      >
        <ShieldAlert size={26} strokeWidth={1.75} />
      </div>

      <h4
        style={{
          margin: '0 0 6px 0',
          fontSize: '15px',
          fontWeight: '600',
          color: theme.textPrimary
        }}
      >
        {title}
      </h4>

      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: theme.textSecondary,
          maxWidth: '380px',
          lineHeight: '1.4'
        }}
      >
        {description}
      </p>

      {onReset && (
        <button
          onClick={onReset}
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.border)}
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
