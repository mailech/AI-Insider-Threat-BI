import React, { useState } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  Activity,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const analystActivities = [
    {
      id: 'ACT-901',
      action: 'Containment Directive Executed',
      details: 'Suspended credentials for Priya Nair (ID 104) on WS-LEG-014.',
      time: '25m ago',
      type: 'containment'
    },
    {
      id: 'ACT-884',
      action: 'Incident ALT-872 Triage Resolved',
      details: 'Verified CI/CD script for David Kim; marked incident resolved.',
      time: '1d ago',
      type: 'resolution'
    },
    {
      id: 'ACT-870',
      action: 'Executive Audit Brief Generated',
      details: 'Exported official CISO Security Intelligence Dossier (PDF).',
      time: '1d ago',
      type: 'report'
    },
    {
      id: 'ACT-855',
      action: 'Risk Score Adjusted to Baseline',
      details: 'Reset threat index to 15 for John Carter following out-of-band verification.',
      time: '2d ago',
      type: 'score'
    },
    {
      id: 'ACT-820',
      action: 'Detection Thresholds Recalibrated',
      details: 'Committed strict behavioral anomaly sensitivity benchmarks.',
      time: '3d ago',
      type: 'settings'
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 1000,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>
            {toastMessage}
          </span>
        </div>
      )}

      {/* ================================================= */}
      {/* 1. ANALYST IDENTITY HERO CARD                     */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '28px 32px',
          boxShadow: theme.shadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar Initial Circle */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              backgroundColor: theme.primaryContainer,
              color: theme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '24px',
              border: `2px solid ${theme.primary}`,
              flexShrink: 0
            }}
          >
            {user?.initials || 'SO'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: theme.textPrimary }}>
                {user?.name || 'Security Ops'}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: theme.primary,
                  border: '1px solid rgba(99, 102, 241, 0.25)'
                }}
              >
                TOP SECRET // SCI
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                ACTIVE DUTY
              </span>
            </div>

            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
              {user?.role || 'Senior Threat Analyst'} • {user?.department || 'Security Operations'} (ID: SOC-ANALYST-402)
            </p>
            <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px', display: 'block' }}>
              Shift: Alpha (EMEA & Americas Core) • Station: Frankfurt Primary SOC
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => showToast('Analyst session keys rotated successfully.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surfaceVariant,
              color: theme.textPrimary,
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            Rotate Keys
          </button>

          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* 2. OPERATIONAL TRIAGE METRICS STRIP               */}
      {/* ================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <div style={{ backgroundColor: theme.surface, padding: '18px 20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
            Incidents Triaged
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: theme.textPrimary, marginTop: '4px' }}>
            128
          </div>
          <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: '600' }}>+12 this shift</span>
        </div>

        <div style={{ backgroundColor: theme.surface, padding: '18px 20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
            Accounts Contained
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
            14
          </div>
          <span style={{ fontSize: '11.5px', color: theme.textSecondary }}>Immediate isolation policy</span>
        </div>

        <div style={{ backgroundColor: theme.surface, padding: '18px 20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
            Mean Time to Triage
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: theme.primary, marginTop: '4px' }}>
            14 min
          </div>
          <span style={{ fontSize: '11.5px', color: theme.textSecondary }}>Top 10% SOC performance</span>
        </div>

        <div style={{ backgroundColor: theme.surface, padding: '18px 20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
            False Positive Calibration
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
            4.2%
          </div>
          <span style={{ fontSize: '11.5px', color: theme.textSecondary }}>High-fidelity heuristics</span>
        </div>
      </div>

      {/* ================================================= */}
      {/* 3. CREDENTIALS & SECURITY POSTURE                 */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
          Analyst Session Credentials & Cryptographic Attestation
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '14px', backgroundColor: theme.surfaceVariant, borderRadius: '8px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Lock size={15} color={theme.primary} />
              <strong style={{ fontSize: '12.5px', color: theme.textPrimary }}>Authentication Token</strong>
            </div>
            <span style={{ fontSize: '12px', color: theme.textSecondary }}>
              Hardware FIDO2 YubiKey 5C NFC (Enforced)
            </span>
          </div>

          <div style={{ padding: '14px', backgroundColor: theme.surfaceVariant, borderRadius: '8px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Shield size={15} color="#10b981" />
              <strong style={{ fontSize: '12.5px', color: theme.textPrimary }}>Security Roles</strong>
            </div>
            <span style={{ fontSize: '12px', color: theme.textSecondary }}>
              SOC_INCIDENT_RESPONDER, DLP_CONTAINMENT_ADMIN
            </span>
          </div>

          <div style={{ padding: '14px', backgroundColor: theme.surfaceVariant, borderRadius: '8px', border: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Clock size={15} color={theme.primary} />
              <strong style={{ fontSize: '12.5px', color: theme.textPrimary }}>Session Lifetime</strong>
            </div>
            <span style={{ fontSize: '12px', color: theme.textSecondary }}>
              Active for 3h 42m • Expires in 4h 18m
            </span>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* 4. RECENT ANALYST SECURITY ACTIVITY AUDIT TRAIL   */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
          Recent SOC Analyst Audit Trail
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {analystActivities.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: theme.surfaceVariant,
                border: `1px solid ${theme.borderSubtle}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    backgroundColor:
                      act.type === 'containment'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : act.type === 'resolution'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      act.type === 'containment'
                        ? '#ef4444'
                        : act.type === 'resolution'
                        ? '#10b981'
                        : theme.primary,
                    flexShrink: 0
                  }}
                >
                  <Activity size={15} />
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: theme.textPrimary }}>
                    {act.action}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                    {act.details}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '11.5px', color: theme.textSecondary, whiteSpace: 'nowrap' }}>
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
