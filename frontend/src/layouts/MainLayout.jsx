import Sidebar from "../components/Sidebar";

function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-950">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar will come here */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>

    </div>
  );
}

export default MainLayout;