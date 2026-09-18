'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmployeeRead, IncidentRead, IncidentStatsResponse, LiveDashboardResponse, RiskSummaryResponse, SystemStatusResponse, UserRead } from '@/types/api';
import { getAnalyticsSummary, getCurrentUser, getIncidentStats, getLiveDashboard, getSystemStatus, listEmployees, listIncidents } from '@/services/api';
import ThreatOverviewCards from '@/components/dashboard/ThreatOverviewCards';
import LiveDashboardStrip from '@/components/dashboard/LiveDashboardStrip';
import HighRiskOutlierCards from '@/components/dashboard/HighRiskOutlierCards';
import TopRiskAttribution from '@/components/dashboard/TopRiskAttribution';
import NormalCohortTable from '@/components/dashboard/NormalCohortTable';
import BaselineModal from '@/components/dashboard/BaselineModal';
import RiskPostureDashboard from '@/components/dashboard/RiskPostureDashboard';
import SystemMonitoringDashboard from '@/components/dashboard/SystemMonitoringDashboard';
import LiveLogStreamTerminal from '@/components/dashboard/LiveLogStreamTerminal';
import { IncidentInvestigationDrawer } from '@/components/incidents/IncidentInvestigationDrawer';

type DashboardTab = 'executive' | 'risk' | 'system';

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'executive', label: 'Executive Overview' },
  { id: 'risk',      label: 'Risk Posture & UEBA' },
  { id: 'system',    label: 'System & Pipeline Health' },
];

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '14px', height: '14px' }}>
      <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const [activeTab,        setActiveTab]        = useState<DashboardTab>('executive');
  const [summary,          setSummary]          = useState<RiskSummaryResponse | null>(null);
  const [employees,        setEmployees]        = useState<EmployeeRead[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [lastFetch,        setLastFetch]        = useState<Date | null>(null);
  const [spinning,         setSpinning]         = useState(false);
  const [errorDismissed,   setErrorDismissed]   = useState(false);

  const [inspectedEmployee, setInspectedEmployee] = useState<EmployeeRead | null>(null);
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [currentUser,       setCurrentUser]       = useState<UserRead | null>(null);
  const [drawerIncidentId,  setDrawerIncidentId]  = useState<number | null>(null);
  const [isDrawerOpen,      setIsDrawerOpen]      = useState(false);
  const [incidentStats,     setIncidentStats]     = useState<IncidentStatsResponse | null>(null);
  const [systemStatus,      setSystemStatus]      = useState<SystemStatusResponse | null>(null);
  const [systemError,       setSystemError]       = useState<string | null>(null);
  const [live,              setLive]              = useState<LiveDashboardResponse | null>(null);

  const fetchData = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    setError(null);
    try {
      const [s, e, user, stats, liveSnap] = await Promise.all([
        getAnalyticsSummary(),
        listEmployees({ limit: 100 }),
        getCurrentUser(),
        getIncidentStats(),
        getLiveDashboard().catch(() => null),
      ]);
      setSummary(s);
      setEmployees(e);
      setCurrentUser(user);
      setIncidentStats(stats);
      setLive(liveSnap);
      setLastFetch(new Date());
      setErrorDismissed(false);
      if (user.role === 'ADMINISTRATOR' || user.role === 'SECURITY_MANAGER') {
        try {
          setSystemStatus(await getSystemStatus());
          setSystemError(null);
        } catch (sysErr: unknown) {
          const msg = sysErr instanceof Error ? sysErr.message : 'System status unavailable';
          setSystemError(msg);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      const isNetworkError = msg.toLowerCase().includes('network') || msg.toLowerCase().includes('econnrefused');
      setError(isNetworkError ? 'Unable to reach the backend server.' : msg);
      setErrorDismissed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const handleSync = () => { void fetchData(); };
    window.addEventListener('itbis:data-sync', handleSync);
    const timer = window.setInterval(() => {
      void fetchData({ quiet: true });
    }, 10000);
    return () => {
      window.removeEventListener('itbis:data-sync', handleSync);
      window.clearInterval(timer);
    };
  }, [fetchData]);

  async function handleRefresh() {
    setSpinning(true);
    await fetchData();
    setTimeout(() => setSpinning(false), 600);
  }

  async function handleOpenInspect(emp: EmployeeRead): Promise<void> {
    setInspectedEmployee(emp);
    setIsModalOpen(true);
    try {
      if (!currentUser) {
        const user = await getCurrentUser();
        setCurrentUser(user);
      }
      const incidents = await listIncidents({ emp_id: emp.emp_id, limit: 5 });
      const openCase: IncidentRead | undefined = incidents.items.find(
        (item) => item.status === 'NEW' || item.status === 'UNDER_INVESTIGATION',
      ) ?? incidents.items[0];
      if (openCase) {
        setDrawerIncidentId(openCase.id);
        setIsDrawerOpen(true);
      }
    } catch {
      /* baseline modal still opens */
    }
  }

  function handleCloseInspect() {
    setIsModalOpen(false);
    setInspectedEmployee(null);
  }

  const canViewSystem =
    currentUser?.role === 'ADMINISTRATOR' || currentUser?.role === 'SECURITY_MANAGER';

  return (
    <div className="animate-fade-in w-full min-w-0 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
              SOC Executive Overview
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
              Unified threat intelligence, UEBA risk posture, and pipeline health
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start xl:self-auto">
            {canViewSystem && (
              <SystemMonitoringDashboard
                status={systemStatus}
                loading={loading}
                error={systemError}
                variant="compact"
              />
            )}
            {lastFetch && (
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                Updated {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              id="refresh-dashboard"
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span style={{ display: 'inline-block', animation: spinning ? 'spin 0.6s linear 1' : 'none' }}>
                <RefreshIcon />
              </span>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Unified KPI Bar (always visible) ── */}
        <ThreatOverviewCards
          summary={summary}
          incidentStats={incidentStats}
          systemStatus={systemStatus}
          systemError={systemError}
          loading={loading}
        />
      </div>

      {/* ── Error Banner ── */}
      {error && !errorDismissed && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs sm:text-sm flex items-center gap-2">
          <span>⚠</span>
          <span className="flex-1">
            {error} — Ensure the backend is running at http://127.0.0.1:8000 and you are logged in.
          </span>
          <button
            onClick={() => setErrorDismissed(true)}
            aria-label="Dismiss error"
            className="bg-transparent border-0 text-red-400 cursor-pointer p-1 rounded hover:bg-red-500/20 text-base leading-none shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="mb-5 border-b border-[#2A3352]">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#3B82F6] text-[#E2E8F0]'
                    : 'border-transparent text-[#64748B] hover:text-[#94A3B8] hover:border-[#2A3352]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Panels ── */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <LiveLogStreamTerminal />
          <HighRiskOutlierCards
            employees={employees}
            loading={loading}
            onInspect={handleOpenInspect}
          />
          <TopRiskAttribution summary={summary} loading={loading} />
          <NormalCohortTable
            employees={employees}
            loading={loading}
            onInspect={handleOpenInspect}
          />
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-5">
          <RiskPostureDashboard summary={summary} loading={loading} />
          <LiveDashboardStrip live={live} loading={loading && live === null} />
        </div>
      )}

      {activeTab === 'system' && (
        <div>
          {canViewSystem ? (
            <SystemMonitoringDashboard
              status={systemStatus}
              loading={loading}
              error={systemError}
              variant="full"
            />
          ) : (
            <div className="rounded-lg border border-[#2A3352] bg-[#161C2E] p-6 text-center">
              <p className="m-0 text-sm text-[#94A3B8]">
                System monitoring requires Security Manager or Administrator access.
              </p>
            </div>
          )}
        </div>
      )}

      <BaselineModal
        employee={inspectedEmployee}
        isOpen={isModalOpen}
        onClose={handleCloseInspect}
      />
      <IncidentInvestigationDrawer
        incidentId={drawerIncidentId}
        isOpen={isDrawerOpen}
        currentUser={currentUser}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerIncidentId(null);
        }}
      />
    </div>
  );
}
