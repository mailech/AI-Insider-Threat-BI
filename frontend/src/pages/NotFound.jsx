import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Compass size={32} className="text-ink-faint" />
      <h1 className="text-lg font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">That route does not exist in the console.</p>
      <Link to="/" className="btn-primary mt-2">Back to dashboard</Link>
    </div>
  )
}
