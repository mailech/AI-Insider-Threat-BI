import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await loginUser({
        email,
        password,
      });

      login();

      navigate("/dashboard");
    } catch (err) {
      setError(err.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">

      <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl p-8">

        <div className="text-center">

          <h1 className="text-4xl font-bold text-cyan-400">
            Insider Threat
          </h1>

          <h2 className="text-2xl font-semibold text-white mt-2">
            Behavioral Intelligence System
          </h2>

          <p className="text-gray-400 mt-4">
            Secure Security Operations Center
          </p>

        </div>

        <form
          className="mt-10 space-y-6"
          onSubmit={handleSubmit}
        >

          <div>

            <label className="block text-gray-300 mb-2">
              Email Address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              required
            />

          </div>

          <div>

            <label className="block text-gray-300 mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              required
            />

          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 transition rounded-lg py-3 text-lg font-semibold disabled:bg-gray-500"
          >
            {loading ? "Signing In..." : "Secure Login"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Login;