import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import employees from "../data/employees";

function Chart() {
  const data = employees.map((employee) => ({
    name: employee.name,
    risk: employee.risk,
  }));

  return (
    <div
      style={{
        marginTop: "25px",
        background: "rgba(18, 26, 43, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        padding: "20px",
        boxShadow: "0 15px 40px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ marginBottom: "15px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
            color: "#f5f7fb",
          }}
        >
          Employee Risk Analysis
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            color: "#8994a8",
            fontSize: "12px",
          }}
        >
          Current risk score of monitored employees
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: 0,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#273449"
          />

          <XAxis
            dataKey="name"
            stroke="#8994a8"
            tick={{
              fill: "#8994a8",
              fontSize: 12,
            }}
          />

          <YAxis
            domain={[0, 100]}
            stroke="#8994a8"
            tick={{
              fill: "#8994a8",
              fontSize: 11,
            }}
          />

          <Tooltip
            contentStyle={{
              background: "#121A2B",
              border: "1px solid #273449",
              borderRadius: "8px",
              color: "#f5f7fb",
            }}
            labelStyle={{
              color: "#f5f7fb",
            }}
            itemStyle={{
              color: "#60a5fa",
            }}
          />

          <Bar
            dataKey="risk"
            fill="#4f46e5"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Chart;