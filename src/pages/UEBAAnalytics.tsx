import React from 'react';
import { 
  Workflow, 
  Users, 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const UEBAAnalytics: React.FC = () => {
  const { selectedEmployee, setSelectedEmployeeId, setActiveNav } = useSecurity();

  const peerCohorts = [
    { department: 'Finance & Cloud Infra', peerAvg: 24, autharScore: 78, variance: '+225%', risk: 'CRITICAL' },
    { department: 'Core Engineering / SRE', peerAvg: 30, autharScore: 78, variance: '+160%', risk: 'HIGH' },
    { department: 'Customer Success Tier-3', peerAvg: 18, autharScore: 82, variance: '+355%', risk: 'CRITICAL' },
    { department: 'Corporate Sales & BD', peerAvg: 19, autharScore: 68, variance: '+257%', risk: 'HIGH' },
  ];

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                UEBA PEER COHORT & BASELINE VARIANCE ANALYTICS
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                COHORT CLUSTERING
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Cross-departmental statistical baseline modeling and identity anomaly divergence tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Comparison Table */}
      <div className="cyber-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="p-3 bg-[#0A1C13] border-b border-[#18E66A]/20 flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#E8FFF0] uppercase">
            TARGET VS PEER GROUP BASELINE COMPARISON
          </h3>
          <span className="text-[10px] text-[#2DFF78]">Target: {selectedEmployee.name} ({selectedEmployee.id})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#020605] text-[#8CA798] uppercase text-[10px] font-bold tracking-wider border-b border-[#18E66A]/15">
              <tr>
                <th className="py-2.5 px-4">DEPARTMENT COHORT</th>
                <th className="py-2.5 px-4">PEER BASELINE (MEAN)</th>
                <th className="py-2.5 px-4">OBSERVED IDENTITY SCORE</th>
                <th className="py-2.5 px-4">STATISTICAL DIVERGENCE</th>
                <th className="py-2.5 px-4 text-right">RISK TIER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18E66A]/10 text-[11px]">
              {peerCohorts.map((pc, idx) => (
                <tr key={idx} className="hover:bg-[#0A1C13]/60 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#E8FFF0]">{pc.department}</td>
                  <td className="py-2.5 px-4 text-[#8CA798]">{pc.peerAvg} / 100</td>
                  <td className="py-2.5 px-4 font-bold text-[#FF7043]">{pc.autharScore} / 100</td>
                  <td className="py-2.5 px-4 font-bold text-[#FF334B]">{pc.variance}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/40 font-bold text-[9px]">
                      {pc.risk}
                    </span>
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
