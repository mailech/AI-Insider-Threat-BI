'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { ScoreBandItem, EmployeeListItem } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { BarChart3, Filter, ArrowUpRight, X, Maximize2 } from 'lucide-react';

interface ScoreBarChartProps {
  data: ScoreBandItem[];
  onSelectEmployee?: (empId: string) => void;
  onEnlarge?: () => void;
}


const BAND_COLORS = {
  '0-20': '#10B981',
  '20-40': '#38BDF8',
  '40-60': '#818CF8',
  '60-80': '#F59E0B',
  '80-100': '#EF4444',
};

export const ScoreBarChart: React.FC<ScoreBarChartProps> = ({ data, onSelectEmployee, onEnlarge }) => {
  const [selectedBand, setSelectedBand] = useState<string | null>(null);


  const activeBandData = data.find((b) => b.band === selectedBand);

  const handleBarClick = (entry: any) => {
    if (entry && entry.band) {
      setSelectedBand(selectedBand === entry.band ? null : entry.band);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: ScoreBandItem = payload[0].payload;
      const color = BAND_COLORS[item.band as keyof typeof BAND_COLORS] || '#8B5CF6';
      return (
        <div className="rounded-xl bg-[#121020]/95 border border-white/15 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150 min-w-[190px]">
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/10">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span className="text-xs font-bold text-white tracking-wide">Threat Band: {item.band}%</span>
          </div>
          <div className="text-xs text-slate-300 flex items-center justify-between gap-3">
            <span className="text-slate-400">Employees:</span>
            <span className="font-mono font-bold text-white">{item.count}</span>
          </div>
          <span className="text-[10px] text-violet-400 font-medium block mt-1.5 pt-1 border-t border-white/5">
            Click to view employee list below
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-violet-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Threat Score Band Distribution
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Click any bar to drill down</span>
          {onEnlarge && (
            <button
              onClick={onEnlarge}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer ml-1"
              title="Click to enlarge Threat Score Band Distribution Chart"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>


      <div className="w-full h-56 outline-none focus:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            className="outline-none focus:outline-none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="band"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(139, 92, 246, 0.08)', radius: 6 }}
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              onClick={handleBarClick}
              className="cursor-pointer outline-none focus:outline-none"
            >
              {data.map((entry) => {
                const color = BAND_COLORS[entry.band as keyof typeof BAND_COLORS] || '#8B5CF6';
                const isSelected = selectedBand === entry.band;
                return (
                  <Cell
                    key={`bar-${entry.band}`}
                    fill={color}
                    opacity={selectedBand ? (isSelected ? 1 : 0.4) : 0.85}
                    className="outline-none focus:outline-none transition-opacity duration-200"
                    style={{
                      outline: 'none',
                      filter: isSelected ? `drop-shadow(0 0 10px ${color})` : undefined,
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>


      {/* Drill-down employee table */}
      {selectedBand && activeBandData && (
        <div className="mt-4 pt-4 border-t border-violet-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-violet-400" />
              <span className="text-xs font-bold text-white">
                Drill-Down: Score Band {selectedBand}% ({activeBandData.employees.length} Employees)
              </span>
            </div>
            <button
              onClick={() => setSelectedBand(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1"
            >
              <X size={13} /> Clear Drill-Down
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Threat Score</th>
                  <th className="px-3 py-2">Risk Tier</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeBandData.employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-violet-500/10 transition-colors group cursor-pointer"
                    onClick={() => onSelectEmployee && onSelectEmployee(emp.id)}
                  >
                    <td className="px-3 py-2 font-mono text-slate-400">{emp.id}</td>
                    <td className="px-3 py-2 font-medium text-white group-hover:text-violet-300">
                      {emp.full_name}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{emp.department}</td>
                    <td className="px-3 py-2 font-mono font-bold text-white">
                      {emp.threat_score}%
                    </td>
                    <td className="px-3 py-2">
                      <RiskBadge tier={emp.risk_category} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-violet-400 hover:text-violet-200 inline-flex items-center gap-1 font-semibold">
                        Profile <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
