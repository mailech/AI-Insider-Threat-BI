import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeProfiles from "./pages/EmployeeProfiles";
import ActivityMonitoring from "./pages/ActivityMonitoring";

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

    </Routes>

  );

}


export default App;