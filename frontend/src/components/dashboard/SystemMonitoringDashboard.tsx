'use client';

import type { SystemStatusResponse } from '@/types/api';
import { aggregateSystemHealth } from '@/components/dashboard/ThreatOverviewCards';

interface SystemMonitoringDashboardProps {
  status: SystemStatusResponse | null;
  loading: boolean;
  error: string | null;
  variant?: 'compact' | 'full';
}

function isServiceHealthy(state: string): boolean {
  return state === 'online' || state === 'ready' || state === 'ok';
}

function ServiceDot({ label, state }: { label: string; state: string }) {
  const ok = isServiceHealthy(state);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-[#2A3352] bg-[#0B0F19]/80 px-2 py-1 text-[10px] text-[#94A3B8]"
      title={`${label}: ${state}`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: ok ? '#10B981' : '#EF4444' }}
      />
      <span className="font-medium text-[#E2E8F0]">{label}</span>
    </span>
  );
}

function ServicePill({ label, state }: { label: string; state: string }) {
  const ok = isServiceHealthy(state);
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
  variant = 'full',
}: SystemMonitoringDashboardProps) {
  const services = status?.services;
  const counters = status?.counters;
  const health = aggregateSystemHealth(status, error);

  if (variant === 'compact') {
    return (
      <div
        className="hidden lg:flex items-center gap-2 rounded-lg border border-[#2A3352] bg-[#161C2E]/90 px-2.5 py-1.5"
        title={health.detail}
      >
        <span className="inline-flex items-center gap-1.5 pr-2 border-r border-[#2A3352]">
          <span
            className={`h-2 w-2 rounded-full ${health.healthy ? 'bg-[#10B981] animate-pulse' : 'bg-[#EF4444]'}`}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: health.healthy ? '#10B981' : '#EF4444' }}
          >
            {loading ? 'Checking' : health.label}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <ServiceDot label="API" state={loading ? 'checking' : (services?.api ?? 'unknown')} />
          <ServiceDot label="PG" state={loading ? 'checking' : (services?.postgres ?? 'unknown')} />
          <ServiceDot label="Mongo" state={loading ? 'checking' : (services?.mongodb ?? 'unknown')} />
          <ServiceDot label="ML" state={loading ? 'checking' : (services?.ml_artifacts ?? 'unknown')} />
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[#2A3352] bg-[#161C2E] p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-sm font-semibold tracking-tight text-[#E2E8F0]">
            System &amp; Pipeline Health
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[#94A3B8]">
            Service probes, ingest volume, and ML artifact readiness
          </p>
        </div>
        <span
          className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            color: health.healthy ? '#10B981' : '#EF4444',
            borderColor: health.healthy ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
            backgroundColor: health.healthy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          }}
        >
          {loading ? 'Checking' : health.label}
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
