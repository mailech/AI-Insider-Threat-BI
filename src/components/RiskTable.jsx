import employees from "../data/employees";
function RiskTable({search}) {
    const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    employee.department.toLowerCase().includes(search.toLowerCase()) ||
    employee.status.toLowerCase().includes(search.toLowerCase())
  );

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "30px",
    background: "white",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  const cellStyle = {
    border: "1px solid #ddd",
    padding: "12px",
    textAlign: "left",
  };

  return (
    <div>
      <h2>Risk Activity</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>Employee</th>
            <th style={cellStyle}>Department</th>
            <th style={cellStyle}>Risk Score</th>
            <th style={cellStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
  {filteredEmployees.map((employee) => (
    <tr key={employee.id}>
      <td style={cellStyle}>{employee.name}</td>
      <td style={cellStyle}>{employee.department}</td>
      <td style={cellStyle}>{employee.risk}</td>
      <td style={cellStyle}>{employee.status}</td>
    </tr>
  ))}
</tbody>
        
      </table>
    </div>
  );
}

export default RiskTable;