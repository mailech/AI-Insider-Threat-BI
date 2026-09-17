export default function ReportsLoading() {
  return (
    <div className="animate-fade-in w-full min-w-0">
      <div className="skeleton h-7 w-56 mb-2" />
      <div className="skeleton h-4 w-80 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="skeleton h-24 rounded-lg" />
        <div className="skeleton h-24 rounded-lg" />
        <div className="skeleton h-24 rounded-lg" />
      </div>
    </div>
  );
}
