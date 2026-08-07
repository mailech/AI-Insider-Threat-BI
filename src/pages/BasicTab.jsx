import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function BasicTab() {
  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <div style={{ padding: "30px" }}>
          <h1>Basic React Tab</h1>
          <p>This is a basic React tab .</p>
        </div>
      </div>
    </div>
  );
}

export default BasicTab;