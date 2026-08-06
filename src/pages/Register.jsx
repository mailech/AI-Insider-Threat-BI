import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    alert("Registration Successful!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>

          <h1 className="text-3xl font-bold text-white">
            Employee Registration
          </h1>

          <p className="text-gray-400 mt-2">
            Internal Threat Detection System
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />

          <input
            type="text"
            placeholder="Employee ID"
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />

          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />

          <select
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select Designation</option>
            <option>Employee</option>
            <option>Team Lead</option>
            <option>Department Manager</option>
            <option>HR Manager</option>
            <option>Security Analyst</option>
            <option>SOC Analyst</option>
            <option>Cybersecurity Engineer</option>
            <option>Incident Response Analyst</option>
            <option>System Administrator</option>
            <option>Security Administrator</option>
          </select>

          <select
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select Department</option>
            <option>Security Operations Center (SOC)</option>
            <option>IT Operations</option>
            <option>Network Operations</option>
            <option>Human Resources</option>
            <option>Finance</option>
            <option>Research & Development</option>
            <option>Compliance & Risk</option>
          </select>

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition duration-300"
          >
            Register
          </button>

        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 font-semibold"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;