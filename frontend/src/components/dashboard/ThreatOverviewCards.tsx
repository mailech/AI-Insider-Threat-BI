'use client';

import type { IncidentStatsResponse, RiskSummaryResponse, SystemStatusResponse } from '@/types/api';

interface CardConfig {
  title:       string;
  value:       number | string;
  subtitle:    string;
  accentColor: string;
  bgGlow:      string;
  icon:        React.ReactNode;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="m10.29 3.86-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-2.14l-7-12a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={12} y1={9} x2={12} y2={13} strokeLinecap="round" />
      <circle cx={12} cy={17} r={0.5} fill="currentColor" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx={8} cy={8} r={3.5} />
      <path d="M2 20c0-4 2.7-6 6-6s6 2 6 6" strokeLinecap="round" />
      <circle cx={17} cy={8} r={2.5} />
      <path d="M15 20c0-2.5 1.3-4 4-4" strokeLinecap="round" />
    </svg>
  );
}

function IncidentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={9} y={3} width={6} height={4} rx={1} />
      <line x1={9} y1={12} x2={15} y2={12} strokeLinecap="round" />
      <line x1={9} y1={16} x2={13} y2={16} strokeLinecap="round" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isServiceHealthy(state: string): boolean {
  return state === 'online' || state === 'ready' || state === 'ok';
}

export function aggregateSystemHealth(
  status: SystemStatusResponse | null,
  error: string | null,
): { label: string; healthy: boolean; detail: string } {
  if (error) {
    return { label: 'Degraded', healthy: false, detail: 'Status check failed' };
  }
  if (!status?.services) {
    return { label: 'Checking', healthy: true, detail: 'Awaiting probe' };
  }
  const services = Object.values(status.services);
  const onlineCount = services.filter(isServiceHealthy).length;
  const total = services.length;
  if (onlineCount === total) {
    return { label: 'Online', healthy: true, detail: `${total}/${total} services healthy` };
  }
  return {
    label: 'Degraded',
    healthy: false,
    detail: `${onlineCount}/${total} services healthy`,
  };
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ config, loading }: { config: CardConfig; loading: boolean }) {
  return (
    <div
      className="bg-[#161C2E] border border-[#2A3352] rounded-xl p-4 min-h-[108px] flex flex-col justify-between gap-2 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
      style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none blur-2xl opacity-40"
        style={{ background: config.bgGlow }}
      />

      <div className="flex items-center gap-2.5 z-10 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${config.accentColor}18`,
            borderColor: `${config.accentColor}33`,
            color: config.accentColor,
          }}
        >
          {config.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] m-0 truncate">
            {config.title}
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)] m-0 mt-0.5 truncate">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="z-10">
        {loading ? (
          <div className="skeleton h-8 w-16 rounded" />
        ) : (
          <div
            className="text-2xl font-bold font-mono leading-none tracking-tight"
            style={{ color: config.accentColor }}
          >
            {config.value}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ThreatOverviewCardsProps {
  summary:       RiskSummaryResponse | null;
  incidentStats: IncidentStatsResponse | null;
  systemStatus:  SystemStatusResponse | null;
  systemError:   string | null;
  loading:       boolean;
}

export default function ThreatOverviewCards({
  summary,
  incidentStats,
  systemStatus,
  systemError,
  loading,
}: ThreatOverviewCardsProps) {
  const health = aggregateSystemHealth(systemStatus, systemError);
  const criticalCount = summary?.critical_count ?? 0;
  const highRiskCount = summary?.high_risk_count ?? 0;

  const cards: CardConfig[] = [
    {
      title:       'Active High-Risk Alerts',
      value:       highRiskCount,
      subtitle:    `${criticalCount} critical · HIGH + CRITICAL tier`,
      accentColor: '#EF4444',
      bgGlow:      'rgba(239,68,68,0.25)',
      icon:        <AlertIcon />,
    },
    {
      title:       'Total Monitored Identities',
      value:       summary?.total_employees ?? 0,
      subtitle:    'Active employee baselines',
      accentColor: '#3B82F6',
      bgGlow:      'rgba(59,130,246,0.25)',
      icon:        <PeopleIcon />,
    },
    {
      title:       'Open Incidents',
      value:       incidentStats?.open ?? 0,
      subtitle:    `${incidentStats?.new ?? 0} new · ${incidentStats?.under_investigation ?? 0} investigating`,
      accentColor: '#F59E0B',
      bgGlow:      'rgba(245,158,11,0.25)',
      icon:        <IncidentIcon />,
    },
    {
      title:       'System Health Status',
      value:       health.label,
      subtitle:    health.detail,
      accentColor: health.healthy ? '#10B981' : '#EF4444',
      bgGlow:      health.healthy ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
      icon:        <HealthIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((card) => (
        <MetricCard key={card.title} config={card} loading={loading} />
      ))}
    </div>
  );
}
