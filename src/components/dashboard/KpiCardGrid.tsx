import { KpiCard } from './KpiCard';
import type { KpiStat } from '@/types';

interface KpiCardGridProps {
  stats: KpiStat[];
}

export function KpiCardGrid({ stats }: KpiCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <KpiCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
