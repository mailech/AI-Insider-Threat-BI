'use client';

import React, { useEffect } from 'react';
import { EmployeeDetail, TelemetryLog, Incident } from '@/lib/types';
import { EntityGraphVisualizer } from '@/components/charts/EntityGraphVisualizer';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { X, Network, Shield, AlertTriangle, Globe, Layers, Download } from 'lucide-react';

interface EntityGraphExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeDetail | null;
  logs?: TelemetryLog[];
  anomalies?: TelemetryLog[];
  incidents?: Incident[];
}

export function EntityGraphExplorerModal({
  isOpen,
  onClose,
  employee,
  logs = [],
  anomalies = [],
  incidents = [],
}: EntityGraphExplorerModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-[#0E0C1B] border border-violet-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 bg-[#141222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Network size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Entity Relationship Graph Explorer
                </h3>
                <RiskBadge tier={employee.risk_category} size="sm" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  PDF Page 13: Graph Analytics
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {employee.full_name} ({employee.id}) • {employee.department} • {employee.designation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Explorer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Graph Canvas */}
        <div className="p-5 flex-1 overflow-hidden bg-[#0A0912]">
          <EntityGraphVisualizer
            employee={employee}
            logs={logs}
            anomalies={anomalies}
            incidents={incidents}
            height="calc(76vh - 60px)"
          />
        </div>

        {/* Modal Footer: Contextual Intelligence Strip */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#12101F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield size={13} className="text-violet-400" />
              <span>Assigned Devices: {employee.device_assets?.length || 0}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Globe size={13} className="text-cyan-400" />
              <span>Monitored Activity: {logs.length || employee.recent_logs?.length || 0} events</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <AlertTriangle size={13} className="text-rose-400" />
              <span>Active Anomalies: {anomalies.length}</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            Node-link relationships constructed exclusively from verified telemetry & profile schema
          </span>
        </div>
      </div>
    </div>
  );
}
