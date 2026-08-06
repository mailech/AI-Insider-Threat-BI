function EmployeeTable() {
  const activities = [
    {
      id: "EMP001",
      name: "John Smith",
      activity: "File Download",
      time: "09:15 AM",
      risk: "High",
    },
    {
      id: "EMP014",
      name: "Emily Davis",
      activity: "USB Device Connected",
      time: "10:30 AM",
      risk: "Medium",
    },
    {
      id: "EMP021",
      name: "Michael Brown",
      activity: "Failed Login Attempts",
      time: "11:10 AM",
      risk: "Critical",
    },
    {
      id: "EMP035",
      name: "Sophia Wilson",
      activity: "Password Changed",
      time: "01:20 PM",
      risk: "Low",
    },
    {
      id: "EMP042",
      name: "David Johnson",
      activity: "Remote Login",
      time: "03:45 PM",
      risk: "Medium",
    },
  ];

  const riskColor = (risk) => {
    switch (risk) {
      case "Critical":
        return "text-red-600 font-bold";
      case "High":
        return "text-red-400 font-semibold";
      case "Medium":
        return "text-yellow-400 font-semibold";
      case "Low":
        return "text-green-400 font-semibold";
      default:
        return "text-white";
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-8">
      <h2 className="text-xl font-bold text-white mb-5">
        👥 Employee Activity Monitoring
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left">

          <thead className="border-b border-slate-700 text-gray-300">
            <tr>
              <th className="py-3">Employee ID</th>
              <th>Employee</th>
              <th>Activity</th>
              <th>Time</th>
              <th>Risk</th>
            </tr>
          </thead>

          <tbody>

            {activities.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-700 hover:bg-slate-700"
              >
                <td className="py-3 text-white">{item.id}</td>
                <td className="text-white">{item.name}</td>
                <td className="text-gray-300">{item.activity}</td>
                <td className="text-cyan-400">{item.time}</td>
                <td className={riskColor(item.risk)}>
                  {item.risk}
                </td>
              </tr>
            ))}

          </tbody>

        </table>
      </div>
    </div>
  );
}

export default EmployeeTable;