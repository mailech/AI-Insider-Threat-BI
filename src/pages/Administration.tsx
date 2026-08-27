import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Users, 
  Key, 
  Sliders, 
  CheckCircle2, 
  Lock,
  RotateCcw
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const Administration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ANALYSTS' | 'POLICY' | 'API_KEYS'>('ANALYSTS');

  const analysts = [
    { name: 'Authar Morgan', email: 'authar.morgan@sentinel.sec', role: 'Principal SOC Analyst', status: 'ACTIVE' },
    { name: 'Marcus Vance', email: 'm.vance@sentinel.sec', role: 'Lead Threat Hunter', status: 'ACTIVE' },
    { name: 'Elena Rostova', email: 'e.rostova@sentinel.sec', role: 'SOC Tier-2 Specialist', status: 'ACTIVE' },
    { name: 'Sarah Chen', email: 's.chen@sentinel.sec', role: 'Identity Access Admin', status: 'ACTIVE' },
  ];

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                ADMINISTRATION & SOC ACCESS POLICIES
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                RBAC ENFORCED
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Manage SOC analyst roles, automated containment trigger thresholds, and SIEM forwarders.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#18E66A]/20 pb-2">
          {(['ANALYSTS', 'POLICY', 'API_KEYS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/50'
                  : 'text-[#8CA798] hover:text-[#E8FFF0]'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {activeTab === 'ANALYSTS' && (
          <div className="space-y-2">
            {analysts.map((u, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-[#E8FFF0]">{u.name}</div>
                  <div className="text-[10px] text-[#8CA798]">{u.email} • {u.role}</div>
                </div>

                <span className="px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] text-[9px] font-bold">
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'POLICY' && (
          <div className="space-y-3 text-xs text-[#8CA798]">
            <div className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 space-y-1">
              <span className="font-bold text-[#E8FFF0] block">Automated Egress Threshold Quarantine</span>
              <p className="text-[11px]">Automatically isolate endpoints that exceed 10.0GB data egress to unapproved cloud storage within a 1-hour window.</p>
              <span className="text-[10px] text-[#2DFF78] font-bold">Status: ARMED & ACTIVE</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 space-y-1">
              <span className="font-bold text-[#E8FFF0] block">Impossible Travel Velocity Intercept</span>
              <p className="text-[11px]">Enforce FIDO2 hardware step-up authentication when successive logins occur across &gt;500km within 30 minutes.</p>
              <span className="text-[10px] text-[#2DFF78] font-bold">Status: ARMED & ACTIVE</span>
            </div>
          </div>
        )}

        {activeTab === 'API_KEYS' && (
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded bg-[#020605] border border-[#18E66A]/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#E8FFF0]">Production SIEM Forwarding Token</span>
                <div className="text-[10px] text-[#8CA798]">sentinel_live_f89a240...</div>
              </div>
              <span className="text-[#2DFF78] text-[10px] font-bold">ACTIVE</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
