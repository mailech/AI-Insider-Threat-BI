import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function ProtectedLayout({ children }) {
  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: "#080d18",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          background: "#080d18",
        }}
      >
        <Navbar />

        <main
          style={{
            padding: "25px",
            minHeight: "calc(100vh - 70px)",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [search, setSearch] = useState("");

  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true";

  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* DASHBOARD */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard
              search={search}
              setSearch={setSearch}
            />
          </ProtectedLayout>
        }
      />

      {/* EMPLOYEES */}
      <Route
        path="/employees"
        element={
          <ProtectedLayout>
            <Employees />
          </ProtectedLayout>
        }
      />

      {/* ALERTS */}
      <Route
        path="/alerts"
        element={
          <ProtectedLayout>
            <Alerts />
          </ProtectedLayout>
        }
      />

      {/* REPORTS */}
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <Reports />
          </ProtectedLayout>
        }
      />

      {/* SETTINGS */}
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        }
      />

      {/* UNKNOWN URL */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

export default App;