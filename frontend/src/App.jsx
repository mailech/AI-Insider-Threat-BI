import { useState } from "react";
import SecurityAnalystDashboard from "./pages/SecurityAnalystDashboard.jsx";
import SOCDashboard from "./pages/SOCDashboard.jsx";
import SecurityManagerDashboard from "./pages/SecurityManagerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployeeManagementPage from "./pages/EmployeeManagementPage.jsx";
import ActivityMonitoringPage from "./pages/ActivityMonitoringPage.jsx";
import UEBAPage from "./pages/UEBAPage.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import ReportModal from "./components/reports/ReportModal.jsx";
import LoginModal from "./components/auth/LoginModal.jsx";
import { palette } from "./styles/theme.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("analyst");
  const [currentRole, setCurrentRole] = useState("Security Analyst");
  const [query, setQuery] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    if (newRole === "SOC Engineer") setActiveTab("soc");
    else if (newRole === "Security Manager") setActiveTab("manager");
    else if (newRole === "Administrator") setActiveTab("admin");
    else setActiveTab("analyst");
  };

  const handleAuthSuccess = (res) => {
    if (res?.role) {
      setCurrentRole(res.role);
    }
  };

  return (
    <div style={{ background: palette.void, minHeight: "100vh", color: palette.textPrimary }}>
      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          onOpenReport={() => setReportModalOpen(true)}
          onOpenAuth={() => setLoginModalOpen(true)}
        />

        <div className="flex-1 min-w-0">
          <TopBar
            query={query}
            onQueryChange={setQuery}
            onOpenReport={() => setReportModalOpen(true)}
            currentRole={currentRole}
            onOpenAuth={() => setLoginModalOpen(true)}
          />

          <main className="min-h-[calc(100vh-3.5rem)]">
            {activeTab === "analyst" && (
              <SecurityAnalystDashboard query={query} onOpenReport={() => setReportModalOpen(true)} />
            )}
            {activeTab === "soc" && <SOCDashboard />}
            {activeTab === "manager" && <SecurityManagerDashboard />}
            {activeTab === "admin" && <AdminDashboard />}
            {activeTab === "employees" && <EmployeeManagementPage />}
            {activeTab === "activity" && <ActivityMonitoringPage />}
            {activeTab === "ueba" && <UEBAPage />}
          </main>
        </div>
      </div>

      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onAuthSuccess={handleAuthSuccess} />
    </div>
  );
}
