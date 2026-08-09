import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { RiskTrendPoint } from '@/types';

interface RiskTrendChartProps {
  data: RiskTrendPoint[];
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

const labelStyle = {
  color: 'hsl(var(--muted-foreground))',
  fontSize: '0.7rem',
  marginBottom: '0.25rem',
};

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  return (
    <ChartCard
      title="Organization Risk Trend"
      description="12-week rolling insider risk score vs. baseline"
      className="col-span-1 xl:col-span-2"
      contentClassName="h-[280px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
          />
          <ReferenceLine
            y={60}
            stroke="hsl(var(--destructive))"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: 'Threshold',
              position: 'insideTopRight',
              fill: 'hsl(var(--destructive))',
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="riskScore"
            name="Risk Score"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: 'hsl(var(--chart-1))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
