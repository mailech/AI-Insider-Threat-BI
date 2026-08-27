import React, { useState } from 'react';
import { 
  Flame, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Layers, 
  Lock, 
  Share2, 
  UserCheck,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';

export const InvestigationWorkspace: React.FC = () => {
  const { 
    incidents, 
    selectedIncidentId, 
    setSelectedIncidentId, 
    selectedIncident, 
    toggleMitigationStep, 
    openContainmentModal,
    setSelectedEmployeeId,
    setActiveNav 
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'EVIDENCE' | 'PLAYBOOK'>('TIMELINE');

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                SOC THREAT INVESTIGATION WORKSPACE
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/40 font-bold">
                KILL-CHAIN CORRELATOR
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Multi-vector forensic incident triage, chronological telemetry timelines, and MITRE playbook containment.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Incidents Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-[10px] text-[#8CA798] font-bold uppercase tracking-wider px-1">
            ACTIVE INCIDENTS QUEUE
          </div>

          <div className="space-y-2.5">
            {incidents.map((inc) => {
              const isSelected = selectedIncident.id === inc.id;

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-[#0A1C13] border-[#18E66A]/60 shadow-[0_0_12px_rgba(24,230,106,0.2)]'
                      : 'bg-[#040B08] border-[#18E66A]/20 hover:border-[#18E66A]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#8CA798]">{inc.id}</span>
                      <h3 className="text-xs font-bold text-[#E8FFF0] leading-snug">{inc.title}</h3>
                    </div>
                    <SecurityBadge severity={inc.severity} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8CA798]">
                    <span className="text-[#2DFF78] font-bold">{inc.primaryEmployeeName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#020605] border border-[#18E66A]/20 text-[#73FFA5]">
                      {inc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Incident Workspace */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Incident Overview Card */}
          <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-[#8CA798] font-bold">{selectedIncident.id}</span>
                <h2 className="text-base font-bold text-[#E8FFF0]">{selectedIncident.title}</h2>
                <div className="text-xs text-[#2DFF78] font-bold mt-1">
                  Primary Subject: {selectedIncident.primaryEmployeeName} ({selectedIncident.primaryEmployeeId})
                </div>
              </div>
              <SecurityBadge severity={selectedIncident.severity} size="md" />
            </div>

            <p className="text-xs text-[#8CA798] leading-relaxed">
              {selectedIncident.description}
            </p>

            {/* AI Hypothesis */}
            <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2DFF78]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Kill-Chain Hypothesis:</span>
              </div>
              <p className="text-[11px] text-[#73FFA5] leading-relaxed">
                {selectedIncident.aiHypothesis}
              </p>
            </div>
          </div>

          {/* Tab Navigation: Timeline / Evidence / Playbook */}
          <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                {(['TIMELINE', 'EVIDENCE', 'PLAYBOOK'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab
                        ? 'bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/50'
                        : 'text-[#8CA798] hover:text-[#E8FFF0]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => openContainmentModal(selectedIncident.primaryEmployeeId, 'ISOLATE')}
                className="px-3 py-1 rounded bg-[#FF334B] hover:bg-[#FF334B]/80 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Trigger Quarantine Playbook
              </button>
            </div>

            {/* Tab: Chronological Timeline */}
            {activeTab === 'TIMELINE' && (
              <div className="space-y-3">
                {selectedIncident.timelineEvents.map((evt, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 flex items-start gap-3">
                    <div className="p-1.5 rounded bg-[#020605] border border-[#18E66A]/30 text-[#2DFF78] font-bold text-[10px]">
                      {evt.time}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E8FFF0]">{evt.description}</span>
                        <SecurityBadge severity={evt.severity} size="sm" />
                      </div>
                      <span className="text-[10px] text-[#8CA798]">Artifact ID: {evt.evidenceId} • Category: {evt.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Mitigation Steps Playbook */}
            {activeTab === 'PLAYBOOK' && (
              <div className="space-y-2.5">
                {selectedIncident.mitigationSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => toggleMitigationStep(selectedIncident.id, step.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      step.completed
                        ? 'bg-[#18E66A]/10 border-[#18E66A]/40 text-[#2DFF78]'
                        : 'bg-[#0A1C13]/60 border-[#18E66A]/20 text-[#8CA798] hover:border-[#18E66A]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                        step.completed ? 'bg-[#18E66A] border-[#18E66A] text-[#020605]' : 'border-[#8CA798]'
                      }`}>
                        {step.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold">{step.step}</span>
                    </div>

                    <span className="text-[10px] font-bold">
                      {step.completed ? 'COMPLETED' : 'PENDING ACTION'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Evidence */}
            {activeTab === 'EVIDENCE' && (
              <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-2 text-xs text-[#73FFA5]">
                <div>• AWS S3 PutObject Audit Trail (Bucket: s3://temp-sync-8841, Size: 12.4GB)</div>
                <div>• SanDisk Mass Storage Hardware Mount Event ID 2003 on DESKTOP-7G8H2</div>
                <div>• Vault KMS Master Token Export Log ID #8841-KMS</div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
