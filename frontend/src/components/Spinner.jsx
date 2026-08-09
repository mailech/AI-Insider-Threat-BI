export default function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-secondary" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-accent" />
      {label}
    </div>
  )
}
