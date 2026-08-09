import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { DepartmentActivityPoint } from '@/types';

interface DepartmentActivityChartProps {
  data: DepartmentActivityPoint[];
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

const legendStyle = {
  fontSize: '0.7rem',
  color: 'hsl(var(--muted-foreground))',
  cursor: 'default',
} as const;

export function DepartmentActivityChart({ data }: DepartmentActivityChartProps) {
  return (
    <ChartCard
      title="Department Activity"
      description="Logins, data transfers, and off-hours events (7-day)"
      className="col-span-1"
      contentClassName="h-[280px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="department"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
          />
          <Legend
            wrapperStyle={legendStyle}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="logins"
            name="Logins"
            fill="hsl(var(--chart-1))"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="dataTransfers"
            name="Data Transfers"
            fill="hsl(var(--chart-2))"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="offHours"
            name="Off-Hours"
            fill="hsl(var(--chart-3))"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
