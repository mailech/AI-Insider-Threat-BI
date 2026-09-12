'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { ThreatVelocityPoint } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { ShieldAlert, TrendingUp, TrendingDown, Minus, Maximize2 } from 'lucide-react';

interface ThreatVelocityChartProps {
  data: ThreatVelocityPoint[];
  onEnlarge?: () => void;
}

export const ThreatVelocityChart: React.FC<ThreatVelocityChartProps> = ({ data, onEnlarge }) => {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point: ThreatVelocityPoint = payload[0].payload;
      const delta = point.velocity_delta;
      const isPositive = delta > 0;
      const isNegative = delta < 0;

      return (
        <div className="rounded-xl bg-[#171526]/95 border border-violet-500/30 p-3.5 shadow-2xl backdrop-blur-xl min-w-[200px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-white">{point.day_label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{point.date_str}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Avg Threat Score:</span>
              <span className="text-sm font-extrabold text-violet-300 font-mono">
                {point.avg_score}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">24h Velocity Delta:</span>
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  isPositive
                    ? 'text-rose-400'
                    : isNegative
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {isPositive ? <TrendingUp size={13} /> : isNegative ? <TrendingDown size={13} /> : <Minus size={13} />}
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-slate-400">Logged Anomalies:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {point.anomalies_count} Events
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard variant="elevated" className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-violet-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              7-Day Organizational Threat Velocity & Anomaly Trends
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Fleet-wide risk momentum, daily score fluctuations, and incident density
          </p>
        </div>

        {/* Risk Threshold Band Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span>Low (0-30%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span>Med (30-60%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span>High (60-80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span>Crit (80-100%)</span>
          </div>

          {onEnlarge && (
            <button
              onClick={onEnlarge}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-400 hover:text-white transition-all border border-white/10 cursor-pointer ml-1"
              title="Click to enlarge 7-Day Velocity Chart"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>


      <div className="w-full h-72 outline-none focus:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} className="outline-none focus:outline-none">
            <defs>
              {/* Glowing purple/violet area gradient */}
              <linearGradient id="violetGlowArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#7C3AED" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#09090E" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

            <XAxis
              dataKey="day_label"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Threshold reference lines */}
            <ReferenceLine y={80} stroke="rgba(239, 68, 68, 0.35)" strokeDasharray="3 3" />
            <ReferenceLine y={60} stroke="rgba(245, 158, 11, 0.3)" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="rgba(56, 189, 248, 0.25)" strokeDasharray="3 3" />

            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
            />


            <Area
              type="monotone"
              dataKey="avg_score"
              stroke="#A78BFA"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#violetGlowArea)"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
              }}
              dot={{
                r: 4,
                fill: '#8B5CF6',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 7,
                fill: '#C4B5FD',
                stroke: '#8B5CF6',
                strokeWidth: 3,
                style: { filter: 'drop-shadow(0 0 12px rgba(167, 139, 250, 0.9))' },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};
