import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Building, 
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { RiskTrendChart } from '../components/common/RiskTrendChart';

export const RiskAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | 'CUSTOM'>('30D');

  const deptRisks = [
    { name: 'Finance & Cloud Infra', score: 84, trend: '+14%', color: '#FF334B', incidents: 3 },
    { name: 'Core Infrastructure & SRE', score: 76, trend: '+9%', color: '#FF7043', incidents: 2 },
    { name: 'Customer Success & Tier-3', score: 71, trend: '+18%', color: '#FF7043', incidents: 1 },
    { name: 'Sales & Business Development', score: 68, trend: '+12%', color: '#F5A623', incidents: 1 },
    { name: 'Legal & Compliance', score: 22, trend: '0%', color: '#18E66A', incidents: 0 },
  ];

  const threatVectors = [
    { category: 'Data Exfiltration (S3 Staging / Cloud / USB)', count: 48, percentage: 42, color: '#FF334B' },
    { category: 'Privilege Abuse & Kerberos Pass-the-Ticket', count: 31, percentage: 27, color: '#FF7043' },
    { category: 'Unusual Off-Hours & Impossible Travel VPN', count: 21, percentage: 18, color: '#F5A623' },
    { category: 'Customer PII Database Bulk Scraping', count: 15, percentage: 13, color: '#18E66A' },
  ];

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Top Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                ADVANCED RISK ANALYTICS & THREAT TRAJECTORY
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                ENTERPRISE SOC TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Departmental threat distributions, behavioral trajectory lines, and high-risk vector allocations.
            </p>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center gap-1 bg-[#0A1C13] p-1 rounded-lg border border-[#18E66A]/20 text-xs">
          {(['7D', '30D', '90D', 'CUSTOM'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded font-bold transition-all ${
                timeframe === tf
                  ? 'bg-[#18E66A] text-[#020605] shadow-md'
                  : 'text-[#8CA798] hover:text-[#E8FFF0]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <RiskTrendChart />

      {/* Department & Vector Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Departmental Risk */}
        <div className="lg:col-span-6 cyber-panel rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#18E66A]" />
              <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                DEPARTMENTAL RISK SCORES
              </h3>
            </div>
            <span className="text-[10px] text-[#8CA798]">Window: {timeframe}</span>
          </div>

          <div className="space-y-3">
            {deptRisks.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#E8FFF0]">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: dept.color }}>Index: {dept.score}</span>
                    <span className={`text-[10px] font-bold ${dept.trend.startsWith('+') ? 'text-[#FF7043]' : 'text-[#18E66A]'}`}>
                      {dept.trend}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#020605] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${dept.score}%`, backgroundColor: dept.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Vector Distribution */}
        <div className="lg:col-span-6 cyber-panel rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#18E66A]" />
              <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                THREAT VECTOR ALLOCATION
              </h3>
            </div>
            <span className="text-[10px] text-[#2DFF78] font-bold">115 Total Detections</span>
          </div>

          <div className="space-y-3">
            {threatVectors.map((vec) => (
              <div key={vec.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#E8FFF0]">{vec.category}</span>
                  <span className="text-[#2DFF78] font-bold">{vec.percentage}% ({vec.count} events)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#020605] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${vec.percentage * 2}%`, backgroundColor: vec.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
