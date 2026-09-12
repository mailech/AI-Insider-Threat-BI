import { useEffect, useState } from "react";
import { getEmployees, getEmployeeRisk } from "../services/api";

function DashboardCards() {
  const [employees, setEmployees] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Token exixts:",!!token);
        console.log("Token Length:",token?token.length:0);

        // Get employees from PostgreSQL
        const employeeData = await getEmployees(token);
        setEmployees(employeeData);
        console.log("Employees from backend:",employeeData);

        // Get risk data for every employee
        const risks = await Promise.all(
          employeeData.map((employee) =>
            getEmployeeRisk(employee.employee_id, token)
          )
        );

        setRiskData(risks);
      } catch (error) {
        console.error("Dashboard API error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const totalEmployees = employees.length;

  const highRiskUsers = riskData.filter(
    (employee) => employee.threat_level === "HIGH"
  ).length;

  const criticalRiskUsers = riskData.filter(
    (employee) => employee.threat_level === "CRITICAL"
  ).length;

  const mediumRiskUsers = riskData.filter(
    (employee) => employee.threat_level === "MEDIUM"
  ).length;

  const averageRisk =
    riskData.length > 0
      ? Math.round(
          riskData.reduce(
            (total, employee) => total + employee.threat_score,
            0
          ) / riskData.length
        )
      : 0;

  const cards = [
    {
      title: "Total Employees",
      value: loading ? "..." : totalEmployees,
      icon: "👥",
    },
    {
      title: "High Risk Users",
      value: loading ? "..." : highRiskUsers + criticalRiskUsers,
      icon: "🔴",
    },
    {
      title: "Medium Risk",
      value: loading ? "..." : mediumRiskUsers,
      icon: "🟡",
    },
    {
      title: "Average Risk",
      value: loading ? "..." : `${averageRisk}%`,
      icon: "📊",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "15px",
        marginTop: "20px",
        marginBottom: "25px",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: "rgba(18, 26, 43, 0.88)",
            border:
              "1px solid rgba(148, 163, 184, 0.13)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "#8994a8",
                fontSize: "12px",
              }}
            >
              {card.title}
            </span>

            <span style={{ fontSize: "18px" }}>
              {card.icon}
            </span>
          </div>

          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "28px",
              color: "#f5f7fb",
            }}
          >
            {card.value}
          </h2>
        </div>
      ))}
    </div>
  );
}

export default DashboardCards;