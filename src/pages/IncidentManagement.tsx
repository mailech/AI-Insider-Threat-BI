import React from 'react';
import { 
  Flame, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';

export const IncidentManagement: React.FC = () => {
  const { incidents, setSelectedIncidentId, setActiveNav } = useSecurity();

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
                INCIDENT MANAGEMENT & LIFECYCLE COMMAND
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/40 font-bold">
                {incidents.length} INCIDENTS RECORDED
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Manage end-to-end security response across Detected, Triaged, Investigating, Contained, and Resolved states.
            </p>
          </div>
        </div>
      </div>

      {/* Incidents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            onClick={() => {
              setSelectedIncidentId(inc.id);
              setActiveNav('investigation');
            }}
            className="cyber-panel p-4 rounded-xl hover:border-[#18E66A]/50 transition-all cursor-pointer space-y-3 flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-[#8CA798] font-bold">{inc.id}</span>
                  <h3 className="text-sm font-bold text-[#E8FFF0]">{inc.title}</h3>
                </div>
                <SecurityBadge severity={inc.severity} size="sm" />
              </div>

              <p className="text-xs text-[#8CA798] leading-relaxed">
                {inc.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-[#2DFF78]">
                <span>Primary Subject: <strong>{inc.primaryEmployeeName}</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
              <span>Status: <strong className="text-[#73FFA5]">{inc.status}</strong></span>
              <span className="text-[#2DFF78] flex items-center gap-1 font-bold">
                <span>Enter Investigation Workspace</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
