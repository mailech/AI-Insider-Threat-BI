
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Activity from "./pages/Activity";
import BehaviorAnalytics from "./pages/BehaviorAnalytics";
import AnomalyDetection from "./pages/AnomalyDetection";
import RiskScoring from "./pages/RiskScoring";
import UEBA from "./pages/UEBA";
import Alerts from "./pages/Alerts";
import Investigations from "./pages/Investigations";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import PoisoningAnalysis from "./pages/PoisoningAnalysis";

 const allRoles = [
  "security_analyst",
  "soc_engineer",
  "security_manager",
  "administrator",
];

function ProtectedLayout({ children, allowedRoles = allRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Main application */}
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedLayout>
              <Employees />
            </ProtectedLayout>
          }
        />

        <Route
          path="/activity"
          element={
            <ProtectedLayout>
              <Activity />
            </ProtectedLayout>
          }
        />

        <Route
          path="/behavior"
          element={
            <ProtectedLayout>
              <BehaviorAnalytics />
            </ProtectedLayout>
          }
        />

        <Route
          path="/anomalies"
          element={
            <ProtectedLayout>
              <AnomalyDetection />
            </ProtectedLayout>
          }
        />

        <Route
          path="/risk-scoring"
          element={
            <ProtectedLayout>
              <RiskScoring />
            </ProtectedLayout>
          }
        />

        <Route
          path="/ueba"
          element={
            <ProtectedLayout>
              <UEBA />
            </ProtectedLayout>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedLayout>
              <Alerts />
            </ProtectedLayout>
          }
        />

        <Route
          path="/investigations"
          element={
            <ProtectedLayout>
              <Investigations />
            </ProtectedLayout>
          }
        />

        <Route
          path="/reports"
          element={
                  <ProtectedLayout
  allowedRoles={[
    "security_analyst",
    "security_manager",
    "administrator",
  ]}
>        <Reports />
            </ProtectedLayout>
          }
        />

        <Route
          path="/settings"
          element={
               <ProtectedLayout
  allowedRoles={[
    "security_manager",
    "administrator",
  ]}
>
                          <Settings />
            </ProtectedLayout>
          }
        />

        {/* AI Security */}
        <Route
          path="/poisoning-analysis"
          element={
            <ProtectedLayout>
              <PoisoningAnalysis />
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;