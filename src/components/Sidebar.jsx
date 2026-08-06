import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      title: "Employees",
      icon: Users,
      path: "/employees",
    },
    {
      title: "Threat Reports",
      icon: FileText,
      path: "/reports",
    },
    {
      title: "Activity Logs",
      icon: Activity,
      path: "/activity",
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
    },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">

      {/* Logo */}

      <div className="p-6 border-b border-slate-700">

        <h1 className="text-2xl font-bold text-blue-400">
          🛡️ ITDS
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          Internal Threat Detection System
        </p>

      </div>

      {/* Navigation */}

      <div className="flex-1 mt-5">

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-4 transition duration-300

              ${
                location.pathname === item.path
                  ? "bg-blue-600"
                  : "hover:bg-slate-700"
              }`}
            >
              <Icon size={20} />

              <span>{item.title}</span>

            </Link>
          );
        })}

      </div>

      {/* Logout */}

      <div className="border-t border-slate-700 p-5">

        <button
          className="flex items-center gap-3 w-full hover:text-red-400 transition"
        >
          <LogOut size={20} />

          Logout

        </button>

      </div>

    </div>
  );
}

export default Sidebar;