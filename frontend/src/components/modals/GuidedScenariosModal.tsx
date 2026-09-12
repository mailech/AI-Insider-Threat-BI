'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShowcaseScenarioItem } from '@/lib/types';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { MitreBadge } from '@/components/ui/MitreBadge';
import {
  X,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Clock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Lock,
  ExternalLink,
  ShieldCheck,
  FileText,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectScenario?: (employeeId: string, incidentId: string) => void;
}

export function GuidedScenariosModal({
  isOpen,
  onClose,
  onInspectScenario,
}: GuidedScenariosModalProps) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ShowcaseScenarioItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getShowcaseScenarios();
      setScenarios(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load live attack scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScenarios();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleInspect = (employeeId: string, incidentId: string) => {
    onClose();
    if (onInspectScenario) {
      onInspectScenario(employeeId, incidentId);
    } else {
      router.push(`/employees?employeeId=${employeeId}&incidentId=${incidentId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'escalated':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Escalated (Tier-2)
          </span>
        );
      case 'investigating':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Active Investigation
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Resolved Case
          </span>
        );
      case 'open':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Open Triage
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#0E0C1B] border border-violet-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-[#141222] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Guided Attack Scenarios Showcase
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold uppercase tracking-wider">
                  Verified Real Data Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live threat narratives pulled directly from genuine consolidated incidents in the enterprise database. No synthesized or embellished narratives.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-violet-400" />
              <span className="text-xs">Querying verified incident narratives from database...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchScenarios}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 font-semibold text-xs text-rose-200"
              >
                Retry
              </button>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              No live showcase scenarios currently available in the database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((s) => (
                <div
                  key={s.incident_id}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 hover:border-violet-500/40 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] group"
                >
                  <div>
                    {/* Top Row: Scenario Index & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-violet-600/20 border border-violet-500/30 text-violet-300 font-mono text-[11px] font-bold">
                          {s.incident_id}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {s.scenario_label.split(':')[0]}
                        </span>
                      </div>
                      {getStatusBadge(s.status)}
                    </div>

                    {/* Employee Profile Header */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#131122] border border-white/5 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-xs">
                          {s.employee_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{s.employee_name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({s.employee_department})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {s.employee_designation}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-white">{Math.round(s.employee_threat_score)}%</span>
                          <RiskBadge tier={s.employee_risk_category} size="sm" />
                        </div>
                        {s.employee_containment_status && s.employee_containment_status !== 'normal' && (
                          <span className="text-[9px] text-rose-400 mt-1 font-semibold flex items-center gap-1">
                            <Lock size={10} /> {s.employee_containment_status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Incident Title */}
                    <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-violet-300 transition-colors">
                      {s.title}
                    </h4>

                    {/* MITRE Badge & Anomaly Category */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {s.mitre_technique_id && (
                        <MitreBadge
                          techniqueId={s.mitre_technique_id}
                          techniqueName={s.mitre_technique_name || 'Exfiltration'}
                          size="sm"
                        />
                      )}
                      {s.anomaly_category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                          {s.anomaly_category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Real DB Description */}
                    <p className="text-xs text-slate-300/90 leading-relaxed mb-4 bg-black/30 p-3 rounded-xl border border-white/5 font-sans">
                      {s.description}
                    </p>

                    {/* Genuine Telemetry Trigger (if available) */}
                    {s.telemetry_trigger && (
                      <div className="text-[11px] p-2.5 rounded-xl bg-violet-950/20 border border-violet-500/20 mb-4 space-y-1">
                        <div className="flex items-center justify-between text-violet-300 font-mono text-[10px]">
                          <span>TRIGGER: {s.telemetry_trigger.event_type}</span>
                          <span>IP: {s.telemetry_trigger.source_ip}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] truncate">
                          {s.telemetry_trigger.description}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <button
                    onClick={() => handleInspect(s.employee_id, s.incident_id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer group/btn"
                  >
                    <span>Inspect Scenario & Profile</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141222] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-violet-400" />
            <span>Strict Guardrail: Real database records only — zero synthetic fallback data.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
