import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { riskLevelConfig } from '@/lib/alertConfig';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RiskEmployee } from '@/types';

interface TopRiskEmployeesCardProps {
  employees: RiskEmployee[];
}

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColor = {
  up: 'text-destructive',
  down: 'text-success',
  flat: 'text-muted-foreground',
};

export function TopRiskEmployeesCard({ employees }: TopRiskEmployeesCardProps) {
  return (
    <Card
      className="border-border/60 xl:col-span-2"
      data-fade-in
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Top Risk Employees</CardTitle>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          By risk score
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[140px]">Risk Score</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Alerts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => {
              const lvl = riskLevelConfig[e.riskLevel];
              const TrendIcon = trendIcon[e.trend];
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {e.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.role}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.department}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={e.riskScore}
                        className={cn('h-1.5 w-16', lvl.bar)}
                      />
                      <span className="font-mono text-xs font-semibold">
                        {e.riskScore}
                      </span>
                      <TrendIcon
                        className={cn('h-3.5 w-3.5', trendColor[e.trend])}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={lvl.className}>{lvl.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {e.openAlerts}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
