'use client';

import { useState } from 'react';
import type { EmployeeRead, RiskCategory } from '@/types/api';

// ── Risk badge ────────────────────────────────────────────────────────────────

const RISK_STYLES: Record<RiskCategory, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)',  border: 'rgba(239, 68, 68, 0.35)'  },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  MEDIUM:   { color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
  LOW:      { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
};
const FALLBACK_RISK_STYLE = { color: '#6EE7B7', bg: 'rgba(110, 231, 183, 0.1)', border: 'rgba(110, 231, 183, 0.2)' };

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
          backgroundColor: '#18382B',
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
          fontWeight:      700,
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
    <tr style={{ backgroundColor: index % 2 === 0 ? '#040D0A' : '#0B1A14' }}>
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
    { key: 'first_name',    label: 'Identity Name'  },
    { key: 'department',    label: 'Department'     },
    { key: 'risk_category', label: 'Risk Category'  },
    { key: 'risk_score',    label: 'Threat Score'   },
    { key: 'created_at',    label: 'Enrolled'       },
    { key: null,            label: 'Status'         },
  ];

  return (
    <div className="cyber-card overflow-hidden">
      {/* ── Header ── */}
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '16px 20px',
          borderBottom:    '1px solid #18382B',
          backgroundColor: '#11241C',
        }}
      >
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#ECFDF5', margin: 0 }}>
            CYBER AI — Monitored Security Identities
          </h2>
          <p style={{ fontSize: '11px', color: '#6EE7B7', margin: '2px 0 0' }}>
            {loading ? 'Loading…' : `${employees.length} identity profile${employees.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>

        {/* Risk legend */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskCategory[]).map((r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: RISK_STYLES[r].color }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#A7F3D0' }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#0B1A14' }}>
              {columns.map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.key && handleSort(col.key)}
                  style={{
                    padding:       '10px 16px',
                    textAlign:     'left',
                    fontSize:      '10px',
                    fontWeight:    700,
                    color:         '#6EE7B7',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor:        col.key ? 'pointer' : 'default',
                    whiteSpace:    'nowrap',
                    userSelect:    'none',
                    borderBottom:  '1px solid #18382B',
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
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6EE7B7', fontSize: '13px' }}>
                    No identity records found.
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
                        backgroundColor: i % 2 === 0 ? '#040D0A' : '#0B1A14',
                        transition: 'background-color 0.15s ease',
                        borderLeft: isCritical ? `3px solid ${riskStyle.color}` : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#11241C';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#040D0A' : '#0B1A14';
                      }}
                    >
                      {/* Employee ID */}
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: '11px', color: '#10B981', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {emp.emp_id}
                        </code>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#ECFDF5', whiteSpace: 'nowrap' }}>
                        {emp.first_name} {emp.last_name}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#A7F3D0' }}>
                        {emp.department}
                      </td>

                      {/* Risk category */}
                      <td style={{ padding: '12px 16px' }}>
                        <RiskBadge category={emp.risk_category} />
                      </td>

                      {/* Threat score bar */}
                      <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                        <ScoreBar score={emp.risk_score} />
                      </td>

                      {/* Enrolled */}
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: '#6EE7B7', whiteSpace: 'nowrap' }}>
                        {new Date(emp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '10px', fontWeight: 700, color: '#10B981',
                          letterSpacing: '0.05em',
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} className="animate-pulse-green" />
                          ONLINE
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
