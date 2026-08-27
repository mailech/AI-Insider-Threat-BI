import React, { useState } from 'react';
import { 
  Zap, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Cpu, 
  Clock, 
  ArrowUpRight,
  Flame,
  UserCheck
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';
import { Anomaly } from '../types';

export const AnomalyIntelligence: React.FC = () => {
  const { anomalies, setSelectedEmployeeId, setActiveNav, openContainmentModal } = useSecurity();
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly>(anomalies[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filtered = anomalies.filter(a => categoryFilter === 'ALL' || a.category === categoryFilter);

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                ANOMALY INTELLIGENCE & STATISTICAL CLUSTER CENTER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                ISOLATION FOREST v2.4
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Automated behavioral anomaly clustering with algorithmic confidence scores and corroborating telemetry evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Anomalies Queue */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
            {['ALL', 'EXCESSIVE_FILE_TRANSFER', 'PRIVILEGE_ABUSE', 'ABNORMAL_DATA_DOWNLOAD'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded border whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/50 font-bold'
                    : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20 hover:text-[#E8FFF0]'
                }`}
              >
                {cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filtered.map((anm) => {
              const isSelected = selectedAnomaly.id === anm.id;

              return (
                <div
                  key={anm.id}
                  onClick={() => setSelectedAnomaly(anm)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-[#0A1C13] border-[#18E66A]/60 shadow-[0_0_12px_rgba(24,230,106,0.2)]'
                      : 'bg-[#040B08] border-[#18E66A]/20 hover:border-[#18E66A]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#8CA798]">{anm.id}</span>
                      <h3 className="text-xs font-bold text-[#E8FFF0] leading-snug">{anm.title}</h3>
                    </div>
                    <SecurityBadge severity={anm.severity} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8CA798]">
                    <span className="text-[#2DFF78] font-bold">{anm.employeeName} ({anm.employeeId})</span>
                    <span>Confidence: <strong className="text-[#E8FFF0]">{anm.confidence}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Anomaly Forensic Detail & Corroborating Evidence */}
        <div className="lg:col-span-6 cyber-panel rounded-xl p-4 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#18E66A]" />
                <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                  ANOMALY DIAGNOSTIC DOSSIER
                </h3>
              </div>
              <SecurityBadge severity={selectedAnomaly.severity} size="sm" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#E8FFF0]">{selectedAnomaly.title}</h2>
              <div className="text-xs text-[#2DFF78] font-bold mt-1">
                Target: {selectedAnomaly.employeeName} ({selectedAnomaly.employeeId}) • Host: {selectedAnomaly.device}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1.5">
              <span className="text-[10px] text-[#8CA798] font-bold uppercase block">
                AI REASONING & ROOT CAUSE EXPLANATION:
              </span>
              <p className="text-xs text-[#73FFA5] leading-relaxed">
                {selectedAnomaly.aiExplanation}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-[#8CA798] font-bold uppercase block">
                CORROBORATING TELEMETRY ARTIFACTS:
              </span>
              {selectedAnomaly.evidence.map((ev, i) => (
                <div key={i} className="p-2 rounded bg-[#0A1C13] border border-[#18E66A]/20 text-[11px] text-[#E8FFF0] flex items-start gap-2">
                  <span className="text-[#18E66A] font-bold">✓</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#18E66A]/15 flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedEmployeeId(selectedAnomaly.employeeId);
                setActiveNav('employees');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 text-xs font-bold transition-colors"
            >
              Open Forensics Dossier
            </button>

            <button
              onClick={() => openContainmentModal(selectedAnomaly.employeeId, 'ISOLATE')}
              className="px-3 py-1.5 rounded-lg bg-[#FF334B] hover:bg-[#FF334B]/80 text-white text-xs font-bold transition-colors"
            >
              Contain Identity
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
