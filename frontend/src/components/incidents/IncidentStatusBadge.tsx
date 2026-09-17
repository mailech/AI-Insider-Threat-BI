'use client';

import React from 'react';
import type { IncidentSeverity, IncidentStatus } from '@/types/api';

// ── Incident Status Badge ─────────────────────────────────────────────────────

interface StatusStyle {
  label:       string;
  color:       string;
  bg:          string;
  border:      string;
  dotColor:    string;
  pulse:       boolean;
}

const STATUS_CONFIGS: Record<IncidentStatus, StatusStyle> = {
  NEW: {
    label:       'NEW ALERT',
    color:       '#EF4444',
    bg:          'rgba(239, 68, 68, 0.12)',
    border:      'rgba(239, 68, 68, 0.35)',
    dotColor:    '#EF4444',
    pulse:       true,
  },
  UNDER_INVESTIGATION: {
    label:       'IN PROGRESS',
    color:       '#F59E0B',
    bg:          'rgba(245, 158, 11, 0.12)',
    border:      'rgba(245, 158, 11, 0.35)',
    dotColor:    '#F59E0B',
    pulse:       false,
  },
  RESOLVED: {
    label:       'RESOLVED',
    color:       '#10B981',
    bg:          'rgba(16, 185, 129, 0.12)',
    border:      'rgba(16, 185, 129, 0.35)',
    dotColor:    '#10B981',
    pulse:       false,
  },
  FALSE_POSITIVE: {
    label:       'FALSE POSITIVE',
    color:       '#94A3B8',
    bg:          'rgba(148, 163, 184, 0.10)',
    border:      'rgba(148, 163, 184, 0.25)',
    dotColor:    '#64748B',
    pulse:       false,
  },
};

export function IncidentStatusBadge({
  status,
  size = 'md',
}: {
  status: IncidentStatus;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = STATUS_CONFIGS[status] ?? {
    label:       status,
    color:       '#94A3B8',
    bg:          'rgba(148, 163, 184, 0.10)',
    border:      'rgba(148, 163, 184, 0.25)',
    dotColor:    '#64748B',
    pulse:       false,
  };

  const padMap = {
    sm: '2px 7px',
    md: '3px 10px',
    lg: '5px 14px',
  };
  const fontMap = {
    sm: '10px',
    md: '11px',
    lg: '12px',
  };

  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             '6px',
        padding:         padMap[size],
        borderRadius:    '9999px',
        fontSize:        fontMap[size],
        fontWeight:      700,
        fontFamily:      'var(--font-mono, monospace)',
        letterSpacing:   '0.06em',
        color:           cfg.color,
        backgroundColor: cfg.bg,
        border:          `1px solid ${cfg.border}`,
        whiteSpace:      'nowrap',
        userSelect:      'none',
      }}
    >
      <span style={{ position: 'relative', display: 'flex', width: '7px', height: '7px' }}>
        {cfg.pulse && (
          <span
            style={{
              position:        'absolute',
              inset:           0,
              borderRadius:    '9999px',
              backgroundColor: cfg.dotColor,
              opacity:         0.75,
              animation:       'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
        <span
          style={{
            position:        'relative',
            display:         'inline-block',
            width:           '7px',
            height:          '7px',
            borderRadius:    '9999px',
            backgroundColor: cfg.dotColor,
          }}
        />
      </span>
      {cfg.label}
    </span>
  );
}

// ── Incident Severity Badge ───────────────────────────────────────────────────

const SEVERITY_CONFIGS: Record<IncidentSeverity, { label: string; color: string; bg: string; border: string }> = {
  CRITICAL: {
    label:  'CRITICAL',
    color:  '#EF4444',
    bg:     'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.40)',
  },
  HIGH: {
    label:  'HIGH',
    color:  '#F59E0B',
    bg:     'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.40)',
  },
  MEDIUM: {
    label:  'MEDIUM',
    color:  '#3B82F6',
    bg:     'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.40)',
  },
  LOW: {
    label:  'LOW',
    color:  '#10B981',
    bg:     'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.40)',
  },
  INFO: {
    label:  'INFO',
    color:  '#6366F1',
    bg:     'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.40)',
  },
};

export function IncidentSeverityBadge({
  severity,
  size = 'md',
}: {
  severity: IncidentSeverity;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = SEVERITY_CONFIGS[severity] ?? {
    label:  severity,
    color:  '#94A3B8',
    bg:     'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.30)',
  };

  const padMap = {
    sm: '1px 6px',
    md: '2px 8px',
    lg: '4px 12px',
  };
  const fontMap = {
    sm: '10px',
    md: '11px',
    lg: '12px',
  };

  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        padding:         padMap[size],
        borderRadius:    '4px',
        fontSize:        fontMap[size],
        fontWeight:      700,
        fontFamily:      'var(--font-mono, monospace)',
        letterSpacing:   '0.05em',
        color:           cfg.color,
        backgroundColor: cfg.bg,
        border:          `1px solid ${cfg.border}`,
        whiteSpace:      'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}
