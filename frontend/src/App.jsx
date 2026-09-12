import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import { Loading } from './components/ui'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Anomalies from './pages/Anomalies'
import Investigations from './pages/Investigations'
import InvestigationDetail from './pages/InvestigationDetail'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import ActivityMonitor from './pages/ActivityMonitor'
import Ueba from './pages/Ueba'
import BehaviourAnalytics from './pages/BehaviourAnalytics'
import Reports from './pages/Reports'
import Administration from './pages/Administration'
import SettingsPage from './pages/Settings'
import NotFound from './pages/NotFound'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading label="Restoring session" className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * Route-level role guard. The sidebar hides what a role cannot use, but the
 * routes enforce it too so typing a URL does not get around it.
 */
function RequireRole({ roles, children }) {
  const { role } = useAuth()
  if (!roles.includes(role)) return <Navigate to="/" replace />
  return children
}

const TRIAGE = ['security_analyst', 'soc_engineer', 'administrator']
const ENGINE = ['soc_engineer', 'security_manager', 'administrator']

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="/alerts"
          element={
            <RequireRole roles={TRIAGE}>
              <Alerts />
            </RequireRole>
          }
        />
        <Route
          path="/anomalies"
          element={
            <RequireRole roles={TRIAGE}>
              <Anomalies />
            </RequireRole>
          }
        />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/investigations/:id" element={<InvestigationDetail />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route
          path="/activity"
          element={
            <RequireRole roles={TRIAGE}>
              <ActivityMonitor />
            </RequireRole>
          }
        />
        <Route path="/ueba" element={<Ueba />} />
        <Route
          path="/analytics"
          element={
            <RequireRole roles={ENGINE}>
              <BehaviourAnalytics />
            </RequireRole>
          }
        />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['administrator']}>
              <Administration />
            </RequireRole>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
