import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Reports() {
  const reports = [
    {
      id: "TR001",
      employee: "EMP001",
      threat: "Unauthorized Login",
      severity: "High",
      date: "06-Aug-2026",
      analyst: "Security Analyst",
      status: "Open",
    },
    {
      id: "TR002",
      employee: "EMP014",
      threat: "USB Device Connected",
      severity: "Medium",
      date: "06-Aug-2026",
      analyst: "SOC Analyst",
      status: "Investigating",
    },
    {
      id: "TR003",
      employee: "EMP021",
      threat: "Large File Download",
      severity: "Critical",
      date: "06-Aug-2026",
      analyst: "Cybersecurity Engineer",
      status: "Open",
    },
    {
      id: "TR004",
      employee: "EMP035",
      threat: "Policy Violation",
      severity: "Low",
      date: "07-Aug-2026",
      analyst: "Security Administrator",
      status: "Resolved",
    },
    {
      id: "TR005",
      employee: "EMP040",
      threat: "Data Exfiltration",
      severity: "Critical",
      date: "07-Aug-2026",
      analyst: "Incident Response Analyst",
      status: "Investigating",
    },
  ];

  const severityColor = (severity) => {
    switch (severity) {
      case "Critical":
        return "bg-red-700 text-white px-3 py-1 rounded-full";
      case "High":
        return "bg-red-500 text-white px-3 py-1 rounded-full";
      case "Medium":
        return "bg-yellow-500 text-black px-3 py-1 rounded-full";
      case "Low":
        return "bg-green-500 text-white px-3 py-1 rounded-full";
      default:
        return "";
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "Open":
        return "bg-red-600 text-white px-3 py-1 rounded-full";
      case "Investigating":
        return "bg-yellow-500 text-black px-3 py-1 rounded-full";
      case "Resolved":
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
            Threat Reports
          </h1>

          <p className="text-gray-400 mt-2 mb-6">
            Review detected insider threats and security incidents.
          </p>

          <input
            type="text"
            placeholder="🔍 Search Reports..."
            className="w-full md:w-96 p-3 rounded-lg bg-slate-800 text-white border border-slate-700 outline-none mb-6"
          />

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-700 text-gray-300">

                <tr>
                  <th className="py-3">Report ID</th>
                  <th>Employee</th>
                  <th>Threat</th>
                  <th>Severity</th>
                  <th>Date</th>
                  <th>Assigned Analyst</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>

                {reports.map((report) => (

                  <tr
                    key={report.id}
                    className="border-b border-slate-700 hover:bg-slate-700"
                  >

                    <td className="py-4 text-white">
                      {report.id}
                    </td>

                    <td className="text-white">
                      {report.employee}
                    </td>

                    <td className="text-gray-300">
                      {report.threat}
                    </td>

                    <td>
                      <span className={severityColor(report.severity)}>
                        {report.severity}
                      </span>
                    </td>

                    <td className="text-gray-300">
                      {report.date}
                    </td>

                    <td className="text-cyan-400">
                      {report.analyst}
                    </td>

                    <td>
                      <span className={statusColor(report.status)}>
                        {report.status}
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

export default Reports;