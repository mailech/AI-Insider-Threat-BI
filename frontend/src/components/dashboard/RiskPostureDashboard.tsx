'use client';

import type { IncidentStatsResponse, RiskSummaryResponse } from '@/types/api';

interface RiskPostureDashboardProps {
  summary: RiskSummaryResponse | null;
  incidentStats: IncidentStatsResponse | null;
  loading: boolean;
}

const WEIGHTS: Array<{ label: string; weight: string; color: string }> = [
  { label: 'Anomalies', weight: '35%', color: '#EF4444' },
  { label: 'Privilege', weight: '25%', color: '#F59E0B' },
  { label: 'Data Access', weight: '20%', color: '#3B82F6' },
  { label: 'Pattern Deviations', weight: '10%', color: '#6366F1' },
  { label: 'History', weight: '10%', color: '#10B981' },
];

export default function RiskPostureDashboard({
  summary,
  incidentStats,
  loading,
}: RiskPostureDashboardProps) {
  const dist = summary?.risk_distribution ?? {};
  const depts = summary?.department_breakdown ?? [];

  return (
    <section className="mb-6 rounded-lg border border-[#2A3352] bg-[#161C2E] p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-sm font-semibold tracking-tight text-[#E2E8F0]">
            Security Manager — Risk Posture
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[#94A3B8]">
            Fleet threat bands, department exposure, and weighted scoring model (0.35 / 0.25 / 0.20 / 0.10 / 0.10)
          </p>
        </div>
        <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F59E0B]">
          Manager view
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Avg threat', value: loading ? '—' : `${Math.round(summary?.average_threat_score ?? 0)}` },
          { label: 'High + Critical', value: loading ? '—' : String(summary?.high_risk_count ?? 0) },
          { label: 'Open incidents', value: loading ? '—' : String(incidentStats?.open ?? 0) },
          { label: 'New alerts', value: loading ? '—' : String(incidentStats?.new ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-[#2A3352] bg-[#1E2640] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[#475569]">{card.label}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#E2E8F0]">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-medium text-[#94A3B8]">Risk distribution</div>
          <div className="flex flex-col gap-1.5">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((band) => {
              const count = dist[band] ?? 0;
              const total = summary?.total_employees || 1;
              const pct = Math.round((count / total) * 100);
              const color =
                band === 'CRITICAL' ? '#EF4444' : band === 'HIGH' ? '#F59E0B' : band === 'MEDIUM' ? '#3B82F6' : '#10B981';
              return (
                <div key={band} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 font-mono text-[#94A3B8]">{band}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0B0F19]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[#E2E8F0]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-medium text-[#94A3B8]">Scoring weights</div>
          <div className="flex flex-wrap gap-2">
            {WEIGHTS.map((item) => (
              <span
                key={item.label}
                className="rounded-md border border-[#2A3352] bg-[#0B0F19] px-2 py-1 text-[11px] text-[#E2E8F0]"
              >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label} {item.weight}
              </span>
            ))}
          </div>
          <div className="mt-3 max-h-32 overflow-auto">
            {depts.slice(0, 6).map((dept) => (
              <div key={dept.department} className="flex items-center justify-between py-1 text-[11px]">
                <span className="text-[#94A3B8]">{dept.department}</span>
                <span className="font-mono text-[#E2E8F0]">
                  {Math.round(dept.avg_risk_score)} · {dept.high_risk_count} high-risk
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
