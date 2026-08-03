import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import{useState} from "react";
import {Routes,Route}from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";


function App() {
  const[search, setSearch]=useState("");
  return (
    <div style={{ display: "flex" ,
                  width:"100%",
                  minHeight:"100vh",
    }}>
      <Sidebar />

      <div
  style={{
    flex: 1,
    width: "100%",
    background: "#F5F7FA",
    minHeight: "100vh",
    padding: "20px",
    boxSizing: "border-box",
  }}
>
        <Navbar/>
        <div style={{padding:"20px"}}>
        <Routes>
  <Route
    path="/"
    element={
      <Dashboard
        search={search}
        setSearch={setSearch}
      />
    }
  />

  <Route path="/employees" element={<Employees />} />
  <Route path="/alerts" element={<Alerts />} />
  <Route path="/reports" element={<Reports />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
          
          
        </div>
      </div>
    </div>
  );
}

export default App;