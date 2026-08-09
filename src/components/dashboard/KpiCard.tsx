import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KpiStat } from '@/types';

interface KpiCardProps {
  stat: KpiStat;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'total-employees': UsersIcon,
  'active-alerts': BellIcon,
  'high-risk-employees': ShieldAlertIcon,
  'open-incidents': FolderOpenIcon,
};

import { Users, BellRing, ShieldAlert, FolderOpen } from 'lucide-react';

function UsersIcon({ className }: { className?: string }) {
  return <Users className={className} />;
}
function BellIcon({ className }: { className?: string }) {
  return <BellRing className={className} />;
}
function ShieldAlertIcon({ className }: { className?: string }) {
  return <ShieldAlert className={className} />;
}
function FolderOpenIcon({ className }: { className?: string }) {
  return <FolderOpen className={className} />;
}

const accentMap: Record<string, string> = {
  'total-employees': 'bg-primary/10 text-primary',
  'active-alerts': 'bg-warning/10 text-warning',
  'high-risk-employees': 'bg-orange-500/10 text-orange-400',
  'open-incidents': 'bg-destructive/10 text-destructive',
};

export function KpiCard({ stat }: KpiCardProps) {
  const Icon = iconMap[stat.id] ?? UsersIcon;
  const accent = accentMap[stat.id] ?? 'bg-primary/10 text-primary';
  const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="border-border/60" data-fade-in>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              accent
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              stat.trendIsGood ? 'text-success' : 'text-destructive'
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {stat.delta}%
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {stat.value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {stat.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
