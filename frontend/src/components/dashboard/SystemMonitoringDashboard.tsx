'use client';

import type { SystemStatusResponse } from '@/types/api';

interface SystemMonitoringDashboardProps {
  status: SystemStatusResponse | null;
  loading: boolean;
  error: string | null;
}

function ServicePill({ label, state }: { label: string; state: string }) {
  const ok = state === 'online' || state === 'ready' || state === 'ok';
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#2A3352] bg-[#1E2640] px-3 py-2.5">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <span
        className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
        style={{
          color: ok ? '#10B981' : '#EF4444',
          backgroundColor: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}
      >
        {state}
      </span>
    </div>
  );
}

export default function SystemMonitoringDashboard({
  status,
  loading,
  error,
}: SystemMonitoringDashboardProps) {
  const services = status?.services;
  const counters = status?.counters;

  return (
    <section className="mb-6 rounded-lg border border-[#2A3352] bg-[#161C2E] p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-sm font-semibold tracking-tight text-[#E2E8F0]">
            Administrator — System Monitoring
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[#94A3B8]">
            FastAPI, PostgreSQL, MongoDB, Isolation Forest artifacts, and 24h ingest volume
          </p>
        </div>
        <span className="rounded-full border border-[#EF4444]/40 bg-[#EF4444]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#EF4444]">
          Admin view
        </span>
      </div>

      {error && (
        <p className="mb-3 text-xs text-[#EF4444]">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ServicePill label="API" state={loading ? 'checking' : (services?.api ?? 'unknown')} />
        <ServicePill label="PostgreSQL" state={loading ? 'checking' : (services?.postgres ?? 'unknown')} />
        <ServicePill label="MongoDB" state={loading ? 'checking' : (services?.mongodb ?? 'unknown')} />
        <ServicePill label="ML artifacts" state={loading ? 'checking' : (services?.ml_artifacts ?? 'unknown')} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Employees', value: counters?.employees },
          { label: 'Platform users', value: counters?.platform_users },
          { label: 'Logs (24h)', value: counters?.telemetry_events_24h },
          { label: 'Open incidents', value: counters?.open_incidents },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-[#2A3352] bg-[#0B0F19] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[#475569]">{card.label}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#E2E8F0]">
              {loading || card.value === undefined ? '—' : card.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
