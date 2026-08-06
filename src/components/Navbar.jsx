import { Bell, Search, UserCircle } from "lucide-react";

function Navbar() {
  return (
    <div className="bg-slate-800 h-20 flex items-center justify-between px-8 border-b border-slate-700">

      {/* Left Section */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Dashboard
        </h2>
        <p className="text-gray-400 text-sm">
          Monitor internal threats and employee activities
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">

        {/* Search Box */}
        <div className="flex items-center bg-slate-700 rounded-lg px-3 py-2">
          <Search className="text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none text-white ml-2 placeholder-gray-400"
          />
        </div>

        {/* Notification */}
        <Bell className="text-white cursor-pointer hover:text-blue-400" />

        {/* User */}
        <div className="flex items-center gap-2">
          <UserCircle size={35} className="text-blue-400" />
          <div>
            <h3 className="text-white text-sm font-semibold">
              Security Analyst
            </h3>
            <p className="text-gray-400 text-xs">
              Administrator
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Navbar;