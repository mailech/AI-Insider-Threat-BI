import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/dashboardLayout.css";

function DashboardLayout({ children }) {
  return (
    <div className="layout">

      <Sidebar />

      <div className="main-section">

        <Navbar />

        <div className="page-content">
          {children}
        </div>

      </div>

    </div>
  );
}

export default DashboardLayout;