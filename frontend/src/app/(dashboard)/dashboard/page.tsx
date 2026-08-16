'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RiskSummaryResponse, EmployeeRead } from '@/types/api';
import { getAnalyticsSummary, listEmployees } from '@/services/api';
import ThreatOverviewCards from '@/components/dashboard/ThreatOverviewCards';
import RecentAlertsTable   from '@/components/dashboard/RecentAlertsTable';
import RiskScoreGauge      from '@/components/dashboard/RiskScoreGauge';

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
  const [summary,   setSummary]   = useState<RiskSummaryResponse | null>(null);
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [spinning,  setSpinning]  = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        getAnalyticsSummary(),
        listEmployees({ limit: 50 }),
      ]);
      setSummary(s);
      setEmployees(e);
      setLastFetch(new Date());
      setErrorDismissed(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      // Suppress raw "Network Error" — show a friendlier message
      const isNetworkError = msg.toLowerCase().includes('network') || msg.toLowerCase().includes('econnrefused');
      setError(isNetworkError ? 'Unable to reach the backend server.' : msg);
      setErrorDismissed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleRefresh() {
    setSpinning(true);
    await fetchData();
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <div className="animate-fade-in max-w-[1400px] w-full mx-auto">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Security Overview
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Real-time insider threat posture across all monitored employees
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastFetch && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
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

      {/* ── Error banner ── */}
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

      {/* ── Row 1: Metric cards ── */}
      <ThreatOverviewCards summary={summary} loading={loading} />

      {/* ── Row 2: Gauge + quick stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 my-4">
        {/* Gauge */}
        <RiskScoreGauge
          score={summary?.average_threat_score ?? 0}
          loading={loading}
        />

        {/* Quick stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Avg Threat Score',   value: loading ? '—' : `${summary?.average_threat_score ?? 0}`,  unit: '/100', color: '#3B82F6' },
            { label: 'Critical Rate',       value: loading ? '—' : summary && summary.total_employees > 0 ? `${((summary.critical_count / summary.total_employees) * 100).toFixed(1)}` : '0', unit: '%', color: '#EF4444' },
            { label: 'High Risk Rate',      value: loading ? '—' : summary && summary.total_employees > 0 ? `${((summary.high_risk_count / summary.total_employees) * 100).toFixed(1)}` : '0', unit: '%', color: '#F59E0B' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#161C2E] border border-[#2A3352] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-2 min-h-[105px] shadow-sm"
            >
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold tracking-wider uppercase m-0">
                {stat.label}
              </p>
              {loading ? (
                <div className="skeleton h-8 w-20 rounded" />
              ) : (
                <p className="m-0 text-2xl sm:text-3xl font-bold font-mono leading-tight tracking-tight" style={{ color: stat.color }}>
                  {stat.value}
                  <span className="text-xs text-[var(--color-text-muted)] ml-1 font-sans font-normal">{stat.unit}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Alerts table ── */}
      <RecentAlertsTable employees={employees} loading={loading} />
    </div>
  );
}
