'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Laptop,
  Server,
  Smartphone,
  Cpu,
  ShieldAlert,
  Activity,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Wifi,
  HardDrive,
  User,
  ArrowRight,
  ExternalLink,
  Layers
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceFleetItem, TelemetryLog } from '@/lib/types';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';

interface DeviceDrawerProps {
  device: DeviceFleetItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceDrawer: React.FC<DeviceDrawerProps> = ({
  device,
  isOpen,
  onClose,
}) => {
  const [deviceLogs, setDeviceLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !device) {
      setDeviceLogs([]);
      return;
    }

    const fetchDeviceLogs = async () => {
      try {
        setLoading(true);
        // Query telemetry logs for this employee / endpoint
        const logs = await api.getTelemetryLogs({
          employee_id: device.employee_id,
          limit: 50,
        });
        // Filter or prioritize logs matching this device's assigned IP or employee
        setDeviceLogs(logs);
      } catch (err) {
        console.error('Failed to load device logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceLogs();
  }, [isOpen, device]);

  if (!isOpen || !device) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getDeviceIcon = (dType: string) => {
    switch (dType.toLowerCase()) {
      case 'workstation':
        return <Cpu size={20} className="text-indigo-400" />;
      case 'cloud bastion':
        return <Server size={20} className="text-violet-400" />;
      case 'mobile':
        return <Smartphone size={20} className="text-sky-400" />;
      default:
        return <Laptop size={20} className="text-blue-400" />;
    }
  };

  // Derive network binding history (distinct IPs seen in logs)
  const networkBindings = Array.from(
    new Set([device.assigned_ip, ...deviceLogs.map((l) => l.source_ip)])
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="fixed inset-y-0 right-0 max-w-full flex pl-10 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-2xl bg-[#0F0E1B] border-l border-violet-500/20 shadow-2xl flex flex-col overflow-y-auto text-slate-200">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
                {getDeviceIcon(device.device_type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-base">{device.asset_id}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {device.device_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{device.model_name} • {device.os_version}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 space-y-6 flex-1">
            
            {/* Risk Posture Banner */}
            <div className={cn(
              'p-4 rounded-2xl border flex items-center justify-between',
              device.risk_status === 'HIGH_ANOMALY_DENSITY'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                : device.risk_status === 'ELEVATED'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            )}>
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Security Posture: {device.risk_status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {device.anomaly_events_count} anomalous events detected on this endpoint.
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                {device.total_telemetry_events} Events
              </span>
            </div>

            {/* Device Identity & Assignment Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HardDrive size={14} className="text-violet-400" /> Device Specifications & Custody
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Assigned Employee</span>
                  <span className="text-white font-semibold block">{device.employee_name}</span>
                  <span className="text-[11px] text-slate-400">{device.department} ({device.employee_id})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Primary IP Address</span>
                  <span
                    onClick={() => handleCopy(device.assigned_ip)}
                    className="font-mono text-violet-300 hover:text-white cursor-pointer inline-flex items-center gap-1.5"
                    title="Click to copy IP"
                  >
                    {device.assigned_ip}
                    {copiedText === device.assigned_ip ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-500" />}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Hardware MAC Address</span>
                  <span
                    onClick={() => handleCopy(device.mac_address)}
                    className="font-mono text-slate-300 hover:text-white cursor-pointer inline-flex items-center gap-1.5"
                    title="Click to copy MAC"
                  >
                    {device.mac_address}
                    {copiedText === device.mac_address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-500" />}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Last Active</span>
                  <span className="font-mono text-slate-300">{formatRelativeTime(device.last_seen)}</span>
                </div>
              </div>
            </div>

            {/* Network Binding History */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Wifi size={14} className="text-sky-400" /> Network Binding History
                </h4>
                <span className="text-[10px] font-mono text-slate-500">{networkBindings.length} Distinct Interfaces</span>
              </div>

              <div className="space-y-2">
                {networkBindings.map((ip, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-200">{ip}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                      {idx === 0 ? 'Primary Static Lease' : 'Correlated DHCP Gateway'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Telemetry Logs Activity on this Endpoint */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity size={14} className="text-violet-400" /> Endpoint Telemetry Activity Stream
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Last 50 Events</span>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  <span className="text-xs">Loading hardware telemetry logs...</span>
                </div>
              ) : deviceLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No telemetry logs recorded on this endpoint.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {deviceLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'p-3 rounded-xl border text-xs transition-all space-y-1',
                        log.anomaly_category
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-black/30 border-white/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RiskBadge severity={log.severity} size="sm" />
                          <span className="font-mono font-bold text-white">{log.event_type}</span>
                          {log.anomaly_category && (
                            <span className="text-[9px] font-semibold text-rose-300 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                              {log.anomaly_category.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{formatRelativeTime(log.timestamp)}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{log.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
