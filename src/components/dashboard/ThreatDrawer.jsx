import React, { useEffect } from 'react';
import { X, Lock, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RiskBadge from '../common/RiskBadge';

export default function ThreatDrawer({
  selectedEmployee,
  onClose,
  onLockAccount,
  onDismissFlag
}) {
  const { theme } = useTheme();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedEmployee) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 90,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Slide-out Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '400px',
          maxWidth: '90vw',
          height: '100vh',
          backgroundColor: theme.surface,
          borderLeft: `1px solid ${theme.border}`,
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.35)',
          padding: '28px 24px',
          boxSizing: 'border-box',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div>
          {/* Top Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${theme.border}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color={theme.primary} />
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '700',
                  color: theme.textPrimary
                }}
              >
                Forensic Threat Dossier
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: theme.textSecondary,
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.textPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textSecondary)}
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Identity Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '22px'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: selectedEmployee.avatarBg,
                color: selectedEmployee.avatarColor,
                fontWeight: '800',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {selectedEmployee.initial}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: '700',
                    color: theme.textPrimary
                  }}
                >
                  {selectedEmployee.name}
                </h3>
                <RiskBadge riskLevel={selectedEmployee.riskLevel} size="small" />
              </div>

              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '12px',
                  color: theme.textSecondary
                }}
              >
                {selectedEmployee.department} · Monitored ID: #{selectedEmployee.id}
              </p>
            </div>
          </div>

          {/* Risk Score Progress Bar */}
          <div
            style={{
              padding: '16px',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px solid ${theme.border}`,
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: theme.textSecondary
                }}
              >
                Behavioral Risk Index
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color:
                    selectedEmployee.score > 70
                      ? '#ef4444'
                      : selectedEmployee.score > 40
                      ? '#f97316'
                      : '#10b981'
                }}
              >
                {selectedEmployee.score} / 100
              </span>
            </div>

            {/* Score Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: `${theme.border}`,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${Math.min(selectedEmployee.score, 100)}%`,
                  height: '100%',
                  backgroundColor:
                    selectedEmployee.score > 70
                      ? '#ef4444'
                      : selectedEmployee.score > 40
                      ? '#f97316'
                      : '#10b981',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Incident Details Card */}
          <div
            style={{
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.border}`,
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: '700',
                color: theme.highText,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }}
            >
              <AlertTriangle size={14} />
              Detected Anomaly Vector
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: theme.textPrimary,
                lineHeight: '1.5'
              }}
            >
              {selectedEmployee.details}
            </p>
          </div>

          {/* Activity Metadata */}
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              fontSize: '12px',
              color: theme.textSecondary,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div>
              <strong style={{ color: theme.textPrimary }}>Last Flagged Event:</strong>{' '}
              {selectedEmployee.lastActivity}
            </div>
            <div>
              <strong style={{ color: theme.textPrimary }}>Telemetry Seen:</strong>{' '}
              {selectedEmployee.seen}
            </div>
          </div>
        </div>

        {/* Action Containment Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: `1px solid ${theme.border}`
          }}
        >
          <button
            onClick={() => onLockAccount(selectedEmployee.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
          >
            <Lock size={15} />
            Lock Account
          </button>

          <button
            onClick={() => onDismissFlag(selectedEmployee.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px 14px',
              backgroundColor: theme.surfaceVariant,
              color: theme.textPrimary,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.primary;
              e.currentTarget.style.backgroundColor = theme.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.backgroundColor = theme.surfaceVariant;
            }}
          >
            <CheckCircle size={15} />
            Dismiss Flag
          </button>
        </div>
      </div>
    </>
  );
}
