import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  Flame, 
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';

export const AlertCenter: React.FC = () => {
  const { alerts, acknowledgeAlert, escalateAlertToIncident, resolveAlert, setSelectedEmployeeId, setActiveNav } = useSecurity();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity);

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                SOC ALERT TRIAGE & DISPATCH CENTER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                {alerts.length} ALERTS ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Automated high-fidelity threat notifications with one-click escalation to Incident Command.
            </p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                filterSeverity === sev
                  ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/50'
                  : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20 hover:text-[#E8FFF0]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="cyber-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1C13] text-[#8CA798] uppercase text-[10px] font-bold tracking-wider border-b border-[#18E66A]/20">
              <tr>
                <th className="py-2.5 px-3">ALERT ID</th>
                <th className="py-2.5 px-3">TITLE & CATEGORY</th>
                <th className="py-2.5 px-3">SUBJECT</th>
                <th className="py-2.5 px-3">DETECTION TIME</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">TRIAGE ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18E66A]/10 text-[11px]">
              {filteredAlerts.map((a) => (
                <tr key={a.id} className="hover:bg-[#0A1C13]/60 transition-colors">
                  <td className="py-2 px-3 font-bold text-[#8CA798]">{a.id}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-[#E8FFF0]">{a.title}</div>
                    <div className="text-[10px] text-[#73FFA5] truncate max-w-sm">{a.event}</div>
                  </td>
                  <td className="py-2 px-3 font-bold text-[#2DFF78]">
                    <span
                      onClick={() => {
                        setSelectedEmployeeId(a.employeeId);
                        setActiveNav('employees');
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      {a.employeeName}
                    </span>
                    <span className="text-[9px] text-[#4C7D60] ml-1">({a.employeeId})</span>
                  </td>
                  <td className="py-2 px-3 text-[#8CA798]">{a.timestamp}</td>
                  <td className="py-2 px-3">
                    <SecurityBadge severity={a.severity} size="sm" />
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#020605] border border-[#18E66A]/20 text-[#73FFA5] text-[10px]">
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right space-x-1.5">
                    {a.status !== 'RESOLVED' && (
                      <>
                        <button
                          onClick={() => acknowledgeAlert(a.id)}
                          className="px-2 py-1 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 text-[10px] font-bold"
                        >
                          Triage
                        </button>
                        <button
                          onClick={() => escalateAlertToIncident(a.id)}
                          className="px-2 py-1 rounded bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF334B] border border-[#FF334B]/40 text-[10px] font-bold"
                        >
                          Escalate
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
