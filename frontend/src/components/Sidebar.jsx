import {
  FaChartLine,
  FaUsers,
  FaHistory,
  FaBrain,
  FaExclamationTriangle,
  FaShieldAlt,
  FaSearch,
  FaFileAlt,
  FaSignOutAlt,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: <FaChartLine size={14} />,
    path: "/dashboard",
  },
  {
    title: "Employee Profiles",
    icon: <FaUsers size={14} />,
    path: "/employees",
  },
  {
    title: "Activity Monitoring",
    icon: <FaHistory size={14} />,
    path: "/activities",
  },
  {
    title: "Behavior Analysis",
    icon: <FaBrain size={14} />,
    path: "/behavior",
  },
  {
    title: "Risk Scoring",
    icon: <FaShieldAlt size={14} />,
    path: "/risk",
  },
  {
    title: "Threat Investigation",
    icon: <FaSearch size={14} />,
    path: "/investigation",
  },
  {
    title: "Alerts",
    icon: <FaExclamationTriangle size={14} />,
    path: "/alerts",
  },
  {
    title: "Reports",
    icon: <FaFileAlt size={14} />,
    path: "/reports",
  },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">

        <div className="flex items-center gap-2.5">

          <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

            <FaShieldAlt
              size={15}
              className="text-cyan-400"
            />

          </div>

          <div>

            <h1 className="text-cyan-400 text-base font-bold">
              Insider Threat
            </h1>

            <p className="text-gray-500 text-[10px]">
              Behavioral Intelligence
            </p>

          </div>

        </div>

      </div>


      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5">

        <p className="text-gray-600 text-[9px] uppercase tracking-wider font-semibold px-2.5 mb-2">

          Security Operations

        </p>

        {menuItems.map((item) => (

          <NavLink
            key={item.title}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-200 text-xs ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "text-gray-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >

            <span className="w-4 h-4 flex items-center justify-center shrink-0">

              {item.icon}

            </span>

            <span className="truncate">

              {item.title}

            </span>

          </NavLink>

        ))}

      </nav>


      {/* System Status */}
      <div className="px-3 pb-2">

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-md px-2.5 py-2">

          <div className="flex items-center gap-2">

            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />

            <span className="text-gray-500 text-[10px]">
              System Operational
            </span>

          </div>

        </div>

      </div>


      {/* Logout */}
      <div className="p-2.5 border-t border-slate-800">

        <button
          type="button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
        >

          <FaSignOutAlt size={14} />

          <span>
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;