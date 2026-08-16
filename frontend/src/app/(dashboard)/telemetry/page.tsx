'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { EmployeeRead, Severity, TelemetryEventCreate } from '@/types/api';
import { listEmployees, getTelemetryLogs, ingestTelemetry } from '@/services/api';
import axios from 'axios';

// ── Severity styles ───────────────────────────────────────────────────────────

const SEV_STYLES: Record<Severity, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  MEDIUM:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  LOW:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  INFO:     { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)'},
};

const EVENT_TYPES = [
  'FILE_ACCESS', 'LOGIN_ATTEMPT', 'USB_INSERTED', 'EMAIL_EXFILTRATION',
  'NETWORK_SCAN', 'PRIVILEGE_ESCALATION', 'DATA_DOWNLOAD', 'VPN_LOGIN',
  'AFTER_HOURS_ACCESS', 'CONFIG_CHANGE',
];

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in"
          onClick={() => onDismiss(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '10px',
            backgroundColor: t.type === 'success' ? 'rgba(16,185,129,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.4)' : t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}`,
            color: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#3B82F6',
            fontSize: '13px', fontWeight: 500, minWidth: '260px', maxWidth: '380px',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Severity Badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEV_STYLES[(severity as Severity)] ?? SEV_STYLES.INFO;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
      {severity}
    </span>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr style={{ backgroundColor: index % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)' }}>
      {[100, 140, 130, 90, 120, 110].map((w, i) => (
        <td key={i} style={{ padding: '10px 14px' }}>
          <div className="skeleton" style={{ height: '13px', width: `${w}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Formatted Payload Helpers ─────────────────────────────────────────────────

function formatKeyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function FormattedPayloadValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '11px' }}>null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: value ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: value ? '#10B981' : '#EF4444',
          border: `1px solid ${value ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}
      >
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: value ? '#10B981' : '#EF4444' }} />
        {value ? 'true' : 'false'}
      </span>
    );
  }
  if (typeof value === 'number') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '6px',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: '#38BDF8',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: '11px',
        }}
      >
        {value.toLocaleString()}
      </span>
    );
  }
  if (typeof value === 'object') {
    return (
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid var(--color-border-subtle)',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}
      >
        {JSON.stringify(value)}
      </code>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-primary)',
        fontSize: '11px',
        fontWeight: 500,
        wordBreak: 'break-word',
      }}
    >
      {String(value)}
    </span>
  );
}

// ── Ingest Simulator Form ─────────────────────────────────────────────────────

interface IngestSimulatorProps {
  employees: EmployeeRead[];
  onIngested: (logId: string, empId: string) => void;
  addToast:  (msg: string, type: Toast['type']) => void;
}

function IngestSimulator({ employees, onIngested, addToast }: IngestSimulatorProps) {
  const [form, setForm] = useState<TelemetryEventCreate>({
    emp_id:     '',
    event_type: 'FILE_ACCESS',
    severity:   'INFO',
    source_ip:  '',
    payload:    {},
    timestamp:  new Date().toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);
  const [payloadStr, setPayloadStr] = useState('{}');
  const [payloadErr, setPayloadErr] = useState('');

  function setField<K extends keyof TelemetryEventCreate>(k: K, v: TelemetryEventCreate[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handlePayloadChange(val: string) {
    setPayloadStr(val);
    try { JSON.parse(val); setPayloadErr(''); } catch { setPayloadErr('Invalid JSON'); }
  }

  // Preset payload templates with realistic properties
  const samplePayloads = {
    file: {
      filename: 'hr-handbook.pdf',
      filepath: '/confidential/hr/hr-handbook.pdf',
      action: 'READ',
      size: '1.2 MB',
      process_name: 'acrobat_reader.exe',
      user: 'corporate\\user'
    },
    network: {
      destination_ip: '198.51.100.42',
      destination_port: 443,
      protocol: 'HTTPS',
      bytes_sent: '15.4 KB',
      bytes_received: '24.5 KB',
      connection_duration: '45s',
      dns_query: 'api.external-cloud-storage.com'
    },
    login: {
      username: 'corporate.user',
      auth_method: 'SSO_SAML',
      success: true,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'London, UK',
      mfa_verified: true
    }
  };

  function insertSamplePayload(type: 'file' | 'network' | 'login') {
    const data = samplePayloads[type];
    const formatted = JSON.stringify(data, null, 2);
    setPayloadStr(formatted);
    setPayloadErr('');
    if (type === 'file') setForm((f) => ({ ...f, event_type: 'FILE_ACCESS', severity: 'INFO' }));
    if (type === 'network') setForm((f) => ({ ...f, event_type: 'NETWORK_SCAN', severity: 'MEDIUM' }));
    if (type === 'login') setForm((f) => ({ ...f, event_type: 'LOGIN_ATTEMPT', severity: 'INFO' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.emp_id) { addToast('Select an employee for this event.', 'error'); return; }
    if (payloadErr)   { addToast('Fix JSON payload before submitting.', 'error'); return; }

    setSubmitting(true);
    try {
      const payload: TelemetryEventCreate = {
        ...form,
        source_ip: form.source_ip || undefined,
        payload:   JSON.parse(payloadStr) as Record<string, unknown>,
        timestamp: form.timestamp ? new Date(form.timestamp).toISOString() : undefined,
      };
      const result = await ingestTelemetry(payload);
      addToast(`Telemetry Event Ingested! Log ID: ${result.log_id.slice(-8)}`, 'success');
      onIngested(result.log_id, form.emp_id);
      setForm({
        emp_id:     '',
        event_type: 'FILE_ACCESS',
        severity:   'INFO',
        source_ip:  '',
        payload:    {},
        timestamp:  new Date().toISOString().slice(0, 16),
      });
      setPayloadStr('{}');
      setPayloadErr('');
    } catch (err: unknown) {
      let msg = 'Ingestion failed.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') msg = detail;
      }
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function labelStyle() {
    return { fontSize: '10px', fontWeight: 600 as const, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '5px' };
  }

  function inputStyle(hasError = false) {
    return {
      width: '100%', padding: '8px 10px', borderRadius: '7px',
      border: `1px solid ${hasError ? '#EF4444' : 'var(--color-border-subtle)'}`,
      backgroundColor: 'var(--color-bg-base)',
      color: 'var(--color-text-primary)', fontSize: '12px', outline: 'none',
    };
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: 'linear-gradient(135deg, #6366F1, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} style={{ width: '16px', height: '16px' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Event Ingestion Simulator</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>Simulate real-time telemetry events</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse-ring 2s infinite' }} />
          <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Employee */}
          <div className="sm:col-span-2">
            <label htmlFor="ingest-emp-id" style={labelStyle()}>Employee *</label>
            <select
              id="ingest-emp-id"
              value={form.emp_id}
              onChange={(e) => setField('emp_id', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
              required
            >
              <option value="">— Select Employee —</option>
              {employees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.first_name} {emp.last_name} ({emp.emp_id}) - {emp.department}
                </option>
              ))}
            </select>
          </div>

          {/* Event type */}
          <div>
            <label htmlFor="ingest-event-type" style={labelStyle()}>Event Type *</label>
            <select
              id="ingest-event-type"
              value={form.event_type}
              onChange={(e) => setField('event_type', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              {EVENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label htmlFor="ingest-severity" style={labelStyle()}>Severity</label>
            <select
              id="ingest-severity"
              value={form.severity}
              onChange={(e) => setField('severity', e.target.value as Severity)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Source IP */}
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="ingest-source-ip" style={labelStyle()}>Source IP (optional)</label>
            <input
              id="ingest-source-ip"
              type="text"
              placeholder="192.168.1.100"
              value={form.source_ip ?? ''}
              onChange={(e) => setField('source_ip', e.target.value)}
              style={inputStyle()}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent-blue)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
            />
          </div>
        </div>

        {/* Timestamp */}
        <div>
          <label htmlFor="ingest-timestamp" style={labelStyle()}>Timestamp (UTC, defaults to now)</label>
          <input
            id="ingest-timestamp"
            type="datetime-local"
            value={form.timestamp as string}
            onChange={(e) => setField('timestamp', e.target.value)}
            style={{ ...inputStyle(), colorScheme: 'dark' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent-blue)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
          />
        </div>

        {/* Payload JSON */}
        <div>
          <label htmlFor="ingest-payload" style={labelStyle()}>
            Metadata Payload (JSON)
            {payloadErr && <span style={{ color: '#EF4444', marginLeft: '8px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{payloadErr}</span>}
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button
              id="preset-file-payload"
              type="button"
              onClick={() => insertSamplePayload('file')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(99,102,241,0.3)',
                backgroundColor: 'rgba(99,102,241,0.1)',
                color: '#6366F1',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              [+ Add File Payload]
            </button>
            <button
              id="preset-network-payload"
              type="button"
              onClick={() => insertSamplePayload('network')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(59,130,246,0.3)',
                backgroundColor: 'rgba(59,130,246,0.1)',
                color: '#3B82F6',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              [+ Add Network Payload]
            </button>
            <button
              id="preset-login-payload"
              type="button"
              onClick={() => insertSamplePayload('login')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(16,185,129,0.3)',
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: '#10B981',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              [+ Add Login Payload]
            </button>
          </div>
          <textarea
            id="ingest-payload"
            rows={6}
            value={payloadStr}
            onChange={(e) => handlePayloadChange(e.target.value)}
            placeholder={'{\n  "filename": "hr-handbook.pdf",\n  "action": "READ"\n}'}
            style={{ ...inputStyle(!!payloadErr), resize: 'vertical', fontFamily: 'var(--font-mono)', lineHeight: 1.5, fontSize: '11px' }}
            onFocus={(e) => { if (!payloadErr) e.target.style.borderColor = 'var(--color-accent-blue)'; }}
            onBlur={(e)  => { if (!payloadErr) e.target.style.borderColor = 'var(--color-border-subtle)'; }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            id="submit-ingest-event"
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {submitting ? 'Ingesting…' : 'Ingest Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Log row expand ────────────────────────────────────────────────────────────

function LogRow({ log, index }: { log: Record<string, unknown>; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const severity   = (log.severity as string) ?? 'INFO';
  const rawPayload = (log.payload ?? log.metadata) as Record<string, unknown> | null;
  const hasPayload = rawPayload && typeof rawPayload === 'object' && Object.keys(rawPayload).length > 0;

  const timestamp = log.timestamp
    ? (() => { try { return new Date(log.timestamp as string).toLocaleString('en-GB'); } catch { return String(log.timestamp); } })()
    : '—';

  const bg = index % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)';

  return (
    <>
      <tr
        onClick={() => hasPayload && setExpanded((e) => !e)}
        style={{
          backgroundColor: bg,
          cursor:          hasPayload ? 'pointer' : 'default',
          transition:      'background-color 0.1s ease',
          borderLeft:      severity === 'CRITICAL' ? '3px solid #EF4444' : severity === 'HIGH' ? '3px solid #F59E0B' : '3px solid transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = bg; }}
      >
        <td style={{ padding: '10px 14px' }}>
          <code style={{ fontSize: '10px', color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)' }}>
            {(log.emp_id as string) ?? '—'}
          </code>
        </td>
        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasPayload && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '12px', height: '12px', color: 'var(--color-text-muted)', transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-primary)' }}>
              {(log.event_type as string) ?? '—'}
            </code>
          </div>
        </td>
        <td style={{ padding: '10px 14px' }}><SeverityBadge severity={severity} /></td>
        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {(log.source_ip as string | null) ?? <span style={{ fontStyle: 'italic', fontFamily: 'inherit' }}>—</span>}
        </td>
        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {timestamp}
        </td>
        <td style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((e) => !e);
              }}
              disabled={!hasPayload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-secondary)',
                fontSize: '10px',
                fontWeight: 500,
                cursor: hasPayload ? 'pointer' : 'not-allowed',
                opacity: hasPayload ? 1 : 0.5,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '10px', height: '10px' }}>
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {expanded ? 'Collapse' : 'View'}
            </button>
          </div>
        </td>
      </tr>
      {expanded && hasPayload && rawPayload && (
        <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
          <td colSpan={6} style={{ padding: '14px 18px 18px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {/* Header with View Toggle and Copy */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Payload Details
                </span>
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }}>
                  {Object.keys(rawPayload).length} {Object.keys(rawPayload).length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Mode Selector */}
                <div style={{ display: 'inline-flex', padding: '2px', borderRadius: '7px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewMode('formatted'); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: viewMode === 'formatted' ? 'var(--color-accent-blue)' : 'transparent',
                      color: viewMode === 'formatted' ? '#FFFFFF' : 'var(--color-text-muted)',
                      fontSize: '11px',
                      fontWeight: viewMode === 'formatted' ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Formatted View
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewMode('raw'); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: viewMode === 'raw' ? 'var(--color-accent-blue)' : 'transparent',
                      color: viewMode === 'raw' ? '#FFFFFF' : 'var(--color-text-muted)',
                      fontSize: '11px',
                      fontWeight: viewMode === 'raw' ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Raw JSON
                  </button>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title="Copy payload JSON to clipboard"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-base)',
                    color: copied ? '#10B981' : 'var(--color-text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '11px', height: '11px' }}>
                    {copied ? (
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                  </svg>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Content view */}
            {viewMode === 'formatted' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '10px',
                }}
              >
                {Object.entries(rawPayload).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent-indigo)', letterSpacing: '0.03em' }}>
                        {formatKeyLabel(k)}:
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {k}
                      </span>
                    </div>
                    <div>
                      <FormattedPayloadValue value={v} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TelemetryPage() {
  const [employees,    setEmployees]    = useState<EmployeeRead[]>([]);
  const [selectedEmp,  setSelectedEmp]  = useState('');
  const [logs,         setLogs]         = useState<Record<string, unknown>[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [empLoading,   setEmpLoading]   = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [filterSev,    setFilterSev]    = useState<Severity | ''>('');
  const [limitCount,   setLimitCount]   = useState(50);
  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  function addToast(message: string, type: Toast['type']) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }
  function dismissToast(id: number) { setToasts((prev) => prev.filter((t) => t.id !== id)); }

  // Load employees on mount & sort alphabetically by Employee Name (A to Z)
  useEffect(() => {
    setEmpLoading(true);
    void listEmployees({ limit: 200 })
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.trim();
          const nameB = `${b.first_name} ${b.last_name}`.trim();
          return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        });
        setEmployees(sorted);
        if (sorted.length) setSelectedEmp(sorted[0].emp_id);
      })
      .catch(() => addToast('Could not load employees.', 'error'))
      .finally(() => setEmpLoading(false));
  }, []);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.trim();
      const nameB = `${b.first_name} ${b.last_name}`.trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }, [employees]);

  const fetchLogs = useCallback(async (empId: string, limit: number) => {
    if (!empId) return;
    setLoading(true); setError(null);
    try {
      const data = await getTelemetryLogs(empId, limit);
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch telemetry logs.';
      setError(msg); addToast(msg, 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedEmp) void fetchLogs(selectedEmp, limitCount);
  }, [selectedEmp, limitCount, fetchLogs]);

  function handleIngested(_logId: string, empId: string) {
    // If viewing same employee, refresh logs
    if (empId === selectedEmp) void fetchLogs(selectedEmp, limitCount);
  }

  // Filtered logs matching severity filter (logs already filtered by selected employee)
  const filtered = useMemo(() => {
    return logs.filter((l) => !filterSev || l.severity === filterSev);
  }, [logs, filterSev]);

  const columns = ['Employee ID', 'Event Type', 'Severity', 'Source IP', 'Timestamp', 'Actions'];

  // KPI calculations based on filtered logs (matching both emp AND severity filter)
  const filteredCount = filtered.length;
  const criticalCount = filtered.filter((l) => l.severity === 'CRITICAL').length;
  const highCount     = filtered.filter((l) => l.severity === 'HIGH').length;

  const selectedEmpObj = sortedEmployees.find((e) => e.emp_id === selectedEmp);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px' }}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Telemetry Event Stream
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Raw activity stream from MongoDB — query by employee, simulate events in real-time
          </p>
        </div>
        <button
          id="refresh-telemetry"
          type="button"
          onClick={() => { if (selectedEmp) void fetchLogs(selectedEmp, limitCount); }}
          disabled={loading || !selectedEmp}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '14px', height: '14px' }}>
            <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'TOTAL LOGS',     value: loading ? '—' : logs.length.toString(),         color: '#6366F1', icon: '📋' },
          { label: 'FILTERED VIEW',  value: loading ? '—' : filteredCount.toString(),       color: '#3B82F6', icon: '🔍' },
          { label: 'CRITICAL EVENTS',value: loading ? '—' : criticalCount.toString(),       color: '#EF4444', icon: '🚨' },
          { label: 'HIGH EVENTS',    value: loading ? '—' : highCount.toString(),           color: '#F59E0B', icon: '⚠️' },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{stat.label}</p>
              <span style={{ fontSize: '14px' }}>{stat.icon}</span>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: '28px', width: '60px' }} />
              : <p style={{ fontSize: '26px', fontWeight: 800, color: stat.color, fontFamily: 'var(--font-mono)', margin: 0, lineHeight: 1 }}>{stat.value}</p>
            }
          </div>
        ))}
      </div>

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-start">

        {/* ── Left: Logs panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Employee selector + filters */}
          <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Employee select */}
              <div style={{ flex: '2', minWidth: '200px' }}>
                <label htmlFor="telemetry-emp-select" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Employee
                </label>
                <select
                  id="telemetry-emp-select"
                  value={selectedEmp}
                  onChange={(e) => { setSelectedEmp(e.target.value); setLogs([]); }}
                  disabled={empLoading}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer', opacity: empLoading ? 0.6 : 1 }}
                >
                  {empLoading
                    ? <option>Loading employees…</option>
                    : sortedEmployees.length === 0
                    ? <option value="">No employees found</option>
                    : sortedEmployees.map((emp) => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.first_name} {emp.last_name} ({emp.emp_id}) - {emp.department}
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* Severity filter */}
              <div style={{ flex: '1', minWidth: '130px' }}>
                <label htmlFor="tel-filter-sev" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Severity
                </label>
                <select
                  id="tel-filter-sev"
                  value={filterSev}
                  onChange={(e) => setFilterSev(e.target.value as Severity | '')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">All Severities</option>
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Limit */}
              <div style={{ minWidth: '110px' }}>
                <label htmlFor="tel-limit" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Limit
                </label>
                <select
                  id="tel-limit"
                  value={limitCount}
                  onChange={(e) => setLimitCount(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} records</option>)}
                </select>
              </div>
            </div>

            {/* Selected employee info strip */}
            {selectedEmpObj && (
              <div style={{ marginTop: '14px', padding: '10px 14px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {selectedEmpObj.first_name[0]}{selectedEmpObj.last_name[0]}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px' }}>
                    {selectedEmpObj.first_name} {selectedEmpObj.last_name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                    {selectedEmpObj.department} · {selectedEmpObj.designation}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', color: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    Risk: {Math.round(selectedEmpObj.risk_score * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          {/* Logs table */}
          <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-indigo)" strokeWidth={1.8} style={{ width: '15px', height: '15px' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Activity Logs</h2>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {loading ? 'Loading…' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
                {filterSev && ` (filtered by ${filterSev})`}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                    {columns.map((col) => (
                      <th key={col} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                    : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '50px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ width: '36px', height: '36px', opacity: 0.3 }}>
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>
                              {!selectedEmp
                                ? 'Select an employee to view logs.'
                                : filterSev
                                ? `No ${filterSev} events found for this employee.`
                                : 'No telemetry logs found. Use the simulator to ingest events.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                    : filtered.map((log, i) => (
                        <LogRow key={`${String(log.emp_id)}-${i}`} log={log} index={i} />
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right: Ingest simulator ── */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <IngestSimulator
            employees={sortedEmployees}
            onIngested={handleIngested}
            addToast={addToast}
          />
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
