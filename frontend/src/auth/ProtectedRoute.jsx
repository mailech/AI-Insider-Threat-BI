import { Navigate, useLocation } from 'react-router-dom'

import Spinner from '../components/Spinner'
import { useAuth } from './AuthContext'

/** Route guard mirroring the backend's require_roles. This hides UI; the API
 *  still enforces the real boundary. */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Restoring session" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card mx-auto mt-16 max-w-lg text-center">
        <p className="text-lg font-semibold">Access denied</p>
        <p className="mt-2 text-sm text-ink-secondary">
          Your role does not have permission to view this page.
        </p>
      </div>
    )
  }

  return children
}
