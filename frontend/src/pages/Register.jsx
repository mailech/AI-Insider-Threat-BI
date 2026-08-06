import { Link } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";
import "../styles/register.css";

function Register() {
  return (
    <div className="register-container">

      <div className="register-card">

        <div className="register-header">
          <FaUserPlus className="register-icon" />

          <h2>Create Account</h2>

          <p>Insider Threat Behavioral Intelligence System</p>
        </div>

        <form>

          <div className="input-group">
            <label>Full Name</label>

            <input
              type="text"
              placeholder="Enter full name"
            />
          </div>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter email"
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Confirm password"
            />
          </div>

          <div className="input-group">
            <label>Select Role</label>

            <select>

              <option>Administrator</option>

              <option>Security Analyst</option>

              <option>SOC Engineer</option>

              <option>Security Manager</option>

            </select>
          </div>

          <button className="register-btn">
            Register
          </button>

        </form>

        <p className="login-link">
          Already have an account?
          <Link to="/"> Login</Link>
        </p>

      </div>

    </div>
  );
}

export default Register;