
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Employees() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <div className="dashboard">
        <h1>Employees</h1>
        <p>Employee management page.</p>
      </div>
    </>
  );
}

export default Employees;