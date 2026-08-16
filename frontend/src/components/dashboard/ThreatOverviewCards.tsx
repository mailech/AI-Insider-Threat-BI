'use client';

import type { RiskSummaryResponse } from '@/types/api';

interface CardConfig {
  title:       string;
  value:       number | string;
  subtitle:    string;
  accentColor: string;
  bgGlow:      string;
  icon:        React.ReactNode;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="m10.29 3.86-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-2.14l-7-12a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={12} y1={9} x2={12} y2={13} strokeLinecap="round" />
      <circle cx={12} cy={17} r={0.5} fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M12 2L4 6v6c0 5.25 3.75 10.15 8 11.25C16.25 22.15 20 17.25 20 12V6l-8-4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 40 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-9 h-3.5 opacity-60">
      <polyline points="0,12 8,8 16,10 24,4 32,6 40,2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ config, loading }: { config: CardConfig; loading: boolean }) {
  return (
    <div
      className="bg-[#161C2E] border border-[#2A3352] rounded-xl p-5 min-h-[140px] flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
      style={{
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none blur-2xl opacity-40"
        style={{ background: config.bgGlow }}
      />

      {/* Top row: Icon Badge & Title */}
      <div className="flex items-start justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${config.accentColor}18`,
              borderColor: `${config.accentColor}33`,
              color: config.accentColor,
            }}
          >
            {config.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] m-0 truncate">
              {config.title}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5 truncate">
              {config.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom row: Numerical Value & Trend */}
      <div className="flex items-baseline justify-between gap-2 z-10 mt-1">
        {loading ? (
          <div className="skeleton h-9 w-20 rounded" />
        ) : (
          <div
            className="text-3xl font-bold font-mono leading-none tracking-tight"
            style={{ color: config.accentColor }}
          >
            {config.value}
          </div>
        )}
        <div style={{ color: config.accentColor }} className="shrink-0 flex items-center">
          <TrendIcon />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ThreatOverviewCardsProps {
  summary: RiskSummaryResponse | null;
  loading: boolean;
}

export default function ThreatOverviewCards({ summary, loading }: ThreatOverviewCardsProps) {
  const cards: CardConfig[] = [
    {
      title:       'Total Employees',
      value:       summary?.total_employees ?? 0,
      subtitle:    'Monitored identities',
      accentColor: '#3B82F6',
      bgGlow:      'rgba(59,130,246,0.25)',
      icon:        <PeopleIcon />,
    },
    {
      title:       'Critical Risk Alerts',
      value:       summary?.critical_count ?? 0,
      subtitle:    'Require immediate action',
      accentColor: '#EF4444',
      bgGlow:      'rgba(239,68,68,0.25)',
      icon:        <AlertIcon />,
    },
    {
      title:       'High-Risk Users',
      value:       summary?.high_risk_count ?? 0,
      subtitle:    'HIGH + CRITICAL tier',
      accentColor: '#F59E0B',
      bgGlow:      'rgba(245,158,11,0.25)',
      icon:        <ShieldIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <MetricCard key={i} config={card} loading={loading} />
      ))}
    </div>
  );
}
