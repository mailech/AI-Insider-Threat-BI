import employees from "../data/employees";

function Employees() {
    const cellStyle={
        border:"1px solid #ddd",
        padding:"12px",
        textAlign:"center",
    };
  return (
    <div>
      <h2>Employees</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "white",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>Department</th>
            <th style={cellStyle}>Risk</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td style={cellStyle}>{employee.name}</td>
                <td style={cellStyle}>{employee.department}</td>
                <td style={cellStyle}>{employee.risk}</td>
                <td style={cellStyle}>{employee.status}</td>

                <td style={cellStyle}>
                <button>Edit</button>{" "}
                <button>Delete</button>
                </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Employees;