import React from 'react';
import { Bell, Flame, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { SecurityBadge } from './SecurityBadge';

export const RiskAlertsPanel: React.FC = () => {
  const { alerts, acknowledgeAlert, escalateAlertToIncident, setActiveNav } = useSecurity();

  return (
    <div className="cyber-panel rounded-xl p-4 font-mono shadow-xl flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#18E66A]/15 border border-[#18E66A]/30 text-[#2DFF78]">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
            ACTIVE RISK ALERTS
          </h3>
        </div>

        <button
          onClick={() => setActiveNav('alerts')}
          className="text-[10px] text-[#2DFF78] hover:underline flex items-center gap-1 font-bold"
        >
          <span>All Alerts</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="p-2.5 rounded-lg bg-[#0A1C13]/70 border border-[#18E66A]/20 hover:border-[#18E66A]/40 transition-colors space-y-1.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-xs text-[#E8FFF0] block">{a.title}</span>
                <span className="text-[10px] text-[#2DFF78]">{a.employeeName} ({a.employeeId}) • {a.department}</span>
              </div>
              <SecurityBadge severity={a.severity} size="sm" />
            </div>

            <p className="text-[10px] text-[#8CA798] leading-tight truncate">
              {a.event}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-[#18E66A]/10 text-[9px]">
              <span className="text-[#8CA798]">{a.timestamp}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => acknowledgeAlert(a.id)}
                  className="px-2 py-0.5 rounded bg-[#07140E] hover:bg-[#0A1C13] text-[#73FFA5] border border-[#18E66A]/25"
                >
                  Triage
                </button>
                <button
                  onClick={() => escalateAlertToIncident(a.id)}
                  className="px-2 py-0.5 rounded bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF334B] border border-[#FF334B]/40 font-bold"
                >
                  Escalate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 mt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
        <span>Automated SIEM / SOAR Forwarding</span>
        <span className="text-[#2DFF78]">Active Filter</span>
      </div>
    </div>
  );
};
