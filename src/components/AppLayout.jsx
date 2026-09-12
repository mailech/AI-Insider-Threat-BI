
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../styles/AppLayout.css";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <Navbar />

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;