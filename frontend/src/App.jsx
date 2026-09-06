import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'

import Login from './pages/Login'
import AnalystDashboard from './pages/AnalystDashboard'
import SocDashboard from './pages/SocDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Employees from './pages/Employees'
import Alerts from './pages/Alerts'
import Incidents from './pages/Incidents'

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

const ROLE_HOME = {
  security_analyst: '/analyst',
  soc_engineer: '/soc',
  security_manager: '/manager',
  administrator: '/admin',
}

function Home() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/analyst'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/analyst" element={<Protected><AnalystDashboard /></Protected>} />
        <Route path="/soc" element={<Protected><SocDashboard /></Protected>} />
        <Route path="/manager" element={<Protected><ManagerDashboard /></Protected>} />
        <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
        <Route path="/employees" element={<Protected><Employees /></Protected>} />
        <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
        <Route path="/incidents" element={<Protected><Incidents /></Protected>} />
      </Routes>
    </AuthProvider>
  )
}
