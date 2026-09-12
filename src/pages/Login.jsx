
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, googleAuthorize } from "../api/endpoints";
import { storeTokens } from "../api/client";
import "../styles/Login.css";

const roles = [
  {
    value: "security_analyst",
    label: "Security Analyst",
  },
  {
    value: "soc_engineer",
    label: "SOC Engineer",
  },
  {
    value: "security_manager",
    label: "Security Manager",
  },
  {
    value: "administrator",
    label: "Administrator",
  },
];

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("security_analyst");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login(email, password);
      const data = response.data;

      storeTokens(data.access_token, data.refresh_token);

      /*
       * Keep the existing currentUser object because the current
       * frontend RBAC uses it. The role now comes from the backend.
       */
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          role: data.user.role,
          is_active: data.user.is_active,
          is_verified: data.user.is_verified,
          auth_provider: data.user.auth_provider,
        })
      );

      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to sign in. Please check your credentials and try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError("");

      const response = await googleAuthorize();
      const authorizationUrl = response.data.authorization_url;

      if (!authorizationUrl) {
        throw new Error("Google authorization URL was not returned.");
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Google authentication is not configured.";

      setError(message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🛡️</div>

          <h1>AI Insider Threat</h1>

          <p>
            Behavioral Intelligence & Security Monitoring
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="role">Role</label>

            <select
              id="role"
              value={selectedRole}
              onChange={(event) =>
                setSelectedRole(event.target.value)
              }
            >
              {roles.map((role) => (
                <option
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </button>

        <div className="login-footer">
          <span>Secure authentication powered by JWT</span>
        </div>
      </div>
    </div>
  );
}

export default Login;