'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Severity, TelemetryStreamEvent } from '@/types/api';
import { API_ORIGIN, getToken } from '@/services/api';

type LogSeverity = 'INFO' | 'WARN' | 'CRITICAL';
type SeverityFilter = 'all' | 'warn' | 'critical';
type ConnectionState = 'live' | 'simulated' | 'paused' | 'idle';

interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  message: string;
}

const MAX_LINES = 250;

const SIMULATED_TEMPLATES: Array<{ severity: LogSeverity; message: string }> = [
  { severity: 'INFO', message: 'Telemetry Ingest: Process ID 4081 active on host-01' },
  { severity: 'INFO', message: 'UEBA Engine: Baseline refresh completed for cohort n=142' },
  { severity: 'INFO', message: 'Pipeline: Kafka consumer lag 0 on topic telemetry.raw' },
  { severity: 'WARN', message: 'Threshold Deviation: emp_1002 exceeded 1.2GB/hr' },
  { severity: 'WARN', message: 'Risk Escalation: emp_1044 login velocity 3.2σ above baseline' },
  { severity: 'WARN', message: 'Data Exfil Signal: emp_1019 outbound transfer spike detected' },
  { severity: 'CRITICAL', message: "Isolation Forest: Anomaly score 89.2 detected on user 'Priya Nair'" },
  { severity: 'CRITICAL', message: "UEBA Alert: Composite risk 94.7 on user 'Marcus Chen'" },
  { severity: 'CRITICAL', message: 'Auto-Incident: CRITICAL threshold breached for emp_1088' },
];

function formatTimestamp(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function mapApiSeverity(severity: Severity): LogSeverity {
  if (severity === 'CRITICAL') return 'CRITICAL';
  if (severity === 'HIGH' || severity === 'MEDIUM') return 'WARN';
  return 'INFO';
}

function formatTelemetryEvent(event: TelemetryStreamEvent): LogEntry {
  const severity = mapApiSeverity(event.severity);
  const score = event.risk_score ?? event.threat_score;
  const payload = event.payload ?? {};
  const host = typeof payload.host === 'string' ? payload.host : 'host-01';
  const pid = typeof payload.process_id === 'number' ? payload.process_id : 4081;
  const userName =
    typeof payload.user_name === 'string'
      ? payload.user_name
      : typeof payload.display_name === 'string'
        ? payload.display_name
        : event.emp_id;

  let message: string;
  if (severity === 'CRITICAL' && score != null) {
    message = `Isolation Forest: Anomaly score ${score.toFixed(1)} detected on user '${userName}'`;
  } else if (severity === 'WARN') {
    message = `Threshold Deviation: ${event.emp_id} — ${event.event_type.replace(/_/g, ' ')}`;
  } else if (event.event_type.toLowerCase().includes('process')) {
    message = `Telemetry Ingest: Process ID ${pid} active on ${host}`;
  } else {
    message = `${event.event_type.replace(/_/g, ' ')}: ${event.emp_id}${event.source_ip ? ` from ${event.source_ip}` : ''}`;
  }

  return {
    id: event.log_id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: formatTimestamp(event.timestamp),
    severity,
    message,
  };
}

function randomSimulatedLine(): LogEntry {
  const template = SIMULATED_TEMPLATES[Math.floor(Math.random() * SIMULATED_TEMPLATES.length)];
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: formatTimestamp(),
    severity: template.severity,
    message: template.message,
  };
}

function randomIntervalMs(): number {
  return 1500 + Math.floor(Math.random() * 1501);
}

function severityColor(severity: LogSeverity): string {
  if (severity === 'CRITICAL') return '#F87171';
  if (severity === 'WARN') return '#FBBF24';
  return '#34D399';
}

function matchesFilter(entry: LogEntry, filter: SeverityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'warn') return entry.severity === 'WARN';
  return entry.severity === 'CRITICAL';
}

