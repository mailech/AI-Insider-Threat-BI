import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import ActivityLogs from "./pages/ActivityLogs";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/activity" element={<ActivityLogs />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default App;