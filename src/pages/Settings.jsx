
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Settings() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <div className="dashboard">
        <h1>Settings</h1>
        <p>Settings Page</p>
      </div>
    </>
  );
}

export default Settings;