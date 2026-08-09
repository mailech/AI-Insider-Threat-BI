import { useFadeIn } from '@/hooks/useFadeIn';
import { PageHeader } from '@/components/dashboard/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { recentSecurityAlerts, topRiskEmployees } from '@/data/mockData';
import { severityConfig, statusConfig, riskLevelConfig } from '@/lib/alertConfig';

export function AlertsPage() {
  const ref = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Triage and manage security alerts across the organization"
      />
      <Card data-fade-in>
        <CardHeader>
          <CardTitle className="text-base">All Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSecurityAlerts.map((a) => {
                const sev = severityConfig[a.severity];
                const st = statusConfig[a.status];
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.id}
                    </TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      <Badge className={sev.className}>{sev.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st.className}>
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.employee}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.department}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.category}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function RiskScoresPage() {
  const ref = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className="space-y-6">
      <PageHeader
        title="Risk Scores"
        description="Behavioral risk scores across the monitored workforce"
      />
      <Card data-fade-in>
        <CardHeader>
          <CardTitle className="text-base">Top Risk Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Open Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topRiskEmployees.map((e) => {
                const lvl = riskLevelConfig[e.riskLevel];
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.department}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.role}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {e.riskScore}
                    </TableCell>
                    <TableCell>
                      <Badge className={lvl.className}>{lvl.label}</Badge>
                    </TableCell>
                    <TableCell>{e.openAlerts}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
