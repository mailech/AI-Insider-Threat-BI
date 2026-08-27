import React from 'react';
import { ShieldCheck, Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { TopKpiRow } from '../components/common/TopKpiRow';
import { MitreMatrix } from '../components/common/MitreMatrix';

export const SecurityMetrics: React.FC = () => {
  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                ENTERPRISE SOC SECURITY METRICS & SLA
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                MTTD: 1.4 MINS • MTTR: 4.2 MINS
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Mean Time to Detect, Containment Velocity, and Defensive SLA Scorecards.
            </p>
          </div>
        </div>
      </div>

      <TopKpiRow />

      <MitreMatrix />
    </div>
  );
};
