import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {
  const [role, setRole] = useState("Security Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
  e.preventDefault();

  const enteredEmail = email.trim().toLowerCase();
  const enteredPassword = password.trim();

  if (
    enteredEmail === "admin@company.com" &&
    enteredPassword === "admin123"
  ) {
    localStorage.setItem("isLoggedIn", "true");
    window.location.href="/";
  } else {
    alert("Invalid email or password");
  }
};

  return (
    <div className="login-page">

      {/* Background decoration */}
      <div className="glow glow-one"></div>
      <div className="glow glow-two"></div>

      <div className="login-container">

        {/* Left branding section */}
        <div className="login-brand">
          <div className="brand-logo">🛡</div>

          <h1>
            AI Insider
            <span>Threat Dashboard</span>
          </h1>

          <p>
            Intelligent security monitoring and behavioral
            risk detection for your organization.
          </p>

          <div className="security-status">
            <span className="status-dot"></span>
            Security systems operational
          </div>
        </div>

        {/* Login card */}
        <div className="login-card">

          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to access your security dashboard</p>
          </div>

          <form onSubmit={handleLogin}>

            <div className="input-group">
              <label>Email address</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e)=>
                    setEmail(e.target.value)
                }
                required
              />
            </div>

            <div className="input-group">
              <div className="label-row">
                <label>Password</label>
                <a href="#">Forgot password?</a>
              </div>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e)=>
                    setPassword(e.target.value)
                }
                required
              />
            </div>

            <div className="input-group">
              <label>Access role</label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option>Security Admin</option>
                <option>Security Analyst</option>
                <option>HR Manager</option>
              </select>
            </div>

            <button type="submit" className="login-button">
              Sign in
              <span>→</span>
            </button>

          </form>

          <div className="login-divider">
            <span>SECURE ACCESS</span>
          </div>

          <p className="login-footer">
            🔒 Protected by enterprise security controls
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;