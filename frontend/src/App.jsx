import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Login } from './pages/Login';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { SocDashboard } from './pages/SocDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { SystemAdminPage } from './pages/SystemAdminPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { RiskScoringPage } from './pages/RiskScoringPage';
import { UebaPage } from './pages/UebaPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { InvestigationDetailPage } from './pages/InvestigationDetailPage';
import { ReportsPage } from './pages/ReportsPage';

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center text-cyan-400 font-mono text-sm">
        INITIALIZING SOC INTELLIGENCE SUBSYSTEMS...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Dashboards */}
          <Route path="/" element={<Navigate to="/analyst" replace />} />
          <Route path="/analyst" element={<ProtectedLayout><AnalystDashboard /></ProtectedLayout>} />
          <Route path="/soc" element={<ProtectedLayout><SocDashboard /></ProtectedLayout>} />
          <Route path="/manager" element={<ProtectedLayout><ManagerDashboard /></ProtectedLayout>} />
          <Route path="/admin-dash" element={<ProtectedLayout><SystemAdminPage /></ProtectedLayout>} />
          <Route path="/admin-control" element={<ProtectedLayout><SystemAdminPage /></ProtectedLayout>} />

          {/* Core Modules */}
          <Route path="/employees" element={<ProtectedLayout><EmployeesPage /></ProtectedLayout>} />
          <Route path="/employees/:id" element={<ProtectedLayout><EmployeeDetailPage /></ProtectedLayout>} />
          <Route path="/activities" element={<ProtectedLayout><ActivityPage /></ProtectedLayout>} />
          <Route path="/ueba" element={<ProtectedLayout><UebaPage /></ProtectedLayout>} />
          <Route path="/anomalies" element={<ProtectedLayout><AnomaliesPage /></ProtectedLayout>} />
          <Route path="/risk-scoring" element={<ProtectedLayout><RiskScoringPage /></ProtectedLayout>} />
          <Route path="/alerts" element={<ProtectedLayout><AlertsPage /></ProtectedLayout>} />
          <Route path="/incidents" element={<ProtectedLayout><IncidentsPage /></ProtectedLayout>} />
          <Route path="/investigations/:id" element={<ProtectedLayout><InvestigationDetailPage /></ProtectedLayout>} />
          <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/analyst" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
