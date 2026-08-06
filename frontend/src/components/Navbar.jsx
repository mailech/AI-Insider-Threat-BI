import { FaBell, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

function Navbar() {

  const { user } = useAuth();

  return (
    <nav className="navbar">

      <div className="navbar-title">
        Insider Threat Behavioral Intelligence System
      </div>

      <div className="navbar-right">

        <FaBell className="nav-icon" />

        <div className="user-info">

          <FaUserCircle className="user-icon" />

          <div className="user-details">
            <span className="user-name">
              {user?.name || "Guest"}
            </span>

            <small className="user-role">
              {user?.role || "No Role"}
            </small>
          </div>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;