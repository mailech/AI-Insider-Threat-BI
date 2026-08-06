import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Employees() {
  const employees = [
    {
      id: "EMP001",
      name: "John Smith",
      department: "IT Operations",
      designation: "Employee",
      risk: "Low",
      status: "Active",
    },
    {
      id: "EMP002",
      name: "Emily Davis",
      department: "Human Resources",
      designation: "HR Manager",
      risk: "Medium",
      status: "Active",
    },
    {
      id: "EMP003",
      name: "Michael Brown",
      department: "Security Operations Center",
      designation: "SOC Analyst",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "EMP004",
      name: "Sophia Wilson",
      department: "Finance",
      designation: "Department Manager",
      risk: "Low",
      status: "Active",
    },
    {
      id: "EMP005",
      name: "David Johnson",
      department: "Network Operations",
      designation: "Cybersecurity Engineer",
      risk: "Critical",
      status: "Suspended",
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
    <div className="flex bg-slate-900 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">

          <h1 className="text-3xl font-bold text-white">
            Employee Management
          </h1>

          <p className="text-gray-400 mt-2 mb-6">
            View employee details and monitor their security risk levels.
          </p>

          <input
            type="text"
            placeholder="🔍 Search Employee..."
            className="w-full md:w-80 p-3 rounded-lg bg-slate-800 text-white border border-slate-700 outline-none mb-6"
          />

          <div className="bg-slate-800 rounded-xl p-6 overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-700 text-gray-300">

                <tr>
                  <th className="py-3">Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Risk Level</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>

                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-slate-700 hover:bg-slate-700"
                  >
                    <td className="py-4 text-white">{emp.id}</td>
                    <td className="text-white">{emp.name}</td>
                    <td className="text-gray-300">{emp.department}</td>
                    <td className="text-gray-300">{emp.designation}</td>
                    <td className={riskColor(emp.risk)}>{emp.risk}</td>
                    <td className="text-cyan-400">{emp.status}</td>
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

export default Employees;