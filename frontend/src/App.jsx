import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeProfiles from "./pages/EmployeeProfiles";
import ActivityMonitoring from "./pages/ActivityMonitoring";
import BehaviorAnalysis from "./pages/BehaviorAnalysis";
import RiskScoring from "./pages/RiskScoring";
import Investigation from "./pages/Investigation";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";

import ProtectedRoute from "./components/ProtectedRoute";


function App() {

  return (

    <Routes>

      {/* =====================================================
          PUBLIC ROUTE
      ====================================================== */}

      <Route
        path="/"
        element={<Login />}
      />


      {/* =====================================================
          DASHBOARD
      ====================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          EMPLOYEE PROFILES
      ====================================================== */}

      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <EmployeeProfiles />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          ACTIVITY MONITORING
      ====================================================== */}

      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <ActivityMonitoring />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          BEHAVIOR ANALYSIS
      ====================================================== */}

      <Route
        path="/behavior"
        element={
          <ProtectedRoute>
            <BehaviorAnalysis />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          RISK SCORING
      ====================================================== */}

      <Route
        path="/risk"
        element={
          <ProtectedRoute>
            <RiskScoring />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          THREAT INVESTIGATION
      ====================================================== */}

      <Route
        path="/investigation"
        element={
          <ProtectedRoute>
            <Investigation />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          ALERTS
      ====================================================== */}

      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          REPORTS
      ====================================================== */}

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

    </Routes>

  );

}


export default App;