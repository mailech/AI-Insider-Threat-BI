import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import {
  CategoryBarChart,
  DepartmentRiskChart,
  EventsTimelineChart,
  RiskDistributionDonut,
  RiskTrendChart,
  SeverityDonut,
} from '../components/charts'
import {
  EmptyState,
  ErrorState,
  Loading,
  Panel,
  RiskBadge,
  SeverityBadge,
  StatRow,
  StatusPill,
} from '../components/ui'
import { fmtNumber, fmtTimeAgo, titleise } from '../utils/format'

function KpiRow({ kpis = [] }) {
  return <StatRow items={kpis} />
}

function RiskyEmployeeList({ rows = [] }) {
  if (!rows.length) return <EmptyState title="No risk scores yet" hint="Ingest activity and run detection." />
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.employee_id}>
          <Link to={`/employees/${row.employee_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-ink-secondary">
              {row.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink truncate">{row.full_name}</p>
              <p className="text-[11px] text-ink-muted truncate">
                {row.employee_code} · {row.department || 'Unassigned'} · {row.designation || '-'}
              </p>
            </div>
            <RiskBadge category={row.risk_category} score={row.risk_score} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function AlertList({ rows = [], empty = 'No open alerts' }) {
  if (!rows.length) return <EmptyState title={empty} hint="Detection has not raised anything actionable." />
  return (
    <ul className="divide-y divide-line max-h-[420px] overflow-y-auto">
      {rows.map((alert) => (
        <li key={alert.id} className="px-5 py-3 hover:bg-surface-hover">
          <div className="flex items-start gap-3">
            <SeverityBadge value={alert.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink leading-snug">{alert.title}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {alert.employee_name} · {alert.department || 'Unassigned'} · {fmtTimeAgo(alert.triggered_at)}
              </p>
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-[11px] text-ink-muted">P{alert.priority}</span>
              {alert.occurrence_count > 1 && (
                <span className="block text-[10px] text-sev-high">x{alert.occurrence_count}</span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function IncidentList({ rows = [] }) {
  if (!rows.length) return <EmptyState title="Investigation queue is clear" />
  return (
    <ul className="divide-y divide-line">
      {rows.map((incident) => (
        <li key={incident.id}>
          <Link to={`/investigations/${incident.id}`} className="block px-5 py-3 hover:bg-surface-hover">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] text-accent">{incident.reference}</span>
              <SeverityBadge value={incident.severity} />
              <StatusPill value={incident.status} />
              <span className="ml-auto text-[11px] text-ink-muted">{fmtNumber(incident.age_hours, 1)}h old</span>
            </div>
            <p className="text-sm text-ink truncate">{incident.title}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {incident.employee_name} · {incident.assignee_name ? `assigned to ${incident.assignee_name}` : 'unassigned'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function AnalystDashboard({ data }) {
  return (
    <div className="space-y-4">
      <KpiRow kpis={data.kpis} />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Open threat alerts" bodyClass="p-0" className="xl:col-span-2">
          <AlertList rows={data.open_alerts} />
        </Panel>
        <Panel title="Highest insider risk" bodyClass="p-0">
          <RiskyEmployeeList rows={data.top_risky_employees} />
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Investigation queue" bodyClass="p-0" className="xl:col-span-2">
          <IncidentList rows={data.investigation_queue} />
        </Panel>
        <Panel title="Anomalies by category">
          <CategoryBarChart data={data.anomalies_by_category} height={300} />
        </Panel>
      </div>
    </div>
  )
}

function SocDashboard({ data }) {
  return (
    <div className="space-y-4">
      <KpiRow kpis={data.kpis} />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Security events, anomalies and alerts (14 days)" className="xl:col-span-2">
          <EventsTimelineChart data={data.security_events_timeline} height={280} />
        </Panel>
        <Panel title="Alert severity mix">
          <SeverityDonut data={data.severity_breakdown} height={280} />
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Latest behavioural anomalies" bodyClass="p-0" className="xl:col-span-2">
          <div className="table-wrap max-h-[420px] overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Detected</th>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Severity</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.behavioral_anomalies.map((row) => (
                  <tr key={row.id}>
                    <td className="text-ink-muted whitespace-nowrap">{fmtTimeAgo(row.detected_at)}</td>
                    <td className="text-ink">{row.employee_name}</td>
                    <td className="text-ink-secondary">{titleise(row.category)}</td>
                    <td className="text-ink-muted text-xs">{titleise(row.detection_method)}</td>
                    <td><SeverityBadge value={row.severity} /></td>
                    <td className="text-right tabular-nums text-ink">{fmtNumber(row.score, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Active investigations" bodyClass="p-0">
            <IncidentList rows={data.active_investigations.slice(0, 6)} />
          </Panel>
          <Panel title="Detection metrics">
            <dl className="space-y-2.5 text-sm">
              {Object.entries(data.threat_intelligence.metrics || {})
                .filter(([, value]) => typeof value === 'number')
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-ink-muted">{titleise(key)}</dt>
                    <dd className="tabular-nums text-ink">{fmtNumber(value, 2)}</dd>
                  </div>
                ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function ManagerDashboard({ data }) {
  const posture = data.organizational_risk_posture || {}
  return (
    <div className="space-y-4">
      <KpiRow kpis={data.kpis} />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Organisational risk trend" className="xl:col-span-2">
          <RiskTrendChart data={data.risk_trends} height={280} />
        </Panel>
        <Panel title="Risk distribution">
          <RiskDistributionDonut data={posture.distribution || {}} height={280} />
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Risk by department" className="xl:col-span-2">
          <DepartmentRiskChart data={data.department_risk} height={300} />
        </Panel>
        <Panel title="Compliance metrics">
          <dl className="space-y-3 text-sm">
            {Object.entries(data.compliance_metrics || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{titleise(key)}</dt>
                <dd className="tabular-nums text-ink">
                  {typeof value === 'number' ? fmtNumber(value, 2) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Highest insider risk" bodyClass="p-0">
          <RiskyEmployeeList rows={data.insider_threat_summary?.top_risky_employees} />
        </Panel>
        <Panel title="Anomalies by category">
          <CategoryBarChart data={data.insider_threat_summary?.anomalies_by_category || {}} height={300} />
        </Panel>
      </div>
    </div>
  )
}

function AdminDashboard({ data }) {
  return (
    <div className="space-y-4">
      <KpiRow kpis={data.kpis} />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Platform analytics" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(data.platform_analytics || {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-line bg-surface-sunken p-3">
                <p className="text-[11px] uppercase tracking-wider text-ink-muted">{titleise(key)}</p>
                <p className="text-lg font-semibold text-ink tabular-nums mt-0.5">{fmtNumber(value)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="System health">
          <dl className="space-y-3 text-sm">
            {Object.entries(data.system_health || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{titleise(key)}</dt>
                <dd className="text-ink truncate max-w-[55%] text-right">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <Panel title="Users by role">
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(data.user_stats?.by_role || {}).map(([role, count]) => (
            <div key={role} className="rounded-lg border border-line bg-surface-sunken p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">{titleise(role)}</p>
              <p className="text-lg font-semibold text-ink tabular-nums mt-0.5">{count}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Recent audit trail" bodyClass="p-0">
        <div className="table-wrap max-h-[420px] overflow-y-auto">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_audit_logs || []).map((log) => (
                <tr key={log.id}>
                  <td className="text-ink-muted whitespace-nowrap">{fmtTimeAgo(log.created_at)}</td>
                  <td className="text-ink-secondary">{log.actor || 'system'}</td>
                  <td className="font-mono text-xs text-accent">{log.action}</td>
                  <td className="text-ink-muted text-xs">
                    {log.entity_type ? `${log.entity_type} ${log.entity_id ?? ''}` : '-'}
                  </td>
                  <td className="text-ink-muted text-xs max-w-xs truncate">{log.detail || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

const VIEWS = {
  security_analyst: { title: 'Security Analyst Dashboard', fetch: api.analystDashboard, render: AnalystDashboard },
  soc_engineer: { title: 'SOC Dashboard', fetch: api.socDashboard, render: SocDashboard },
  security_manager: { title: 'Security Manager Dashboard', fetch: api.managerDashboard, render: ManagerDashboard },
  administrator: { title: 'Administrator Dashboard', fetch: api.adminDashboard, render: AdminDashboard },
}

export default function Dashboard() {
  const { user, role, roleLabel } = useAuth()
  const view = VIEWS[role] || VIEWS.security_analyst
  const { data, loading, error, refetch } = useApi(() => view.fetch(), [role])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{view.title}</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Signed in as {user?.full_name} · {roleLabel}
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={refetch}>
          <Activity size={15} /> Refresh
        </button>
      </header>

      {loading && <Loading label="Loading dashboard" />}
      {error && !loading && <ErrorState message={error} onRetry={refetch} />}
      {data && !loading && !error && <view.render data={data} />}
    </div>
  )
}
