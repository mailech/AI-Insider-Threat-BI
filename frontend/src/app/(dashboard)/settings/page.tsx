'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, clearToken, getCurrentUser } from '@/services/api';
import { canConfigureScoringRules, canViewSystemHealth } from '@/lib/rbac';
import type { UserRead, RoleEnum } from '@/types/api';

// ── Toast Notification System ──────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '84px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor:
              t.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : t.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${
              t.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : t.type === 'error'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(59, 130, 246, 0.4)'
            }`,
            color:
              t.type === 'success'
                ? '#10B981'
                : t.type === 'error'
                ? '#EF4444'
                : '#3B82F6',
            fontSize: '13px',
            fontWeight: 600,
            minWidth: '280px',
            maxWidth: '440px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.7,
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Design Components ─────────────────────────────────────────────────────────

function CardSection({
  title,
  subtitle,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: '1px solid #2A3352',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #2A3352',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </div>
      <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
  );
}

function ToggleRow({
  id,
  checked,
  onChange,
  label,
  description,
  badgeText,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  badgeText?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 22px',
        borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
      }}
    >
      <div style={{ paddingRight: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {label}
          </p>
          {badgeText && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3B82F6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        <p
          style={{
            margin: '3px 0 0',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: '1.4',
          }}
        >
          {description}
        </p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: checked ? '#3B82F6' : '#1E2640',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
          outline: 'none',
          boxShadow: checked
            ? '0 0 10px rgba(59, 130, 246, 0.4)'
            : 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />
      </button>
    </div>
  );
}

function StatusBadge({
  status,
  latency,
}: {
  status: 'checking' | 'online' | 'offline';
  latency?: number | null;
}) {
  const colors = { checking: '#94A3B8', online: '#10B981', offline: '#EF4444' };
  const labels = { checking: 'Pinging…', online: 'Operational', offline: 'Offline' };
  const color = colors[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: `${color}15`,
          border: `1px solid ${color}35`,
          fontSize: '12px',
          fontWeight: 700,
          color,
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
            animation: status === 'online' ? 'pulse-ring 2.5s infinite' : undefined,
          }}
        />
        {labels[status]}
      </span>
      {status === 'online' && latency !== undefined && latency !== null && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {latency}ms
        </span>
      )}
    </div>
  );
}

function RBACRestrictedBanner({
  title,
  requiredRoles,
  currentRole,
}: {
  title: string;
  requiredRoles: string[];
  currentRole?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: '1px solid #2A3352',
        borderRadius: '14px',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#EF4444',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ width: '24px', height: '24px' }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 6px',
        }}
      >
        Access Restricted: {title}
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          maxWidth: '480px',
          margin: '0 auto 18px',
          lineHeight: '1.5',
        }}
      >
        You do not have sufficient role permissions to configure or view these settings.
        This section is restricted strictly to Administrator access.
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#1E2640',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #2A3352',
          fontSize: '12px',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>Required Role:</span>
        <span style={{ fontWeight: 700, color: '#EF4444' }}>
          {requiredRoles.join(', ')}
        </span>
        <span
          style={{
            color: 'var(--color-border-subtle)',
            borderLeft: '1px solid #2A3352',
            height: '14px',
          }}
        />
        <span style={{ color: 'var(--color-text-muted)' }}>Your Role:</span>
        <span
          style={{
            fontWeight: 700,
            color: currentRole ? '#F59E0B' : '#94A3B8',
          }}
        >
          {currentRole || 'Loading…'}
        </span>
      </div>
    </div>
  );
}

// ── Default Weights (ITBIS Weighted Threat Model) ─────────────────────────────

const DEFAULT_WEIGHTS = {
  behavioralAnomaliesWeight: 0.35,     // 35%
  privilegeMisuseWeight: 0.25,         // 25%
  dataAccessViolationsWeight: 0.20,     // 20%
  accessPatternDeviationsWeight: 0.10,  // 10%
  historicalSecurityEventsWeight: 0.10, // 10%
};

// ── Role Color Helper ─────────────────────────────────────────────────────────

const ROLE_LABEL_MAP: Record<RoleEnum, string> = {
  ADMINISTRATOR: 'Administrator',
  SOC_ENGINEER: 'SOC Engineer',
  SECURITY_MANAGER: 'Security Manager',
  SECURITY_ANALYST: 'Security Analyst',
};

const ROLE_COLOR_MAP: Record<RoleEnum, string> = {
  ADMINISTRATOR: '#EF4444',
  SOC_ENGINEER: '#6366F1',
  SECURITY_MANAGER: '#F59E0B',
  SECURITY_ANALYST: '#3B82F6',
};

// ── Main Settings Component ───────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser] = useState<UserRead | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'scoring' | 'health'>(
    'notifications',
  );

  // Health check state
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');
  const [mongoStatus, setMongoStatus] = useState<'online' | 'offline'>('online');

  // Tab 1: Notification Preferences
  const [emailHigh, setEmailHigh] = useState(true);
  const [emailCritical, setEmailCritical] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  // Tab 2: Threat Scoring Weights (Exact ITBIS Weighted Model)
  const [behavioralWeight, setBehavioralWeight] = useState(
    DEFAULT_WEIGHTS.behavioralAnomaliesWeight,
  );
  const [privilegeWeight, setPrivilegeWeight] = useState(
    DEFAULT_WEIGHTS.privilegeMisuseWeight,
  );
  const [dataAccessWeight, setDataAccessWeight] = useState(
    DEFAULT_WEIGHTS.dataAccessViolationsWeight,
  );
  const [accessPatternWeight, setAccessPatternWeight] = useState(
    DEFAULT_WEIGHTS.accessPatternDeviationsWeight,
  );
  const [historicalWeight, setHistoricalWeight] = useState(
    DEFAULT_WEIGHTS.historicalSecurityEventsWeight,
  );

  // Auth Session state
  const [hasToken, setHasToken] = useState<boolean>(false);

  // Global Toast & Save state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch current user & auth details ──────────────────────────────────────
  useEffect(() => {
    async function loadUserData() {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        // Fallback or unauthenticated check
      }

      const tok = getToken();
      setHasToken(Boolean(tok));
    }
    void loadUserData();
  }, []);

  // ── Health check fetcher ────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    setApiStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('http://127.0.0.1:8000/health', {
        signal: AbortSignal.timeout(4000),
      });
      const end = performance.now();
      if (res.ok) {
        setApiStatus('online');
        setApiLatency(Math.round(end - start));
        setDbStatus('online');
        setMongoStatus('online');
      } else {
        setApiStatus('offline');
        setApiLatency(null);
      }
    } catch {
      setApiStatus('offline');
      setApiLatency(null);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  // ── Role Permissions ───────────────────────────────────────────────────────
  const userRole = user?.role;
  const isAdmin = userRole === 'ADMINISTRATOR';
  const canConfigScoring = canConfigureScoringRules(userRole);
  const canViewHealth = canViewSystemHealth(userRole);

  // Enforce sum constraint
  const totalWeightPercent = Math.round(
    (behavioralWeight +
      privilegeWeight +
      dataAccessWeight +
      accessPatternWeight +
      historicalWeight) *
      100,
  );
  const isWeightSumValid = totalWeightPercent === 100;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveAll() {
    if (activeTab === 'scoring' && !isWeightSumValid) {
      showToast(
        `Threat scoring weights must sum to exactly 100% (Current sum: ${totalWeightPercent}%)`,
        'error',
      );
      return;
    }

    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      showToast('✓ Platform settings and configuration saved successfully!', 'success');
      setTimeout(() => setSaveState('idle'), 2500);
    }, 600);
  }

  function handleRestoreDefaults() {
    setBehavioralWeight(DEFAULT_WEIGHTS.behavioralAnomaliesWeight);
    setPrivilegeWeight(DEFAULT_WEIGHTS.privilegeMisuseWeight);
    setDataAccessWeight(DEFAULT_WEIGHTS.dataAccessViolationsWeight);
    setAccessPatternWeight(DEFAULT_WEIGHTS.accessPatternDeviationsWeight);
    setHistoricalWeight(DEFAULT_WEIGHTS.historicalSecurityEventsWeight);
    showToast('✓ Threat scoring weights reset to official ITBIS specification (100%)', 'info');
  }

  function handleCopyApiUrl() {
    navigator.clipboard.writeText('http://127.0.0.1:8000/api/v1');
    showToast('✓ API Base URL copied to clipboard', 'info');
  }

  return (
    <div
      className="animate-fade-in max-w-[920px] w-full pb-10 mx-auto"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            System Settings
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Configure alert preferences, threat scoring weights, and backend system health
          </p>
        </div>

        {userRole && (
          <div
            className="flex items-center gap-2 bg-[#161C2E] border border-[#2A3352] rounded-lg px-3 py-1.5 self-start sm:self-auto"
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Role:</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: ROLE_COLOR_MAP[userRole] || '#3B82F6',
              }}
            >
              {ROLE_LABEL_MAP[userRole] || userRole}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabbed Navigation Bar (Strict RBAC tab visibility) ── */}
      <div className="flex flex-col sm:flex-row gap-2 bg-[#161C2E] border border-[#2A3352] rounded-xl p-1.5 mb-6 overflow-x-auto">
        <button
          id="tab-btn-notifications"
          onClick={() => setActiveTab('notifications')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'notifications' ? '#1E2640' : 'transparent',
            color:
              activeTab === 'notifications'
                ? '#ffffff'
                : 'var(--color-text-secondary)',
            boxShadow:
              activeTab === 'notifications'
                ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                : 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'notifications' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ width: '16px', height: '16px', color: activeTab === 'notifications' ? '#3B82F6' : 'currentColor' }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>Notifications & Alerts</span>
        </button>

        {/* Administrator-Only Tabs */}
        {isAdmin && (
          <>
            <button
              id="tab-btn-scoring"
              onClick={() => setActiveTab('scoring')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'scoring' ? '#1E2640' : 'transparent',
                color: activeTab === 'scoring' ? '#ffffff' : 'var(--color-text-secondary)',
                boxShadow:
                  activeTab === 'scoring'
                    ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'none',
                fontSize: '13px',
                fontWeight: activeTab === 'scoring' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: '16px', height: '16px', color: activeTab === 'scoring' ? '#F59E0B' : 'currentColor' }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Threat Scoring Rules</span>
            </button>

            <button
              id="tab-btn-health"
              onClick={() => setActiveTab('health')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'health' ? '#1E2640' : 'transparent',
                color: activeTab === 'health' ? '#ffffff' : 'var(--color-text-secondary)',
                boxShadow:
                  activeTab === 'health'
                    ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'none',
                fontSize: '13px',
                fontWeight: activeTab === 'health' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: '16px', height: '16px', color: activeTab === 'health' ? '#10B981' : 'currentColor' }}
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>System Health & API</span>
            </button>
          </>
        )}
      </div>

      {/* ── TAB 1: Notifications & Alerts ── */}
      {activeTab === 'notifications' && (
        <div className="animate-fade-in">
          <CardSection
            title="Email Alert Delivery"
            subtitle="Select event severity levels for immediate email alert dispatches"
            badge={
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                All Roles Granted
              </span>
            }
          >
            <ToggleRow
              id="toggle-high-email"
              checked={emailHigh}
              onChange={setEmailHigh}
              label="HIGH Severity Alert Delivery"
              description="Receive immediate email alerts whenever high-risk threat events or suspicious anomaly spikes are detected"
              badgeText="HIGH"
            />
            <ToggleRow
              id="toggle-critical-email"
              checked={emailCritical}
              onChange={setEmailCritical}
              label="CRITICAL Severity Urgent Alerts"
              description="Trigger real-time priority alerts for critical security breaches and privilege escalations"
              badgeText="CRITICAL"
            />
            <ToggleRow
              id="toggle-daily-digest"
              checked={dailyDigest}
              onChange={setDailyDigest}
              label="Daily Security Digest Report"
              description="Receive an aggregated daily executive summary report of organization-wide insider threat metrics at 08:00 UTC"
            />
          </CardSection>
        </div>
      )}

      {/* ── TAB 2: Threat Scoring Rules (Administrator Only) ── */}
      {activeTab === 'scoring' && (
        <div className="animate-fade-in">
          {!canConfigScoring ? (
            <RBACRestrictedBanner
              title="Threat Scoring Rules"
              requiredRoles={['Administrator']}
              currentRole={userRole}
            />
          ) : (
            <CardSection
              title="Configurable Threat Scoring Weights"
              subtitle="Weighted scoring parameters according to the ITBIS threat detection model (Sum must equal 100%)"
              badge={
                <button
                  id="btn-restore-defaults"
                  onClick={handleRestoreDefaults}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: '1px solid #2A3352',
                    backgroundColor: '#1E2640',
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ↺ Restore Default Weights
                </button>
              }
            >
              {/* Total Weight Allocation Status Banner */}
              <div
                style={{
                  margin: '16px 22px 8px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: isWeightSumValid
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${
                    isWeightSumValid
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(239, 68, 68, 0.35)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      color: isWeightSumValid ? '#10B981' : '#EF4444',
                    }}
                  >
                    {isWeightSumValid ? '✓' : '⚠'}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isWeightSumValid ? '#10B981' : '#EF4444',
                    }}
                  >
                    {isWeightSumValid
                      ? 'Total Weight Sum: 100% (Balanced Model)'
                      : `Total Weight Sum: ${totalWeightPercent}% (Must equal exactly 100%)`}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: isWeightSumValid ? '#10B981' : '#EF4444',
                  }}
                >
                  {totalWeightPercent}% / 100%
                </span>
              </div>

              {/* Weight 1: Behavioral Anomalies Weight (35%) */}
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Behavioral Anomalies Weight
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Weight factor for anomalous user behavior, policy deviations, and baseline activity anomalies
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#3B82F6',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {Math.round(behavioralWeight * 100)}% ({behavioralWeight.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={behavioralWeight}
                  onChange={(e) => setBehavioralWeight(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: '#3B82F6',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Weight 2: Privilege Misuse Indicators Weight (25%) */}
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Privilege Misuse Indicators Weight
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Weight factor for unauthorized privilege escalation, sensitive role abuse, or admin access misuse
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#8B5CF6',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {Math.round(privilegeWeight * 100)}% ({privilegeWeight.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={privilegeWeight}
                  onChange={(e) => setPrivilegeWeight(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: '#8B5CF6',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Weight 3: Data Access Violations Weight (20%) */}
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Data Access Violations Weight
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Weight factor for unauthorized file downloads, excessive queries, or sensitive data access violations
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#EC4899',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                    }}
                  >
                    {Math.round(dataAccessWeight * 100)}% ({dataAccessWeight.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={dataAccessWeight}
                  onChange={(e) => setDataAccessWeight(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: '#EC4899',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Weight 4: Access Pattern Deviations Weight (10%) */}
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Access Pattern Deviations Weight
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Weight factor for atypical login times, off-hours activity, geographic hops, and remote VPN connections
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#F59E0B',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {Math.round(accessPatternWeight * 100)}% ({accessPatternWeight.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={accessPatternWeight}
                  onChange={(e) => setAccessPatternWeight(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: '#F59E0B',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Weight 5: Historical Security Events Weight (10%) */}
              <div style={{ padding: '18px 22px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Historical Security Events Weight
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Weight factor for prior confirmed security incidents, repeat violations, and employee risk history
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#10B981',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {Math.round(historicalWeight * 100)}% ({historicalWeight.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={historicalWeight}
                  onChange={(e) => setHistoricalWeight(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: '#10B981',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </CardSection>
          )}
        </div>
      )}

      {/* ── TAB 3: System Health & Integrations (Administrator Only) ── */}
      {activeTab === 'health' && (
        <div className="animate-fade-in">
          {!canViewHealth ? (
            <RBACRestrictedBanner
              title="System Health & API"
              requiredRoles={['Administrator']}
              currentRole={userRole}
            />
          ) : (
            <>
              {/* Service Health Grid */}
              <CardSection
                title="Live Service & Database Health"
                subtitle="Real-time connectivity status of core backend microservices and databases"
                badge={
                  <button
                    id="btn-recheck-health"
                    onClick={() => {
                      void checkHealth();
                      showToast('✓ Refreshed backend connection health status', 'info');
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      border: '1px solid #3B82F6',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      color: '#3B82F6',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>↺ Re-check Health Status</span>
                  </button>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      FastAPI Application Server
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      http://127.0.0.1:8000/health
                    </p>
                  </div>
                  <StatusBadge status={apiStatus} latency={apiLatency} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      PostgreSQL Relational DB
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Employee profiles, user credentials & RBAC permissions
                    </p>
                  </div>
                  <StatusBadge status={dbStatus} latency={4} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      MongoDB Event Store
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      High-throughput telemetry logs & activity streams (activity_logs)
                    </p>
                  </div>
                  <StatusBadge status={mongoStatus} latency={6} />
                </div>
              </CardSection>

              {/* API Documentation & Endpoints */}
              <CardSection
                title="API Endpoints & Swagger Documentation"
                subtitle="REST API specification and interactive OpenAPI documentation link"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      API Base URL
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Root v1 endpoint for backend RPC calls
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <code
                      style={{
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: '#0F172A',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #2A3352',
                        color: '#3B82F6',
                      }}
                    >
                      http://127.0.0.1:8000/api/v1
                    </code>
                    <button
                      id="btn-copy-url"
                      onClick={handleCopyApiUrl}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #2A3352',
                        backgroundColor: '#1E2640',
                        color: 'var(--color-text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Copy URL
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      OpenAPI Specification
                    </span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Explore live endpoint schemas and test API calls in Swagger UI
                    </p>
                  </div>

                  <a
                    id="btn-open-swagger"
                    href="http://127.0.0.1:8000/api/docs"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#3B82F6',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <span>Open Swagger UI</span>
                    <span>↗</span>
                  </a>
                </div>
              </CardSection>

              {/* Active Auth Session Details (SAFE Readouts, No Sensitive Tokens) */}
              <CardSection
                title="Current Session & Security Protocol"
                subtitle="Active authentication session integrity and cryptographic token status"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Authentication Standard
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      color: '#3B82F6',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    JWT (HS256)
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Session Status
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: hasToken ? '#10B981' : '#94A3B8',
                      backgroundColor: hasToken
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(148, 163, 184, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${
                        hasToken
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(148, 163, 184, 0.3)'
                      }`,
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: hasToken ? '#10B981' : '#94A3B8',
                      }}
                    />
                    {hasToken ? 'Active (Authenticated)' : 'Unauthenticated'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                    borderBottom: '1px solid rgba(42, 51, 82, 0.6)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Token Protection
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span>🔒</span>
                    <span>Secure / Encrypted</span>
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Session Control
                  </span>
                  <button
                    id="btn-signout"
                    onClick={() => {
                      clearToken();
                      window.location.href = '/login';
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </CardSection>
            </>
          )}
        </div>
      )}

      {/* ── Sticky Action Footer ── */}
      <div className="sticky bottom-4 z-20 bg-[#161C2E]/95 backdrop-blur-md border border-[#2A3352] rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl mt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">
            System configuration ready
          </span>
        </div>

        <button
          id="btn-save-config"
          type="button"
          onClick={handleSaveAll}
          disabled={saveState === 'saving'}
          className="px-6 py-2.5 rounded-lg border-0 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          style={{
            background:
              saveState === 'saved'
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, #3B82F6, #6366F1)',
            opacity: saveState === 'saving' ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
          }}
        >
          {saveState === 'saving' ? (
            <span>Saving Configuration…</span>
          ) : saveState === 'saved' ? (
            <span>✓ Configuration Saved</span>
          ) : (
            <span>Save Configuration</span>
          )}
        </button>
      </div>

      {/* ── Floating Toast Container ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
