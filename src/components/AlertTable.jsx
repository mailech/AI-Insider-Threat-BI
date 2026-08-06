function AlertTable() {
  const alerts = [
    {
      id: "EMP001",
      name: "John Smith",
      threat: "Unauthorized Login",
      risk: "High",
      status: "Open",
    },
    {
      id: "EMP014",
      name: "Emily Davis",
      threat: "USB Device Connected",
      risk: "Medium",
      status: "Investigating",
    },
    {
      id: "EMP021",
      name: "Michael Brown",
      threat: "Large File Download",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "EMP035",
      name: "Sophia Wilson",
      threat: "Policy Violation",
      risk: "Low",
      status: "Resolved",
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
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-5">
        🚨 Recent Threat Alerts
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left">

          <thead className="text-gray-300 border-b border-slate-700">
            <tr>
              <th className="py-3">Employee ID</th>
              <th>Employee</th>
              <th>Threat</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className="border-b border-slate-700 hover:bg-slate-700 transition"
              >
                <td className="py-3 text-white">{alert.id}</td>

                <td className="text-white">
                  {alert.name}
                </td>

                <td className="text-gray-300">
                  {alert.threat}
                </td>

                <td className={riskColor(alert.risk)}>
                  {alert.risk}
                </td>

                <td className="text-cyan-400">
                  {alert.status}
                </td>

              </tr>
            ))}

          </tbody>

        </table>
      </div>
    </div>
  );
}

export default AlertTable;