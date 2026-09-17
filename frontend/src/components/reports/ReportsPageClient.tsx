'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ExecutiveReportSummary } from '@/types/api';
import { downloadReport, getExecutiveReport } from '@/services/api';

export function ReportsPageClient() {
  const [summary, setSummary] = useState<ExecutiveReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExecutiveReport();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load executive summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async (format: 'csv' | 'pdf'): Promise<void> => {
    setExporting(format);
    try {
      await downloadReport(format);
    } catch {
      setError(`Could not export ${format.toUpperCase()} report.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="animate-fade-in w-full min-w-0 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Reports & Export
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Executive threat briefing for security managers — CSV / PDF compliance export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport('csv')}
            disabled={exporting !== null}
            className="px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer disabled:opacity-50"
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('pdf')}
            disabled={exporting !== null}
            className="px-3.5 py-2 rounded-lg border-0 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366F1, #3B82F6)' }}
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading || !summary ? (
        <div className="skeleton h-40 rounded-lg" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Identities', value: String(summary.fleet.total_employees), color: '#6366F1' },
              { label: 'HIGH + CRITICAL', value: String(summary.fleet.high_risk_count), color: '#F59E0B' },
              { label: 'Open incidents', value: String(summary.incidents.open), color: '#EF4444' },
              { label: 'Avg threat score', value: String(summary.fleet.average_threat_score), color: '#3B82F6' },
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

          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)]">
              Top risk employees
            </div>
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">Employee</th>
                  <th className="text-left px-4 py-2">Department</th>
                  <th className="text-left px-4 py-2">Score</th>
                  <th className="text-left px-4 py-2">Band</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_risk_employees.map((row, index) => (
                  <tr
                    key={row.emp_id}
                    style={{ backgroundColor: index % 2 === 0 ? '#0B0F19' : '#161C2E' }}
                  >
                    <td className="px-4 py-2 text-[var(--color-text-primary)]">
                      {row.name}{' '}
                      <span className="font-mono text-[var(--color-accent-blue)]">{row.emp_id}</span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.department}</td>
                    <td className="px-4 py-2 font-mono">{row.threat_score}</td>
                    <td className="px-4 py-2 font-semibold">{row.risk_category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
