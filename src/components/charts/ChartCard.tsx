import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('border-border/60', className)} data-fade-in>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-xs">{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('pl-2 pr-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
