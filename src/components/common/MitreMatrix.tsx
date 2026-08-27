import React from 'react';
import { Compass, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const MitreMatrix: React.FC = () => {
  const { mitreTactics } = useSecurity();

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return '#FF334B';
      case 'HIGH': return '#FF7043';
      case 'MEDIUM': return '#F5A623';
      default: return '#18E66A';
    }
  };

  return (
    <div className="cyber-panel rounded-xl p-4 font-mono shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <Compass className="w-4 h-4 text-[#18E66A]" />
          <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
            MITRE ATT&CK® BEHAVIORAL MAPPING MATRIX
          </span>
        </div>
        <span className="text-[10px] text-[#2DFF78] font-bold">10 Tactics Monitored</span>
      </div>

      {/* Horizontal Tactics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {mitreTactics.map((tactic) => {
          const color = getSeverityColor(tactic.severity);

          return (
            <div 
              key={tactic.id}
              className="p-2 rounded bg-[#0A1C13]/60 border border-[#18E66A]/20 hover:border-[#18E66A]/40 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-[#E8FFF0]">
                  <span className="text-[#8CA798] text-[9px]">{tactic.id}</span>
                  <span>{tactic.tactic}</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color }}>
                  {tactic.detectionsCount} events
                </span>
              </div>

              <div className="text-[10px] text-[#8CA798] truncate">
                {tactic.technique}
              </div>

              {/* Progress bar representing confidence & telemetry coverage */}
              <div className="w-full h-1.5 rounded-full bg-[#020605] overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700" 
                  style={{ width: `${tactic.coveragePercentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
        <span>Enterprise Coverage: 96.8%</span>
        <span className="text-[#2DFF78]">MITRE ATT&CK v15.1 Enterprise Matrix</span>
      </div>
    </div>
  );
};
