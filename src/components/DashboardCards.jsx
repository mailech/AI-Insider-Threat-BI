import employees from "../data/employees";

function DashboardCards() {
  const totalEmployees = employees.length;

  const highRiskUsers = employees.filter(
    (employee) => employee.risk >= 70
  ).length;

  const mediumRiskUsers = employees.filter(
    (employee) =>
      employee.risk >= 40 && employee.risk < 70
  ).length;

  const lowRiskUsers = employees.filter(
    (employee) => employee.risk < 40
  ).length;

  const averageRisk =
    totalEmployees > 0
      ? Math.round(
          employees.reduce(
            (total, employee) =>
              total + employee.risk,
            0
          ) / totalEmployees
        )
      : 0;

  const cards = [
    {
      title: "Total Employees",
      value: totalEmployees,
      icon: "👥",
    },
    {
      title: "High Risk Users",
      value: highRiskUsers,
      icon: "🔴",
    },
    {
      title: "Medium Risk",
      value: mediumRiskUsers,
      icon: "🟡",
    },
    {
      title: "Average Risk",
      value: `${averageRisk}%`,
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