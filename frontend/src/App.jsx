import { useState } from "react";
import SecurityAnalystDashboard from "./pages/SecurityAnalystDashboard.jsx";
import SOCDashboard from "./pages/SOCDashboard.jsx";
import SecurityManagerDashboard from "./pages/SecurityManagerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployeeManagementPage from "./pages/EmployeeManagementPage.jsx";
import ActivityMonitoringPage from "./pages/ActivityMonitoringPage.jsx";
import UEBAPage from "./pages/UEBAPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    if (newRole === "SOC Engineer") setActiveTab("soc");
    else if (newRole === "Security Manager") setActiveTab("manager");
    else if (newRole === "Administrator") setActiveTab("admin");
    else setActiveTab("analyst");
  };

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // Close mobile sidebar after selecting a page
  };

  const handleAuthSuccess = (res) => {
    if (res?.role) {
      setCurrentRole(res.role);
    }
  };

  return (
    <div style={{ background: palette.void, color: palette.textPrimary }} className="h-screen w-screen overflow-hidden flex">
      {/* Fixed Left Sidebar Panel */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenAuth={() => { setLoginModalOpen(true); setSidebarOpen(false); }}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main Right Area: TopBar + Scrollable Center Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          onOpenReport={() => setReportModalOpen(true)}
          currentRole={currentRole}
          onOpenAuth={() => setLoginModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onSelectAlerts={() => setActiveTab("analyst")}
        />

        {/* Center Content - ONLY this area scrolls */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === "analyst" && (
            <SecurityAnalystDashboard query={query} onOpenReport={() => setReportModalOpen(true)} />
          )}
          {activeTab === "soc" && <SOCDashboard />}
          {activeTab === "manager" && <SecurityManagerDashboard />}
          {activeTab === "admin" && <AdminDashboard />}
          {activeTab === "employees" && <EmployeeManagementPage />}
          {activeTab === "activity" && <ActivityMonitoringPage />}
          {activeTab === "ueba" && <UEBAPage />}
          {activeTab === "reports" && <ReportsPage onOpenExportModal={() => setReportModalOpen(true)} />}
          {activeTab === "settings" && <SettingsPage currentRole={currentRole} />}
        </main>
      </div>

      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onAuthSuccess={handleAuthSuccess} />
    </div>
  );
}
