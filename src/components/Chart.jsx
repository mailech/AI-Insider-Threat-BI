import { useEffect, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getDatasetRisk } from "../services/api";

function Chart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const token = localStorage.getItem("token");

        const result = await getDatasetRisk(token);

        console.log("Chart Dataset:", result);

        const users = result.users || [];

        /*
          Dataset mein 1000 users hain.
          Chart ko readable rakhne ke liye
          highest-risk 15 users show kar rahe hain.
        */

        const chartData = [...users]
          .sort(
            (a, b) =>
              (Number(b.anomaly_score) || 0) -
              (Number(a.anomaly_score) || 0)
          )
          .slice(0, 15)
          .map((user) => ({
            name: user.user,
            risk: Number(user.anomaly_score) || 0,
            threat: user.threat_level || "LOW",
          }));

        setData(chartData);

      } catch (error) {
        console.error(
          "Chart dataset API error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, []);

  const getBarColor = (level) => {
    if (level === "CRITICAL") {
      return "#ef4444";
    }

    if (level === "HIGH") {
      return "#f59e0b";
    }

    if (level === "MEDIUM") {
      return "#eab308";
    }

    return "#22c55e";
  };

  return (
    <div
      style={{
        marginTop: "25px",
        background: "rgba(18, 26, 43, 0.88)",
        border:
          "1px solid rgba(148, 163, 184, 0.13)",
        borderRadius: "14px",
        padding: "20px",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.22)",
      }}
    >

      {/* HEADER */}

      <div style={{ marginBottom: "15px" }}>

        <h2
          style={{
            margin: 0,
            fontSize: "18px",
            color: "#f5f7fb",
          }}
        >
          Top Behavioral Risk Analysis
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            color: "#8994a8",
            fontSize: "12px",
          }}
        >
          Highest anomaly scores from the behavioral dataset
        </p>

      </div>

      {/* LOADING */}

      {loading ? (

        <div
          style={{
            height: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8994a8",
            fontSize: "13px",
          }}
        >
          Loading behavioral analytics...
        </div>

      ) : data.length === 0 ? (

        /* EMPTY STATE */

        <div
          style={{
            height: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8994a8",
            fontSize: "13px",
          }}
        >
          No behavioral risk data available
        </div>

      ) : (

        /* CHART */

        <ResponsiveContainer
          width="100%"
          height={320}
        >

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
                fontSize: 10,
              }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={55}
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
              formatter={(value, name, props) => [
                Number(value).toFixed(2),
                "Anomaly Score",
              ]}
              labelFormatter={(label) => {
                const user = data.find(
                  (item) => item.name === label
                );

                return user
                  ? `${label} • ${user.threat}`
                  : label;
              }}
            />

            <Bar
              dataKey="risk"
              radius={[6, 6, 0, 0]}
              shape={(props) => {
                const {
                  x,
                  y,
                  width,
                  height,
                  payload,
                } = props;

                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    fill={getBarColor(
                      payload?.threat
                    )}
                  />
                );
              }}
            />

          </BarChart>

        </ResponsiveContainer>

      )}

    </div>
  );
}

export default Chart;