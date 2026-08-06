import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import ActivityLogs from "./pages/ActivityLogs";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

function App() {
  return (
    <Routes>
      {/* ================= Public Routes ================= */}

      <Route path="/" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ================= Dashboard ================= */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= Employees ================= */}

      <Route
        path="/employees"
        element={
          <RoleProtectedRoute allowedRoles={["Administrator"]}>
            <Employees />
          </RoleProtectedRoute>
        }
      />

      {/* ================= Activity Logs ================= */}

      <Route
        path="/activity"
        element={
          <RoleProtectedRoute
            allowedRoles={[
              "Administrator",
              "Security Analyst",
              "SOC Engineer",
            ]}
          >
            <ActivityLogs />
          </RoleProtectedRoute>
        }
      />

      {/* ================= Profile ================= */}

      <Route
        path="/profile"
        element={
          <RoleProtectedRoute
            allowedRoles={[
              "Administrator",
              "Security Analyst",
              "Security Manager",
            ]}
          >
            <Profile />
          </RoleProtectedRoute>
        }
      />

      {/* ================= 404 ================= */}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;