import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function ActivityLogs() {
  const logs = [
    {
      time: "09:10 AM",
      employee: "EMP001",
      activity: "Successful Login",
      device: "Windows Laptop",
      ip: "192.168.1.10",
      status: "Success",
    },
    {
      time: "09:45 AM",
      employee: "EMP014",
      activity: "USB Device Connected",
      device: "Desktop",
      ip: "192.168.1.15",
      status: "Logged",
    },
    {
      time: "10:20 AM",
      employee: "EMP021",
      activity: "Large File Download",
      device: "Windows Laptop",
      ip: "192.168.1.20",
      status: "Alert",
    },
    {
      time: "11:15 AM",
      employee: "EMP035",
      activity: "Password Changed",
      device: "MacBook",
      ip: "192.168.1.25",
      status: "Success",
    },
    {
      time: "12:40 PM",
      employee: "EMP040",
      activity: "Remote VPN Login",
      device: "Linux Workstation",
      ip: "192.168.1.30",
      status: "Logged",
    },
  ];

  const statusColor = (status) => {
    switch (status) {
      case "Alert":
        return "bg-red-600 text-white px-3 py-1 rounded-full";
      case "Logged":
        return "bg-yellow-500 text-black px-3 py-1 rounded-full";
      case "Success":
        return "bg-green-600 text-white px-3 py-1 rounded-full";
      default:
        return "";
    }
  };

  return (
    <div className="flex bg-slate-900 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">

          <h1 className="text-3xl font-bold text-white">
            Activity Logs
          </h1>

          <p className="text-gray-400 mt-2 mb-6">
            Monitor employee activities and system events.
          </p>

          <input
            type="text"
            placeholder="🔍 Search Activity..."
            className="w-full md:w-96 p-3 rounded-lg bg-slate-800 text-white border border-slate-700 outline-none mb-6"
          />

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-700 text-gray-300">
                <tr>
                  <th className="py-3">Time</th>
                  <th>Employee</th>
                  <th>Activity</th>
                  <th>Device</th>
                  <th>IP Address</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {logs.map((log, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-700 hover:bg-slate-700"
                  >
                    <td className="py-4 text-white">{log.time}</td>
                    <td className="text-white">{log.employee}</td>
                    <td className="text-gray-300">{log.activity}</td>
                    <td className="text-gray-300">{log.device}</td>
                    <td className="text-cyan-400">{log.ip}</td>
                    <td>
                      <span className={statusColor(log.status)}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>
      </div>
    </div>
  );
}

export default ActivityLogs;