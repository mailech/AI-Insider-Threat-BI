import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { day: "Mon", threats: 5 },
  { day: "Tue", threats: 8 },
  { day: "Wed", threats: 6 },
  { day: "Thu", threats: 12 },
  { day: "Fri", threats: 10 },
  { day: "Sat", threats: 7 },
  { day: "Sun", threats: 4 },
];

function ThreatLineChart() {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">
        Threat Trend (Last 7 Days)
      </h2>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#CBD5E1" />
            <YAxis stroke="#CBD5E1" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="threats"
              stroke="#3B82F6"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ThreatLineChart;