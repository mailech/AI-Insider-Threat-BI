import React from 'react';
import { Activity, Radio, Play, Pause, Trash2, ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { SecurityBadge } from './SecurityBadge';

export const LiveActivityPanel: React.FC = () => {
  const { 
    telemetryEvents, 
    isTelemetryLive, 
    setIsTelemetryLive, 
    clearTelemetry, 
    setActiveNav,
    setSelectedEmployeeId 
  } = useSecurity();

  return (
    <div className="cyber-panel rounded-xl p-4 font-mono shadow-xl flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#18E66A]/15 border border-[#18E66A]/30 text-[#2DFF78]">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
              LIVE ACTIVITY STREAM
            </h3>
            <span className="flex items-center gap-1 text-[10px] text-[#2DFF78] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsTelemetryLive(!isTelemetryLive)}
            className="p-1 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#2DFF78] border border-[#18E66A]/30 text-[10px]"
            title={isTelemetryLive ? 'Pause Stream' : 'Resume Stream'}
          >
            {isTelemetryLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={clearTelemetry}
            className="p-1 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#8CA798] hover:text-[#FF334B] border border-[#18E66A]/30 text-[10px]"
            title="Clear Stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {telemetryEvents.slice(0, 7).map((evt) => (
          <div
            key={evt.id}
            onClick={() => {
              setSelectedEmployeeId(evt.employeeId);
              setActiveNav('employees');
            }}
            className="p-2 rounded bg-[#0A1C13]/60 hover:bg-[#0D261A] border border-[#18E66A]/20 hover:border-[#18E66A]/40 transition-colors cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-[#8CA798]">{evt.timestamp}</span>
                <span className="font-bold text-[#E8FFF0]">{evt.employeeName}</span>
                <span className="text-[9px] text-[#4C7D60]">({evt.employeeId})</span>
              </div>
              <SecurityBadge severity={evt.risk} size="sm" />
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#73FFA5]">
              <span className="px-1 rounded bg-[#020605] border border-[#18E66A]/30 text-[9px] text-[#2DFF78] font-bold">
                {evt.type}
              </span>
              <span className="truncate text-[#E8FFF0]">{evt.details}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2 mt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
        <span>Ingesting: 12.8k events/min</span>
        <button
          onClick={() => setActiveNav('telemetry')}
          className="text-[#2DFF78] hover:underline flex items-center gap-1"
        >
          <span>Full Telemetry Terminal</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
