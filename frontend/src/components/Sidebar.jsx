import { NavLink, useNavigate } from "react-router-dom";

import {
  FaHome,
  FaUsers,
  FaClipboardList,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

import { useAuth } from "../context/AuthContext";

import "../styles/sidebar.css";

function Sidebar() {

  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (

    <div className="sidebar">

      <h2 className="logo">
        ITBIS
      </h2>

      {/* Dashboard - Everyone */}

      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        <FaHome />
        <span>Dashboard</span>
      </NavLink>

      {/* Administrator Only */}

      {user?.role === "Administrator" && (

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          <FaUsers />
          <span>Employees</span>
        </NavLink>

      )}

      {/* Administrator, Security Analyst, SOC Engineer */}

      {["Administrator", "Security Analyst", "SOC Engineer"].includes(user?.role) && (

        <NavLink
          to="/activity"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          <FaClipboardList />
          <span>Activity Logs</span>
        </NavLink>

      )}

      {/* Administrator, Security Analyst, Security Manager */}

      {["Administrator", "Security Analyst", "Security Manager"].includes(user?.role) && (

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "menu-item active" : "menu-item"
          }
        >
          <FaUser />
          <span>Profile</span>
        </NavLink>

      )}

      {/* Logout */}

      <div
        className="menu-item logout"
        onClick={handleLogout}
      >
        <FaSignOutAlt />
        <span>Logout</span>
      </div>

    </div>

  );

}

export default Sidebar;