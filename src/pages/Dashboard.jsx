import DashboardCards from "../components/DashboardCards";
import RiskTable from "../components/RiskTable";
import Chart from "../components/Chart";
import SearchBar from "../components/SearchBar";
import UserInfo from "../components/UserInfo";

function Dashboard({ search, setSearch }) {
  return (
    <div>
      <div style={{ marginBottom: "25px" }}>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "28px",
            color: "#f5f7fb",
          }}
        >
          Welcome Admin 👋
        </h1>

        <p
          style={{
            margin: 0,
            color: "#8994a8",
            fontSize: "14px",
          }}
        >
          Here's your security overview
        </p>
      </div>

      <SearchBar
        search={search}
        setSearch={setSearch}
      />

      <DashboardCards />

      <RiskTable search={search} />

      <Chart />

      <UserInfo />
    </div>
  );
}

export default Dashboard;