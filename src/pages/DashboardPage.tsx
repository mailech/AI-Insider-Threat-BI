import { useFadeIn } from '@/hooks/useFadeIn';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { KpiCardGrid } from '@/components/dashboard/KpiCardGrid';
import { RiskTrendChart, DepartmentActivityChart } from '@/components/charts';
import { RecentAlertsCard } from '@/components/dashboard/RecentAlertsCard';
import { TopRiskEmployeesCard } from '@/components/dashboard/TopRiskEmployeesCard';
import {
  kpiStats,
  organizationRiskTrend,
  departmentActivity,
  recentSecurityAlerts,
  topRiskEmployees,
} from '@/data/mockData';

export function DashboardPage() {
  const ref = useFadeIn<HTMLDivElement>({ stagger: 0.06 });

  return (
    <div ref={ref} className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Organizational insider threat posture as of March 24, 2026"
      />

      <KpiCardGrid stats={kpiStats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RiskTrendChart data={organizationRiskTrend} />
        <DepartmentActivityChart data={departmentActivity} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RecentAlertsCard alerts={recentSecurityAlerts} />
        <TopRiskEmployeesCard employees={topRiskEmployees} />
      </div>
    </div>
  );
}
