import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { name: "Unauthorized Access", value: 35 },
  { name: "Data Leakage", value: 25 },
  { name: "USB Usage", value: 20 },
  { name: "Policy Violation", value: 20 },
];

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#FACC15",
  "#22C55E",
];

function ThreatPieChart() {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">
        Threat Categories
      </h2>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ThreatPieChart;