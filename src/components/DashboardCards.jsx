function DashboardCards({
  totalUsers = 0,
  criticalUsers = 0,
  highUsers = 0,
  mediumUsers = 0,
  lowUsers = 0,
}) {
  const cards = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: "👥",
    },
    {
      title: "Critical Risk",
      value: criticalUsers,
      icon: "🔴",
    },
    {
      title: "High Risk",
      value: highUsers,
      icon: "🟠",
    },
    {
      title: "Medium Risk",
      value: mediumUsers,
      icon: "🟡",
    },
    {
      title: "Low Risk",
      value: lowUsers,
      icon: "🟢",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(170px, 1fr))",
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