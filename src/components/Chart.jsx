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
  { month: "Jan", risk: 12 },
  { month: "Feb", risk: 18 },
  { month: "Mar", risk: 10 },
  { month: "Apr", risk: 25 },
  { month: "May", risk: 20 },
];

function Chart() {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        marginTop: "20px",
        borderRadius: "10px",
      }}
    >
      <h2>Risk Analysis</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="risk" fill="#6C63FF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Chart;