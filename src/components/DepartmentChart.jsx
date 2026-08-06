import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { department: "IT", threats: 12 },
  { department: "HR", threats: 5 },
  { department: "Finance", threats: 8 },
  { department: "Operations", threats: 10 },
  { department: "SOC", threats: 15 },
];

function DepartmentChart() {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">
        Threats by Department
      </h2>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="department" stroke="#CBD5E1" />
            <YAxis stroke="#CBD5E1" />
            <Tooltip />
            <Bar dataKey="threats" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DepartmentChart;