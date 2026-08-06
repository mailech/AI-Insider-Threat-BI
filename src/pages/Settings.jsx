import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { User, Lock, Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Settings() {
  const navigate = useNavigate();

  return (
    <div className="flex bg-slate-900 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">

          <h1 className="text-3xl font-bold text-white">
            Settings
          </h1>

          <p className="text-gray-400 mt-2 mb-8">
            Manage your account and application preferences.
          </p>

          <div className="space-y-6">

            {/* Profile */}

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <User className="text-blue-400" />
                <h2 className="text-xl text-white font-semibold">
                  User Profile
                </h2>
              </div>

              <p className="text-gray-300">Name : Security Analyst</p>
              <p className="text-gray-300">Email : analyst@company.com</p>
              <p className="text-gray-300">Role : Administrator</p>
            </div>

            {/* Password */}

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-yellow-400" />
                <h2 className="text-xl text-white font-semibold">
                  Change Password
                </h2>
              </div>

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">
                Change Password
              </button>
            </div>

            {/* Notifications */}

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="text-green-400" />
                <h2 className="text-xl text-white font-semibold">
                  Notifications
                </h2>
              </div>

              <label className="flex items-center gap-3 text-white">
                <input type="checkbox" defaultChecked />
                Email Alerts
              </label>

              <label className="flex items-center gap-3 text-white mt-3">
                <input type="checkbox" defaultChecked />
                SMS Alerts
              </label>
            </div>

            {/* Logout */}

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">

              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
              >
                <LogOut />
                Logout
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Settings;