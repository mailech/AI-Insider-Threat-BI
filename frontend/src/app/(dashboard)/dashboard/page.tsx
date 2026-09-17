'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmployeeRead, IncidentRead, RiskSummaryResponse, UserRead } from '@/types/api';
import { getAnalyticsSummary, getCurrentUser, listEmployees, listIncidents } from '@/services/api';
import ThreatOverviewCards from '@/components/dashboard/ThreatOverviewCards';
import HighRiskOutlierCards from '@/components/dashboard/HighRiskOutlierCards';
import TopRiskAttribution from '@/components/dashboard/TopRiskAttribution';
import NormalCohortTable from '@/components/dashboard/NormalCohortTable';
import BaselineModal from '@/components/dashboard/BaselineModal';
import { IncidentInvestigationDrawer } from '@/components/incidents/IncidentInvestigationDrawer';

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
  const [summary,          setSummary]          = useState<RiskSummaryResponse | null>(null);
  const [employees,        setEmployees]        = useState<EmployeeRead[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [lastFetch,        setLastFetch]        = useState<Date | null>(null);
  const [spinning,         setSpinning]         = useState(false);
  const [errorDismissed,   setErrorDismissed]   = useState(false);

  // Baseline inspection modal state
  const [inspectedEmployee, setInspectedEmployee] = useState<EmployeeRead | null>(null);
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [currentUser,       setCurrentUser]       = useState<UserRead | null>(null);
  const [drawerIncidentId,  setDrawerIncidentId]  = useState<number | null>(null);
  const [isDrawerOpen,      setIsDrawerOpen]      = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        getAnalyticsSummary(),
        listEmployees({ limit: 100 }),
      ]);
      setSummary(s);
      setEmployees(e);
      setLastFetch(new Date());
      setErrorDismissed(false);
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
    return () => window.removeEventListener('itbis:data-sync', handleSync);
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

  return (
    <div className="animate-fade-in w-full min-w-0 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Security Overview
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Real-time behavioral intelligence and immediate insider anomaly identification
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
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

      {/* ── 1. Top Metrics KPI Row ── */}
      <ThreatOverviewCards summary={summary} loading={loading} />

      {/* ── 2. Primary Section: Flagged Outliers (Immediate Attention Required) ── */}
      <div className="mt-6">
        <HighRiskOutlierCards
          employees={employees}
          loading={loading}
          onInspect={handleOpenInspect}
        />
      </div>

      {/* ── 3. Top Threat Attribution & Score Distribution Bands ── */}
      <TopRiskAttribution summary={summary} loading={loading} />

      {/* ── 4. Secondary Section: Normal Baseline Cohort (Collapsed Summary Table) ── */}
      <NormalCohortTable
        employees={employees}
        loading={loading}
        onInspect={handleOpenInspect}
      />

      {/* ── Baseline Inspection Modal (Fixed Viewport Centered) ── */}
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
