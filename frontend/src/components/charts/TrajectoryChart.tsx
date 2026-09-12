'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { RiskTrajectory } from '@/lib/types';

interface TrajectoryChartProps {
  trajectories: RiskTrajectory[];
  currentScore: number;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ trajectories, currentScore }) => {
  const chartData = trajectories.map((t) => ({
    day: t.day_offset === 0 ? 'Today' : `${t.day_offset}d`,
    score: t.score,
    baseline: t.baseline_score,
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg bg-[#181628]/95 border border-violet-500/30 p-2.5 shadow-xl text-xs backdrop-blur-md">
          <div className="font-semibold text-white mb-1">{data.day} ({data.date})</div>
          <div className="text-violet-300 font-mono font-bold">Threat Score: {data.score}%</div>
          <div className="text-slate-400 font-mono text-[10px]">Baseline: {data.baseline}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-44 outline-none focus:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} className="outline-none focus:outline-none">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            interval={5}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: 'none', zIndex: 50 }}
          />
          <ReferenceLine y={50} stroke="rgba(239, 68, 68, 0.3)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#A78BFA', stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
