import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { severityConfig, statusConfig } from '@/lib/alertConfig';
import { cn } from '@/lib/utils';
import type { SecurityAlert } from '@/types';

interface RecentAlertsCardProps {
  alerts: SecurityAlert[];
}

export function RecentAlertsCard({ alerts }: RecentAlertsCardProps) {
  return (
    <Card className="border-border/60 xl:col-span-1" data-fade-in>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Recent Security Alerts</CardTitle>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Last 24h
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        {alerts.map((alert) => {
          const sev = severityConfig[alert.severity];
          const st = statusConfig[alert.status];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/40"
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  sev.dot
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {alert.title}
                  </p>
                  <Badge className={cn('shrink-0 text-[10px]', sev.className)}>
                    {sev.label}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{alert.employee}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate">{alert.department}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-normal', st.className)}
                  >
                    {st.label}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
