
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Alerts() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <div className="dashboard">
        <h1>Alerts</h1>
        <p>Alerts management page.</p>
      </div>
    </>
  );
}

export default Alerts;