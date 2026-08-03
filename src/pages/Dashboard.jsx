import DashboardCards from "../components/DashboardCards";
import RiskTable from "../components/RiskTable";
import Chart from "../components/Chart";
import SearchBar from "../components/SearchBar";
import UserInfo from "../components/UserInfo";

function Dashboard({ search, setSearch }) {
  return (
    <>
      <h2>Welcome Admin👋</h2>

      <SearchBar search={search} setSearch={setSearch} />

      <DashboardCards />

      <RiskTable search={search} />

      <Chart />

      <UserInfo />
    </>
  );
}

export default Dashboard;