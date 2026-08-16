'use client';

import { useState } from 'react';
import type { EmployeeRead, RiskCategory } from '@/types/api';

// ── Risk badge ────────────────────────────────────────────────────────────────

const RISK_STYLES: Record<RiskCategory, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  MEDIUM:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  LOW:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};
const FALLBACK_RISK_STYLE = { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };

function RiskBadge({ category }: { category: RiskCategory }) {
  const styles = RISK_STYLES[category] ?? FALLBACK_RISK_STYLE;
  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        padding:         '2px 8px',
        borderRadius:    '999px',
        fontSize:        '10px',
        fontWeight:      700,
        letterSpacing:   '0.06em',
        color:           styles.color,
        backgroundColor: styles.bg,
        border:          `1px solid ${styles.border}`,
      }}
    >
      {category}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  // score is 0.0 – 1.0
  const pct       = Math.round(score * 100);
  const category: RiskCategory =
    pct >= 80 ? 'CRITICAL' : pct >= 60 ? 'HIGH' : pct >= 30 ? 'MEDIUM' : 'LOW';
  const color = (RISK_STYLES[category] ?? FALLBACK_RISK_STYLE).color;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          flex: 1,
          height: '4px',
          backgroundColor: 'var(--color-border-subtle)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height:          '100%',
            width:           `${pct}%`,
            backgroundColor: color,
            borderRadius:    '2px',
            transition:      'width 0.6s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize:        '11px',
          fontWeight:      600,
          color,
          fontFamily:      'var(--font-mono)',
          minWidth:        '30px',
          textAlign:       'right',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr style={{ backgroundColor: index % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)' }}>
      {[120, 140, 100, 80, 120, 100, 70].map((w, i) => (
        <td key={i} style={{ padding: '10px 16px' }}>
          <div className="skeleton" style={{ height: '14px', width: `${w}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortKey = 'emp_id' | 'first_name' | 'department' | 'risk_category' | 'risk_score' | 'created_at';

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: '10px', height: '10px', opacity: 0.3 }}>
        <path d="M4 5l4-4 4 4M4 11l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '10px', height: '10px' }}>
      {direction === 'asc'
        ? <path d="M4 10l4-5 4 5" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M4 6l4 5 4-5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RecentAlertsTableProps {
  employees: EmployeeRead[];
  loading:   boolean;
}

export default function RecentAlertsTable({ employees, loading }: RecentAlertsTableProps) {
  const [sortKey, setSortKey]       = useState<SortKey>('risk_score');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...employees].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number;
    let bv: string | number = b[sortKey] as string | number;
    if (sortKey === 'first_name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const columns: { key: SortKey | null; label: string }[] = [
    { key: 'emp_id',        label: 'Employee ID'    },
    { key: 'first_name',    label: 'Name'           },
    { key: 'department',    label: 'Department'     },
    { key: 'risk_category', label: 'Risk Category'  },
    { key: 'risk_score',    label: 'Threat Score'   },
    { key: 'created_at',    label: 'Enrolled'       },
    { key: null,            label: 'Status'         },
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border:          '1px solid var(--color-border-subtle)',
        borderRadius:    '12px',
        overflow:        'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '16px 20px',
          borderBottom:    '1px solid var(--color-border-subtle)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Recent Security Alerts
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            {loading ? 'Loading…' : `${employees.length} monitored employee${employees.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Risk legend */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskCategory[]).map((r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: RISK_STYLES[r].color }} />
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              {columns.map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.key && handleSort(col.key)}
                  style={{
                    padding:       '9px 16px',
                    textAlign:     'left',
                    fontSize:      '10px',
                    fontWeight:    700,
                    color:         'var(--color-text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor:        col.key ? 'pointer' : 'default',
                    whiteSpace:    'nowrap',
                    userSelect:    'none',
                    borderBottom:  '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {col.key && (
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} index={i} />)
              : sorted.length === 0
              ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No employee data found. Add employees via the API.
                  </td>
                </tr>
              )
              : sorted.map((emp, i) => {
                  const riskStyle = RISK_STYLES[emp.risk_category] ?? FALLBACK_RISK_STYLE;
                  const isCritical = emp.risk_category === 'CRITICAL';
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)',
                        transition: 'background-color 0.1s ease',
                        borderLeft: isCritical ? `3px solid ${riskStyle.color}` : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)';
                      }}
                    >
                      {/* Employee ID */}
                      <td style={{ padding: '10px 16px' }}>
                        <code style={{ fontSize: '11px', color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)' }}>
                          {emp.emp_id}
                        </code>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                        {emp.first_name} {emp.last_name}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {emp.department}
                      </td>

                      {/* Risk category */}
                      <td style={{ padding: '10px 16px' }}>
                        <RiskBadge category={emp.risk_category} />
                      </td>

                      {/* Threat score bar */}
                      <td style={{ padding: '10px 16px', minWidth: '140px' }}>
                        <ScoreBar score={emp.risk_score} />
                      </td>

                      {/* Enrolled */}
                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(emp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '10px', fontWeight: 600, color: 'var(--color-success)',
                          letterSpacing: '0.05em',
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
