export default function DashboardLoading() {
  return (
    <div className="max-w-[1400px] w-full mx-auto animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="skeleton h-6 w-56 mb-2 rounded" />
        <div className="skeleton h-4 w-72 max-w-full rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5">
            <div className="skeleton w-10 h-10 rounded-lg mb-3.5" />
            <div className="skeleton h-3 w-24 mb-2" />
            <div className="skeleton h-8 w-20 mb-2" />
            <div className="skeleton h-3 w-36" />
          </div>
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
