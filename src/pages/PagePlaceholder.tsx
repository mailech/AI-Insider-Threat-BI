import { Card, CardContent } from '@/components/ui/card';

export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This module is part of the Sentinel AI platform and is under construction.
        </p>
      </div>
      <Card className="border-dashed border-border/60">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Content for {title} will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
