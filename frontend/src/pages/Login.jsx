import { Link, useNavigate } from "react-router-dom";
import { FaUserShield } from "react-icons/fa";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Temporary role selection for Milestone 1
  const [role, setRole] = useState("Administrator");

  const handleLogin = (e) => {
    e.preventDefault();

    // Temporary login (Backend will replace this later)
    login({
      name: "Narendra Reddy",
      email: email,
      role: role,
      token: "dummy-jwt-token",
    });

    navigate("/dashboard");
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="login-header">
          <FaUserShield className="login-icon" />

          <h2>Insider Threat Behavioral Intelligence System</h2>

          <p>Secure Login</p>
        </div>

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Temporary Role Selection */}
          <div className="input-group">
            <label>Login As</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Administrator">
                Administrator
              </option>

              <option value="Security Analyst">
                Security Analyst
              </option>

              <option value="SOC Engineer">
                SOC Engineer
              </option>

              <option value="Security Manager">
                Security Manager
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="login-btn"
          >
            Login
          </button>

        </form>

        <p className="register-link">
          Don't have an account?
          <Link to="/register"> Register</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;