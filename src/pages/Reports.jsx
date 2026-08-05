
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Reports() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <div className="dashboard">
        <h1>Reports</h1>
        <p>Reports management page.</p>
      </div>
    </>
  );
}

export default Reports;