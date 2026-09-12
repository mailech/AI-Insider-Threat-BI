'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { RiskDistributionItem } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PieChart as PieIcon, Maximize2 } from 'lucide-react';

interface RiskDonutChartProps {
  data: RiskDistributionItem[];
  totalCount: number;
  onEnlarge?: () => void;
}

export const RiskDonutChart: React.FC<RiskDonutChartProps> = ({ data, totalCount, onEnlarge }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: RiskDistributionItem = payload[0].payload;
      return (
        <div className="rounded-xl bg-[#171526]/95 border border-violet-500/30 p-2.5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-bold text-white">{item.name} Risk:</span>
            <span className="text-xs font-mono font-bold text-violet-300">
              {item.count} ({item.percentage}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieIcon size={18} className="text-violet-400" />
          <h3 className="text-base font-bold text-white tracking-tight">Risk Distribution</h3>
        </div>
        {onEnlarge && (
          <button
            onClick={onEnlarge}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer"
            title="Click to enlarge Risk Distribution Chart"
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>


      <div className="relative w-full h-56 flex items-center justify-center outline-none focus:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart className="outline-none focus:outline-none">
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
            />
            <Pie
              data={data}
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              dataKey="count"
              stroke="none"
              className="outline-none focus:outline-none cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="outline-none focus:outline-none"
                  style={{
                    outline: 'none',
                    filter: `drop-shadow(0 0 6px ${entry.color}66)`,
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>


        {/* Center count readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-white font-mono">{totalCount}</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Monitored
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.color}88`,
                }}
              />
              <span className="text-xs font-medium text-slate-300">{item.name}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-white">{item.count}</span>
              <span className="text-slate-500">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