export default function LiveLogStreamTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [usingSimulation, setUsingSimulation] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const sseReceivedRef = useRef(false);

  pausedRef.current = paused;

  const appendLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev.slice(-(MAX_LINES - 1)), entry]);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, severityFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getToken();
    if (!token) {
      setUsingSimulation(true);
      setConnection('simulated');
      return;
    }

    const url = `${API_ORIGIN}/api/v1/telemetry/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    setConnection('live');
    setUsingSimulation(false);
    sseReceivedRef.current = false;

    const onTelemetry = (ev: MessageEvent<string>): void => {
      if (pausedRef.current) return;
      try {
        const data = JSON.parse(ev.data) as TelemetryStreamEvent;
        sseReceivedRef.current = true;
        setUsingSimulation(false);
        setConnection('live');
        appendLog(formatTelemetryEvent(data));
      } catch {
        /* ignore malformed frames */
      }
    };

    const onReady = (): void => {
      if (!pausedRef.current && !sseReceivedRef.current) {
        setConnection('live');
      }
    };

    source.addEventListener('telemetry', onTelemetry as EventListener);
    source.addEventListener('ready', onReady as EventListener);
    source.onerror = () => {
      setUsingSimulation(true);
      setConnection('simulated');
    };

    const idleFallback = window.setTimeout(() => {
      if (!sseReceivedRef.current && !pausedRef.current) {
        setUsingSimulation(true);
        setConnection('simulated');
      }
    }, 6000);

    return () => {
      window.clearTimeout(idleFallback);
      source.removeEventListener('telemetry', onTelemetry as EventListener);
      source.removeEventListener('ready', onReady as EventListener);
      source.close();
    };
  }, [appendLog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (paused) {
      setConnection('paused');
      return;
    }

    if (!usingSimulation) {
      setConnection('live');
      return;
    }

    setConnection('simulated');

    let timeoutId: number;
    const scheduleNext = (): void => {
      timeoutId = window.setTimeout(() => {
        if (!pausedRef.current) {
          appendLog(randomSimulatedLine());
        }
        scheduleNext();
      }, randomIntervalMs());
    };

    appendLog(randomSimulatedLine());
    scheduleNext();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [paused, usingSimulation, appendLog]);

  const filteredLogs = logs.filter((entry) => matchesFilter(entry, severityFilter));

  const connectionLabel =
    connection === 'live'
      ? 'Connected'
      : connection === 'simulated'
        ? 'Simulated'
        : connection === 'paused'
          ? 'Paused'
          : 'Idle';

  const connectionColor =
    connection === 'live' || connection === 'simulated' ? '#10B981' : '#64748B';

  return (
    <section className="overflow-hidden rounded-lg border border-[#2A3352] bg-[#0B0F19] shadow-lg">
      {/* Top bar */}
      <div className="flex flex-col gap-3 border-b border-[#2A3352] bg-[#161C2E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-2 w-2 shrink-0 items-center justify-center">
            <span
              className={`h-2 w-2 rounded-full ${connection === 'live' || connection === 'simulated' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: connectionColor }}
            />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 truncate text-sm font-semibold tracking-tight text-[#E2E8F0]">
              Live System Log Stream — UEBA Engine
            </h3>
            <p className="mb-0 mt-0.5 text-[10px] text-[#64748B]">
              {connectionLabel}
              {usingSimulation && connection !== 'paused' ? ' · auto-generated feed' : ' · SSE telemetry stream'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#2A3352] bg-[#0B0F19] p-0.5">
            {(['all', 'warn', 'critical'] as const).map((filter) => {
              const active = severityFilter === filter;
              const label = filter === 'all' ? 'All' : filter === 'warn' ? 'Warn' : 'Critical';
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSeverityFilter(filter)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-lg border border-[#2A3352] bg-[#1E2640] px-3 py-1.5 text-[11px] font-medium text-[#E2E8F0] transition-colors hover:bg-[#2A3352] cursor-pointer"
          >
            {paused ? 'Resume Stream' : 'Pause Stream'}
          </button>

          <button
            type="button"
            onClick={() => setLogs([])}
            className="rounded-lg border border-[#2A3352] bg-[#1E2640] px-3 py-1.5 text-[11px] font-medium text-[#94A3B8] transition-colors hover:bg-[#2A3352] hover:text-[#E2E8F0] cursor-pointer"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="h-[280px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed"
        style={{
          background: 'linear-gradient(180deg, #070A12 0%, #0B0F19 100%)',
          scrollbarColor: '#2A3352 #0B0F19',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[#475569]">
            {paused ? 'Stream paused — resume to continue receiving logs.' : 'Waiting for log events…'}
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="whitespace-pre-wrap break-words py-0.5">
              <span className="text-[#64748B]">[{entry.timestamp}] </span>
              <span style={{ color: severityColor(entry.severity) }}>{entry.severity}</span>
              <span className="text-[#64748B]"> - </span>
              <span className="text-[#CBD5E1]">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
