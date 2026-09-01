'use client';

import React from 'react';
import type { RiskSummaryResponse } from '@/types/api';

interface TopRiskAttributionProps {
  summary: RiskSummaryResponse | null;
  loading: boolean;
}

export default function TopRiskAttribution({
  summary,
  loading,
}: TopRiskAttributionProps) {
  // Threat vector attribution weights
  const vectors = [
    { name: 'Mass Data Exfiltration & Cloud Sync', count: summary?.critical_count ? summary.critical_count * 3 : 6, pct: 44, color: '#EF4444', icon: '📤' },
    { name: 'Off-Hours & Geographic Anomaly Logons', count: summary?.high_risk_count ? summary.high_risk_count * 2 : 4, pct: 28, color: '#F59E0B', icon: '🌙' },
    { name: 'Privilege Escalation & Cloud IAM Ops', count: 3, pct: 16, color: '#6366F1', icon: '🔑' },
    { name: 'Removable USB & Local Media Transfer', count: 2, pct: 12, color: '#3B82F6', icon: '💾' },
  ];

  // Risk Distribution counts
  const dist = summary?.risk_distribution ?? { CRITICAL: 2, HIGH: 3, MEDIUM: 8, LOW: 35 };
  const total = summary?.total_employees ?? (dist.CRITICAL + dist.HIGH + dist.MEDIUM + dist.LOW);

  const bands = [
    { label: 'CRITICAL', min: '80–100', count: dist.CRITICAL ?? 0, color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'HIGH',     min: '60–79',  count: dist.HIGH ?? 0,     color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'MEDIUM',   min: '30–59',  count: dist.MEDIUM ?? 0,   color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'LOW',      min: '0–29',   count: dist.LOW ?? 0,      color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        margin: '20px 0',
      }}
    >
      {/* ── Card 1: Top Threat Attribution Breakdown ── */}
      <div
        style={{
          backgroundColor: '#161C2E',
          border: '1px solid #2A3352',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#1E2640',
                border: '1px solid #2A3352',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              🎯
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                Top Threat Attribution Vectors
              </h4>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                Primary behavioral anomaly triggers across enterprise
              </p>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            Live Rollup
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '28px', borderRadius: '6px' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vectors.map((vec) => (
              <div key={vec.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{vec.icon}</span>
                    <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{vec.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      {vec.count} events
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: vec.color, fontFamily: 'var(--font-mono)', minWidth: '32px', textAlign: 'right' }}>
                      {vec.pct}%
                    </span>
                  </div>
                </div>
                <div style={{ height: '5px', backgroundColor: '#0B0F19', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${vec.pct}%`,
                      backgroundColor: vec.color,
                      borderRadius: '3px',
                      boxShadow: `0 0 8px ${vec.color}40`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Card 2: Threat Score Distribution Band ── */}
      <div
        style={{
          backgroundColor: '#161C2E',
          border: '1px solid #2A3352',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#1E2640',
                border: '1px solid #2A3352',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              📊
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                Threat Score Distribution Bands
              </h4>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                Workforce segmentation across risk severity thresholds
              </p>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            {total} Total Identities
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '28px', borderRadius: '6px' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Multi-segment visual band bar */}
            <div style={{ height: '12px', backgroundColor: '#0B0F19', borderRadius: '6px', overflow: 'hidden', display: 'flex', border: '1px solid #2A3352' }}>
              {bands.map((b) => {
                const pct = total > 0 ? (b.count / total) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={b.label}
                    title={`${b.label}: ${b.count} staff (${pct.toFixed(1)}%)`}
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: b.color,
                      transition: 'width 0.6s ease',
                    }}
                  />
                );
              })}
            </div>

            {/* Breakdown legend tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
              {bands.map((b) => {
                const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                return (
                  <div
                    key={b.label}
                    style={{
                      backgroundColor: '#1E2640',
                      border: '1px solid #2A3352',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: b.color }} />
                      <span style={{ fontSize: '11px', color: '#E2E8F0', fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>({b.min})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: b.color, fontFamily: 'var(--font-mono)' }}>
                        {b.count}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
