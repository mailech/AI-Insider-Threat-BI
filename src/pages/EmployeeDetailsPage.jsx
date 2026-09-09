import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Laptop,
  Globe,
  Mail,
  MapPin,
  Flame,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import RiskBadge from '../components/common/RiskBadge';

export default function EmployeeDetailsPage({
  id: propId,
  employees = [],
  onLockAccount,
  onResetScore,
  onDismissFlag
}) {
  const params = useParams();
  const id = propId || params.id;
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [actionSuccess, setActionSuccess] = useState('');

  // Find Employee
  const employee = employees.find((e) => String(e.id) === String(id));

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 3500);
  };

  const handleLock = () => {
    if (onLockAccount) onLockAccount(employee.id);
    showNotification(`Account for ${employee.name} has been locked. Credential tokens revoked.`);
  };

  const handleReset = () => {
    if (onResetScore) {
      onResetScore(employee.id);
    }
    showNotification(`Risk score for ${employee.name} reset to baseline threshold.`);
  };

  const handleDismiss = () => {
    if (onDismissFlag) onDismissFlag(employee.id);
    showNotification(`Security flag for ${employee.name} marked as false positive.`);
  };

  // 404 Not Found State
  if (!employee) {
    return (
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: theme.shadow,
          maxWidth: '600px',
          margin: '40px auto'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: theme.textPrimary }}>
          Monitored Identity Not Found
        </h2>

        <p style={{ fontSize: '13px', color: theme.textSecondary, marginBottom: '24px', lineHeight: 1.5 }}>
          No employee identity with ID <code>#{id}</code> exists in the active behavioral monitoring database.
        </p>

        <button
          onClick={() => navigate('/employees')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: theme.primary,
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          Back to Monitored Directory
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Action Notification Toast */}
      {actionSuccess && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10b981',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <button
          onClick={() => navigate('/employees')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.surface)}
        >
          <ArrowLeft size={15} />
          Back to Monitored Directory
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.borderSubtle}`,
              fontSize: '12px',
              fontWeight: '700',
              color: theme.textSecondary
            }}
          >
            RECORD ID: #{employee.id}
          </span>
          <RiskBadge riskLevel={employee.riskLevel} />
        </div>
      </div>

      {/* Hero Profile Dossier Card */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '28px',
          boxShadow: theme.shadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '24px'
        }}
      >
        {/* Left: Avatar + Identity Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: employee.avatarBg,
              color: employee.avatarColor,
              fontWeight: '800',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${employee.avatarColor}22`,
              flexShrink: 0
            }}
          >
            {employee.initial}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
                {employee.name}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: employee.status === 'Locked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: employee.status === 'Locked' ? '#ef4444' : '#10b981',
                  border: `1px solid ${employee.status === 'Locked' ? '#ef4444' : '#10b981'}33`
                }}
              >
                {employee.status || 'Active'}
              </span>
            </div>

            <p style={{ margin: '4px 0 14px 0', fontSize: '13.5px', color: theme.textSecondary, fontWeight: '500' }}>
              {employee.role || employee.department} · {employee.department} Division
            </p>

            {/* Metadata Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: theme.textSecondary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={14} color={theme.primary} />
                {employee.email || `${employee.name.toLowerCase().replace(' ', '.')}@threat.ai`}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Laptop size={14} color={theme.primary} />
                {employee.workstation || 'WS-SEC-DEFAULT'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Globe size={14} color={theme.primary} />
                {employee.ipAddress || '192.168.1.100'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} color={theme.primary} />
                {employee.location || 'Corporate Office'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Containment Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleLock}
            disabled={employee.status === 'Locked'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: employee.status === 'Locked' ? theme.surfaceVariant : '#dc2626',
              color: employee.status === 'Locked' ? theme.textMuted : '#ffffff',
              fontWeight: '700',
              fontSize: '13px',
              cursor: employee.status === 'Locked' ? 'not-allowed' : 'pointer',
              boxShadow: employee.status === 'Locked' ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
          >
            <Lock size={15} />
            {employee.status === 'Locked' ? 'Account Suspended' : 'Lock Account'}
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surfaceVariant,
              color: theme.textPrimary,
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
            Reset Score
          </button>

          <button
            onClick={handleDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surfaceVariant,
              color: theme.textPrimary,
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <CheckCircle size={15} />
            Dismiss Flag
          </button>
        </div>
      </div>

      {/* Two Column Grid: Risk Score vs Factors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '22px'
        }}
      >
        {/* Risk Score Visualizer Card */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '24px 26px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '12.5px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.textSecondary,
                  margin: 0
                }}
              >
                Composite Risk Assessment
              </h3>
              <RiskBadge riskLevel={employee.riskLevel} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '18px' }}>
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: '900',
                  lineHeight: 1,
                  color:
                    employee.score > 70
                      ? '#ef4444'
                      : employee.score > 40
                      ? '#f97316'
                      : '#10b981',
                  fontFeatureSettings: '"tnum"'
                }}
              >
                {employee.score}
                <span style={{ fontSize: '18px', color: theme.textSecondary, fontWeight: '600' }}>
                  /100
                </span>
              </div>

              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: theme.textPrimary }}>
                  {employee.score > 70 ? 'Severe Threat Vector' : employee.score > 40 ? 'Moderate Anomaly' : 'Standard Baseline'}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                  Last event telemetry logged {employee.seen}
                </div>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: theme.surfaceVariant,
                overflow: 'hidden',
                marginBottom: '18px'
              }}
            >
              <div
                style={{
                  width: `${Math.min(employee.score, 100)}%`,
                  height: '100%',
                  borderRadius: '4px',
                  backgroundColor:
                    employee.score > 70
                      ? '#ef4444'
                      : employee.score > 40
                      ? '#f97316'
                      : '#10b981',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* Incident Callout */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: theme.surfaceVariant,
              border: `1px solid ${theme.borderSubtle}`,
              borderRadius: '10px',
              fontSize: '12.5px',
              lineHeight: 1.5
            }}
          >
            <strong style={{ color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertTriangle size={14} color="#f97316" />
              Primary Trigger Incident:
            </strong>
            <span style={{ color: theme.textSecondary }}>{employee.details}</span>
          </div>
        </div>

        {/* Risk Factors Breakdown */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '24px 26px',
            boxShadow: theme.shadow
          }}
        >
          <h3
            style={{
              fontSize: '12.5px',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: theme.textSecondary,
              margin: '0 0 16px 0'
            }}
          >
            Behavioral Risk Vector Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(employee.riskFactors || [
              { name: 'Data Movement Velocity', score: 85 },
              { name: 'Anomalous Authentication', score: 70 },
              { name: 'Privilege Scope Deviation', score: 35 },
              { name: 'Off-Hours Activity', score: 50 }
            ]).map((factor) => (
              <div key={factor.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: theme.textPrimary }}>{factor.name}</span>
                  <span style={{ fontWeight: '700', color: theme.textSecondary }}>{factor.score}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: theme.surfaceVariant,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${factor.score}%`,
                      height: '100%',
                      borderRadius: '3px',
                      backgroundColor:
                        factor.score > 75
                          ? '#ef4444'
                          : factor.score > 45
                          ? '#f97316'
                          : '#10b981'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Behavioral Indicators Chips */}
      {employee.behavioralIndicators && employee.behavioralIndicators.length > 0 && (
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '20px 24px',
            boxShadow: theme.shadow
          }}
        >
          <h3
            style={{
              fontSize: '12.5px',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: theme.textSecondary,
              margin: '0 0 12px 0'
            }}
          >
            Detected Behavioral Indicators
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {employee.behavioralIndicators.map((ind) => (
              <span
                key={ind}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  backgroundColor: theme.surfaceVariant,
                  border: `1px solid ${theme.borderSubtle}`,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textPrimary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Terminal size={12} color={theme.primary} />
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Security Events Chronological Audit Log */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0', color: theme.textPrimary }}>
            Security Events & Forensic Audit Log
          </h3>
          <p style={{ margin: 0, fontSize: '12.5px', color: theme.textSecondary }}>
            Chronological forensic trace of endpoint alerts, authentication attempts, and DLP triggers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(employee.securityEvents || [
            {
              id: 'EVT-01',
              title: employee.lastActivity,
              severity: employee.riskLevel,
              timestamp: employee.seen,
              source: employee.workstation,
              description: employee.details
            }
          ]).map((evt) => (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '16px 18px',
                backgroundColor: theme.surfaceVariant,
                border: `1px solid ${theme.borderSubtle}`,
                borderRadius: '10px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '260px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor:
                      evt.severity === 'Critical'
                        ? 'rgba(220, 38, 38, 0.15)'
                        : evt.severity === 'High'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : evt.severity === 'Medium'
                        ? 'rgba(249, 115, 22, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    color:
                      evt.severity === 'Critical' || evt.severity === 'High'
                        ? '#ef4444'
                        : evt.severity === 'Medium'
                        ? '#f97316'
                        : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                >
                  <Flame size={16} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', color: theme.textPrimary }}>
                      {evt.title}
                    </span>
                    <RiskBadge riskLevel={evt.severity} size="small" />
                  </div>

                  <p style={{ margin: '4px 0 6px 0', fontSize: '12.5px', color: theme.textSecondary, lineHeight: 1.4 }}>
                    {evt.description}
                  </p>

                  <div style={{ fontSize: '11px', color: theme.textMuted }}>
                    Source Sensor: <strong>{evt.source}</strong>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {evt.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
