import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import LineChart from "../components/LineChart";
import DepartmentChart from "../components/DepartmentChart";
import PieChart from "../components/PieChart";
import AlertTable from "../components/AlertTable";
import EmployeeTable from "../components/EmployeeTable";

function Dashboard() {
  return (
    <div className="flex bg-slate-900 min-h-screen">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1">

        {/* Navbar */}
        <Navbar />

        {/* Dashboard Body */}
        <div className="p-8">

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white">
              Welcome 👋
            </h1>

            <p className="text-gray-400 mt-2">
              Monitor employee activities, detect insider threats, and analyze security events in real time.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <StatCard
              title="Total Employees"
              value="1,250"
              color="text-blue-400"
            />

            <StatCard
              title="Active Threats"
              value="32"
              color="text-red-400"
            />

            <StatCard
              title="Critical Alerts"
              value="5"
              color="text-yellow-400"
            />

            <StatCard
              title="System Health"
              value="98%"
              color="text-green-400"
            />

          </div>

          {/* Line Chart + Department Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

            <LineChart />

            <DepartmentChart />

          </div>

          {/* Pie Chart + Alert Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

            <PieChart />

            <AlertTable />

          </div>

          {/* Employee Activity Table */}
          <div className="mt-8">

            <EmployeeTable />

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;