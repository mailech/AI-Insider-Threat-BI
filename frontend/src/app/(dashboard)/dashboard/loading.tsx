export default function DashboardLoading() {
  return (
    <div className="w-full min-w-0 animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-5">
        <div className="skeleton h-6 w-56 mb-2 rounded" />
        <div className="skeleton h-4 w-72 max-w-full rounded" />
      </div>

      {/* KPI bar skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-4">
            <div className="skeleton w-9 h-9 rounded-lg mb-3" />
            <div className="skeleton h-3 w-28 mb-2" />
            <div className="skeleton h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-2 mb-5 border-b border-[var(--color-border-subtle)] pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-8 w-36 rounded" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--color-border-subtle)]">
          <div className="skeleton h-5 w-44 mb-1.5" />
          <div className="skeleton h-3.5 w-28" />
        </div>
        <div className="p-4 overflow-x-auto">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 py-2.5 border-b border-[var(--color-border-subtle)] last:border-0 min-w-[600px]">
              {[80, 120, 100, 70, 120, 80, 60].map((w, j) => (
                <div key={j} className="skeleton h-3.5 shrink-0" style={{ width: `${w}px` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
