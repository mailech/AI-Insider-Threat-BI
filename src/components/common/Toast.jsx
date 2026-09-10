import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Toast component
 * Unified, accessible floating feedback notification.
 *
 * @param {string} message - Toast text content
 * @param {string} type - 'success' | 'warning' | 'info' | 'error'
 * @param {function} onClose - Dismiss callback
 * @param {number} duration - Auto-dismiss timeout in ms (default 3500)
 */
export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 3500
}) {
  const { theme } = useTheme();

  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  let Icon = CheckCircle2;
  let accentColor = '#10b981';
  let bgColor = 'rgba(16, 185, 129, 0.12)';

  if (type === 'warning' || type === 'error') {
    Icon = AlertTriangle;
    accentColor = '#ef4444';
    bgColor = 'rgba(239, 68, 68, 0.12)';
  } else if (type === 'info') {
    Icon = Info;
    accentColor = theme.primary;
    bgColor = 'rgba(79, 70, 229, 0.12)';
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="animate-fade-in"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        backgroundColor: theme.surface,
        border: `1px solid ${accentColor}`,
        borderRadius: '10px',
        boxShadow: theme.shadow,
        maxWidth: '420px',
        color: theme.textPrimary
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          backgroundColor: bgColor,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Icon size={16} />
      </div>

      <span style={{ fontSize: '13px', fontWeight: '500', lineHeight: 1.4, flex: 1 }}>
        {message}
      </span>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss message"
          style={{
            background: 'none',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
