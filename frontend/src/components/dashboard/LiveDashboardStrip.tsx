'use client';

import type { LiveDashboardResponse } from '@/types/api';

interface LiveDashboardStripProps {
  live: LiveDashboardResponse | null;
  loading: boolean;
}

export default function LiveDashboardStrip({ live, loading }: LiveDashboardStripProps) {
  const thresholds = live?.risk_thresholds;
  return (
    <section className="mb-5 rounded-lg border border-[#2A3352] bg-[#161C2E] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-sm font-semibold tracking-tight text-[#E2E8F0]">
            Live telemetry & UEBA
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[#94A3B8]">
            Host activity, anomaly scores, and published risk thresholds refresh automatically.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#10B981]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Events (5m)', value: loading ? '—' : String(live?.telemetry_events_last_5m ?? 0) },
          { label: 'Events (1h)', value: loading ? '—' : String(live?.telemetry_events_last_1h ?? 0) },
          { label: 'Avg threat', value: loading ? '—' : String(Math.round(live?.average_threat_score ?? 0)) },
          {
            label: 'UEBA anomaly',
            value: loading
              ? '—'
              : live?.average_anomaly_score != null
                ? live.average_anomaly_score.toFixed(1)
                : 'n/a',
          },
          { label: 'New alerts', value: loading ? '—' : String(live?.new_alerts ?? 0) },
          { label: 'In progress', value: loading ? '—' : String(live?.in_progress ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-[#2A3352] bg-[#1E2640] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[#475569]">{card.label}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#E2E8F0]">{card.value}</div>
          </div>
        ))}
      </div>
      {thresholds && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#94A3B8]">
          <span className="rounded-md border border-[#2A3352] bg-[#0B0F19] px-2 py-1">
            LOW ≤ {thresholds.low_max}
          </span>
          <span className="rounded-md border border-[#2A3352] bg-[#0B0F19] px-2 py-1">
            MEDIUM ≤ {thresholds.medium_max}
          </span>
          <span className="rounded-md border border-[#2A3352] bg-[#0B0F19] px-2 py-1">
            HIGH ≤ {thresholds.high_max}
          </span>
          <span className="rounded-md border border-[#2A3352] bg-[#0B0F19] px-2 py-1 text-[#EF4444]">
            CRITICAL ≥ {thresholds.critical_min}
          </span>
          <span className="rounded-md border border-[#F59E0B]/30 bg-[#0B0F19] px-2 py-1 text-[#F59E0B]">
            Auto-incident &gt; {thresholds.incident_auto_trigger}
          </span>
        </div>
      )}
    </section>
  );
}
