'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ExecutiveReportSummary } from '@/types/api';
import { downloadReport, getCurrentUser, getExecutiveReport, type ReportExportFormat, type ReportExportType } from '@/services/api';
import { hasPermission } from '@/lib/rbac';
import type { UserRead } from '@/types/api';

function compliancePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function ReportsPageClient() {
  const [summary, setSummary] = useState<ExecutiveReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportExportType>('executive');
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getExecutiveReport();
      setSummary(data);
      const user = await getCurrentUser().catch(() => null);
      setCurrentUser(user);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canExport = hasPermission(currentUser?.role, 'export:reports');

  const handleExport = async (format: ReportExportFormat): Promise<void> => {
    setExporting(format);
    setExportNotice(null);
    try {
      await downloadReport(format, reportType);
    } catch {
      setExportNotice(`Could not export ${format.toUpperCase()} ${reportType} report.`);
    } finally {
      setExporting(null);
    }
  };

  const departments = summary?.department_risk_breakdown ?? [];
  const auditEvents = summary?.recent_audit_events ?? [];

  return (
    <div className="animate-fade-in w-full min-w-0 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Reports & Export
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Export incident and anomaly briefings as PDF or Excel for SOC managers
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportExportType)}
            className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-semibold text-[var(--color-text-primary)]"
          >
            <option value="executive">Executive</option>
            <option value="incidents">Incidents</option>
            <option value="anomalies">Anomalies</option>
          </select>
          <button
            type="button"
            onClick={() => void handleExport('csv')}
            disabled={!canExport || exporting !== null || loading}
            className="px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer disabled:opacity-50"
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('xlsx')}
            disabled={!canExport || exporting !== null || loading}
            className="px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer disabled:opacity-50"
          >
            {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('pdf')}
            disabled={!canExport || exporting !== null || loading}
            className="px-3.5 py-2 rounded-lg border-0 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366F1, #3B82F6)' }}
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="mb-4 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-secondary)]">
          {exportNotice}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] py-16">
          <svg
            className="animate-spin text-[var(--color-accent-blue)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
            style={{ width: '28px', height: '28px' }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <p className="text-sm text-[var(--color-text-secondary)] m-0">Loading executive briefing…</p>
        </div>
      ) : !summary ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-6 py-12 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
            No briefing data available
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-4">
            The executive summary could not be loaded. Retry when the reporting service is reachable.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total incidents', value: String(summary.total_incidents), color: '#EF4444' },
              { label: 'High-risk users', value: String(summary.high_risk_users), color: '#F59E0B' },
              {
                label: 'Compliance score',
                value: compliancePercent(summary.compliance_score),
                color: '#10B981',
              },
              {
                label: 'Departments',
                value: String(departments.length),
                color: '#3B82F6',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] m-0">
                  {card.label}
                </p>
                <p className="text-2xl font-extrabold font-mono m-0 mt-2" style={{ color: card.color }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)]">
                Department risk breakdown
              </div>
              {departments.length === 0 ? (
                <p className="px-4 py-8 text-xs text-[var(--color-text-muted)] m-0 text-center">
                  No department risk data yet.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-2">Department</th>
                      <th className="text-left px-4 py-2">Identities</th>
                      <th className="text-left px-4 py-2">High risk</th>
                      <th className="text-left px-4 py-2">Avg score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((row, index) => (
                      <tr
                        key={row.department}
                        style={{ backgroundColor: index % 2 === 0 ? '#0B0F19' : '#161C2E' }}
                      >
                        <td className="px-4 py-2 text-[var(--color-text-primary)]">{row.department}</td>
                        <td className="px-4 py-2 font-mono">{row.employee_count}</td>
                        <td className="px-4 py-2 font-mono text-[var(--color-warning)]">
                          {row.high_risk_users}
                        </td>
                        <td className="px-4 py-2 font-mono">
                          {Math.round(row.avg_risk_score * 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)]">
                Recent audit events
              </div>
              {auditEvents.length === 0 ? (
                <p className="px-4 py-8 text-xs text-[var(--color-text-muted)] m-0 text-center">
                  No recent audit events.
                </p>
              ) : (
                <ul className="m-0 p-0 list-none max-h-80 overflow-y-auto">
                  {auditEvents.map((event, index) => (
                    <li
                      key={`${event.event_type}-${event.id}-${index}`}
                      className="px-4 py-2.5 border-b border-[var(--color-border-subtle)] last:border-b-0"
                      style={{ backgroundColor: index % 2 === 0 ? '#0B0F19' : '#161C2E' }}
                    >
                      <p className="m-0 text-xs text-[var(--color-text-primary)]">{event.summary}</p>
                      <p className="m-0 mt-1 text-[10px] font-mono text-[var(--color-text-muted)]">
                        {event.event_type}
                        {event.actor ? ` · ${event.actor}` : ''}
                        {event.occurred_at ? ` · ${event.occurred_at}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
