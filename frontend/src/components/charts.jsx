import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTokens } from '../context/ThemeContext'
import { titleise } from '../utils/format'

/** Shared chart chrome: recessive grid and axes, hairline weights. */
function useChrome() {
  const t = useTokens()
  return {
    t,
    axis: { stroke: t.inkMuted, fontSize: 11 },
    grid: { stroke: t.grid, strokeDasharray: '2 4' },
    tooltip: {
      contentStyle: {
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 6,
        fontSize: 12,
        color: t.ink,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        padding: '8px 10px',
      },
      labelStyle: { color: t.inkMuted, marginBottom: 4, fontSize: 11 },
      itemStyle: { color: t.inkSecondary, padding: '1px 0' },
      cursor: { stroke: t.axis, strokeWidth: 1 },
    },
    legend: { wrapperStyle: { fontSize: 11, color: t.inkMuted, paddingTop: 6 } },
  }
}

const shortDate = (value) => String(value).slice(5)

export function EventsTimelineChart({ data = [], height = 250 }) {
  const { t, axis, grid, tooltip, legend } = useChrome()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.series[0]} stopOpacity={0.22} />
            <stop offset="100%" stopColor={t.series[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={shortDate} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Area type="monotone" dataKey="events" name="Events" stroke={t.series[0]} fill="url(#gEvents)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="anomalies" name="Anomalies" stroke={t.series[1]} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="alerts" name="Alerts" stroke={t.severity.critical} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function RiskTrendChart({ data = [], dataKey = 'average_score', height = 250, name = 'Average risk' }) {
  const { t, axis, grid, tooltip } = useChrome()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={shortDate} axisLine={false} tickLine={false} />
        <YAxis tick={axis} domain={[0, 100]} axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltip} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={t.series[0]}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: t.series[0] }}
          activeDot={{ r: 4.5, strokeWidth: 2, stroke: t.surface }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function Donut({ rows, height, tooltip, legend, surface }) {
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No data in this window</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          stroke={surface}
          strokeWidth={2}
        >
          {rows.map((row) => (
            <Cell key={row.name} fill={row.color} />
          ))}
        </Pie>
        <Tooltip {...tooltip} cursor={false} />
        <Legend {...legend} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function SeverityDonut({ data = {}, height = 230 }) {
  const { t, tooltip, legend } = useChrome()
  const rows = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ name: titleise(key), value, color: t.severity[key] || t.severity.informational }))
  return <Donut rows={rows} height={height} tooltip={tooltip} legend={legend} surface={t.surface} />
}

export function RiskDistributionDonut({ data = {}, height = 230 }) {
  const { t, tooltip, legend } = useChrome()
  const rows = Object.entries(data)
    .filter(([key, value]) => key in t.severity && value > 0)
    .map(([key, value]) => ({ name: titleise(key), value, color: t.severity[key] }))
  return <Donut rows={rows} height={height} tooltip={tooltip} legend={legend} surface={t.surface} />
}

export function CategoryBarChart({ data = {}, height = 270 }) {
  const { t, axis, grid, tooltip } = useChrome()
  const rows = Object.entries(data)
    .map(([key, value]) => ({ name: titleise(key), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No anomalies detected yet</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 14, left: 4, bottom: 2 }}>
        <CartesianGrid {...grid} horizontal={false} />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axis} width={168} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip} cursor={{ fill: t.grid, fillOpacity: 0.4 }} />
        <Bar dataKey="value" name="Count" fill={t.series[0]} radius={[0, 4, 4, 0]} barSize={11} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DepartmentRiskChart({ data = [], height = 270 }) {
  const { t, axis, grid, tooltip, legend } = useChrome()
  const rows = data.map((row) => ({
    name: row.department,
    average: row.average_risk,
    high: row.high_risk_employees,
  }))
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No department data</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 4, right: 6, left: -20, bottom: 34 }}>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ ...axis, angle: -28, textAnchor: 'end' }}
          height={56}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltip} cursor={{ fill: t.grid, fillOpacity: 0.4 }} />
        <Legend {...legend} />
        <Bar dataKey="average" name="Average risk" fill={t.series[0]} radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="high" name="High-risk staff" fill={t.series[1]} radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HourlyHistogram({ data = [], height = 200 }) {
  const { t, axis, grid, tooltip } = useChrome()
  const rows = (data || []).map((value, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    value: Number((value * 100).toFixed(2)),
  }))
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No baseline histogram</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="hour" tick={{ ...axis, fontSize: 9 }} interval={2} axisLine={false} tickLine={false} />
        <YAxis tick={axis} unit="%" axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltip} cursor={{ fill: t.grid, fillOpacity: 0.4 }} formatter={(v) => [`${v}%`, 'Activity share']} />
        <Bar dataKey="value" fill={t.series[6]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PeerComparisonChart({ data = [], height = 290 }) {
  const { t, axis, grid, tooltip, legend } = useChrome()
  const rows = data.slice(0, 8).map((row) => ({
    name: titleise(row.feature),
    employee: row.employee_value,
    peers: row.peer_mean,
  }))
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No peer data available</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 14, left: 4, bottom: 2 }}>
        <CartesianGrid {...grid} horizontal={false} />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axis} width={150} axisLine={false} tickLine={false} />
        <Tooltip {...tooltip} cursor={{ fill: t.grid, fillOpacity: 0.4 }} />
        <Legend {...legend} />
        <Bar dataKey="employee" name="This employee" fill={t.series[1]} radius={[0, 3, 3, 0]} barSize={8} />
        <Bar dataKey="peers" name="Peer average" fill={t.series[0]} radius={[0, 3, 3, 0]} barSize={8} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RiskComponentChart({ components = {}, weights = {}, height = 250 }) {
  const { t, axis, grid, tooltip } = useChrome()
  const rows = Object.entries(components).map(([key, value], index) => ({
    name: titleise(key),
    score: Number(value) || 0,
    weight: `${Math.round((weights[key] || 0) * 100)}%`,
    color: t.series[index % t.series.length],
  }))
  if (!rows.length) return <p className="py-10 text-center text-2xs text-ink-muted">No risk breakdown</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 20, left: 4, bottom: 2 }}>
        <CartesianGrid {...grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axis} width={178} axisLine={false} tickLine={false} />
        <Tooltip
          {...tooltip}
          cursor={{ fill: t.grid, fillOpacity: 0.4 }}
          formatter={(value, _name, entry) => [`${value} / 100 · weight ${entry.payload.weight}`, 'Component']}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={13}>
          {rows.map((row) => (
            <Cell key={row.name} fill={row.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
