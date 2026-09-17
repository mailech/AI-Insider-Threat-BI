'use client';

import { useState } from 'react';
import type { RiskSummaryResponse } from '@/types/api';

interface RiskPostureDashboardProps {
  summary: RiskSummaryResponse | null;
  loading: boolean;
}

const WEIGHTS: Array<{ label: string; weight: string; color: string }> = [
  { label: 'Anomalies', weight: '35%', color: '#EF4444' },
  { label: 'Privilege', weight: '25%', color: '#F59E0B' },
  { label: 'Data Access', weight: '20%', color: '#3B82F6' },
  { label: 'Pattern Deviations', weight: '10%', color: '#6366F1' },
  { label: 'History', weight: '10%', color: '#10B981' },
];

const BAND_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#3B82F6',
  LOW: '#10B981',
};

function ScoringWeightsLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#2A3352] bg-[#0B0F19] px-2.5 py-1 text-[10px] text-[#94A3B8] transition-colors hover:border-[#3B82F6]/40 hover:text-[#E2E8F0] cursor-pointer"
        aria-expanded={open}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3 w-3">
          <circle cx={8} cy={8} r={6} />
          <path d="M8 7v4M8 5h.01" strokeLinecap="round" />
        </svg>
        Scoring weights
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-56 rounded-lg border border-[#2A3352] bg-[#161C2E] p-3 shadow-xl">
          <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            UEBA scoring model
          </p>
          <div className="flex flex-col gap-1.5">
            {WEIGHTS.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-[#E2E8F0]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <span className="font-mono text-[#94A3B8]">{item.weight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiskPostureDashboard({
  summary,
  loading,
}: RiskPostureDashboardProps) {
  const dist = summary?.risk_distribution ?? {};
  const depts = summary?.department_breakdown ?? [];
  const total = summary?.total_employees || 1;

  return (
    <section className="rounded-lg border border-[#2A3352] bg-[#161C2E] shadow-lg overflow-hidden">
      <div className="border-b border-[#2A3352] px-4 py-3">
        <h3 className="m-0 text-sm font-semibold tracking-tight text-[#E2E8F0]">
          Risk Posture
        </h3>
        <p className="mb-0 mt-1 text-[11px] text-[#94A3B8]">
          Fleet threat bands and department exposure across monitored identities
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#2A3352] bg-[#1E2640] p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Risk distribution
          </div>
          <div className="flex flex-col gap-2.5">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((band) => {
              const count = dist[band] ?? 0;
              const pct = Math.round((count / total) * 100);
              const color = BAND_COLORS[band];
              return (
                <div key={band} className="flex items-center gap-3 text-[11px]">
                  <span className="w-16 shrink-0 font-mono font-medium text-[#94A3B8]">{band}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0B0F19]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[#E2E8F0]">{count}</span>
                  <span className="w-8 shrink-0 text-right font-mono text-[#475569]">{pct}%</span>
                </div>
              );
            })}
          </div>
          {!loading && (
            <p className="mb-0 mt-3 text-[10px] text-[#475569]">
              Avg fleet threat score:{' '}
              <span className="font-mono text-[#E2E8F0]">{Math.round(summary?.average_threat_score ?? 0)}</span>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#2A3352] bg-[#1E2640] p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Department risk breakdown
          </div>
          <div className="max-h-44 overflow-auto pr-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-8 rounded" />
                ))}
              </div>
            ) : depts.length === 0 ? (
              <p className="m-0 text-[11px] text-[#475569]">No department data available.</p>
            ) : (
              depts.slice(0, 8).map((dept) => {
                const barPct = Math.min(100, Math.round(dept.avg_risk_score));
                return (
                  <div key={dept.department} className="mb-3 last:mb-0">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="truncate pr-2 text-[#E2E8F0]">{dept.department}</span>
                      <span className="shrink-0 font-mono text-[#94A3B8]">
                        {Math.round(dept.avg_risk_score)} · {dept.high_risk_count} high
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[#0B0F19]">
                      <div
                        className="h-full rounded-full bg-[#3B82F6]"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2A3352] bg-[#0B0F19]/50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {WEIGHTS.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 rounded-md border border-[#2A3352]/80 bg-[#161C2E] px-2 py-0.5 text-[10px] text-[#64748B]"
            >
              <span className="inline-block h-1 w-1 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <ScoringWeightsLegend />
      </div>
    </section>
  );
}
