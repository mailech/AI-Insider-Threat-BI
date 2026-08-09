import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CHART } from '../lib/constants'
import { formatCompact, formatNumber, humanise } from '../lib/format'

const AXIS_TICK = { fill: CHART.axis, fontSize: 11 }

function TooltipCard({ active, payload, label, valueLabel = 'events' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-hairline bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{label}</p>
      <p className="tabular text-ink-secondary">
        {formatNumber(payload[0].value)} {valueLabel}
      </p>
    </div>
  )
}

/** Single series over time -- one series needs no legend; the title names it. */
export function EventsOverTimeChart({ data }) {
  const points = data.map((bucket) => ({
    ...bucket,
    label: new Date(`${bucket.date}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.series} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.series} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={formatCompact}
        />
        <Tooltip
          content={<TooltipCard />}
          cursor={{ stroke: CHART.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={CHART.series}
          strokeWidth={2}
          fill="url(#eventsFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * Ten event types is well past the eight-slot categorical limit, so identity
 * lives on the axis labels and every bar shares one hue. Values are labelled
 * directly, which removes the need for an x-axis entirely.
 */
export function EventsByTypeChart({ data }) {
  const rows = data.map((row) => ({ ...row, label: humanise(row.event_type) }))
  const height = Math.max(220, rows.length * 32)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
        barCategoryGap={4}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          width={124}
        />
        <Tooltip content={<TooltipCard />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.event_type} fill={CHART.series} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            formatter={formatNumber}
            style={{ fill: CHART.axis, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
