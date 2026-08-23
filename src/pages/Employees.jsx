import { useState } from "react";
import employeesData from "../data/employees";

function Employees() {
  const [employees, setEmployees] = useState(() => {
    const savedEmployees = localStorage.getItem("employees");

    return savedEmployees
      ? JSON.parse(savedEmployees)
      : employeesData;
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Save employees to state + localStorage
  const saveEmployees = (updatedEmployees) => {
    setEmployees(updatedEmployees);

    localStorage.setItem(
      "employees",
      JSON.stringify(updatedEmployees)
    );
  };

  // Search + filter
  const filteredEmployees = employees.filter((employee) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      employee.name.toLowerCase().includes(searchText) ||
      employee.department.toLowerCase().includes(searchText);

    const matchesFilter =
      filter === "All" || employee.status === filter;

    return matchesSearch && matchesFilter;
  });

  // Delete
  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?"
    );

    if (confirmDelete) {
      const updatedEmployees = employees.filter(
        (employee) => employee.id !== id
      );

      saveEmployees(updatedEmployees);
    }
  };

  // Save Add/Edit
  const handleSave = () => {
    if (
      !editingEmployee.name.trim() ||
      !editingEmployee.department.trim()
    ) {
      window.alert("Please fill all required fields.");
      return;
    }

    let updatedEmployees;

    if (editingEmployee.isNew) {
      const newEmployee = {
        id: Date.now(),
        name: editingEmployee.name,
        department: editingEmployee.department,
        risk: editingEmployee.risk,
        status: editingEmployee.status,
      };

      updatedEmployees = [
        ...employees,
        newEmployee,
      ];
    } else {
      updatedEmployees = employees.map((employee) =>
        employee.id === editingEmployee.id
          ? editingEmployee
          : employee
      );
    }

    saveEmployees(updatedEmployees);
    setEditingEmployee(null);
  };

  // Risk badge
  const getRiskStyle = (status) => {
    if (status === "High") {
      return {
        color: "#ef4444",
        background: "rgba(239, 68, 68, 0.12)",
      };
    }

    if (status === "Medium") {
      return {
        color: "#f59e0b",
        background: "rgba(245, 158, 11, 0.12)",
      };
    }

    return {
      color: "#22c55e",
      background: "rgba(34, 197, 94, 0.12)",
    };
  };

  return (
    <div
      style={{
        width: "100%",
        color: "#f5f7fb",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: "28px",
            }}
          >
            Employees
          </h1>

          <p
            style={{
              margin: 0,
              color: "#8994a8",
              fontSize: "14px",
            }}
          >
            Monitor employee activity and risk levels
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditingEmployee({
              id: Date.now(),
              name: "",
              department: "",
              risk: 0,
              status: "Low",
              isNew: true,
            })
          }
          style={{
            padding: "11px 18px",
            border: "none",
            borderRadius: "8px",
            background:
              "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "white",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow:
              "0 8px 20px rgba(37, 99, 235, 0.25)",
          }}
        >
          + Add Employee
        </button>
      </div>

      {/* SEARCH + FILTER */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search employee or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            height: "45px",
            padding: "0 14px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            outline: "none",
            fontSize: "13px",
          }}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            height: "45px",
            padding: "0 14px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "8px",
            color: "#f5f7fb",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="All">All Risk Levels</option>
          <option value="High">High Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="Low">Low Risk</option>
        </select>
      </div>

      {/* TABLE */}
      <div
        style={{
          background: "rgba(18, 26, 43, 0.88)",
          border:
            "1px solid rgba(148, 163, 184, 0.13)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow:
            "0 15px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #273449",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            Employee Risk Overview
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#8994a8",
              fontSize: "12px",
            }}
          >
            {filteredEmployees.length} employees found
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={headerStyle}>Name</th>
                <th style={headerStyle}>Department</th>
                <th style={headerStyle}>Risk Score</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td style={cellStyle}>
                      {employee.name}
                    </td>

                    <td style={cellStyle}>
                      {employee.department}
                    </td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          fontWeight: "600",
                          color:
                            employee.risk >= 70
                              ? "#ef4444"
                              : employee.risk >= 40
                              ? "#f59e0b"
                              : "#22c55e",
                        }}
                      >
                        {employee.risk}
                      </span>
                    </td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          ...getRiskStyle(employee.status),
                          padding: "6px 10px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        {employee.status}
                      </span>
                    </td>

                    <td style={cellStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingEmployee({
                            ...employee,
                          })
                        }
                        style={editButtonStyle}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(employee.id)
                        }
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#8994a8",
                    }}
                  >
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {editingEmployee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "450px",
              background: "#121A2B",
              border:
                "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "15px",
              padding: "25px",
              boxShadow:
                "0 25px 70px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                margin: "0 0 5px",
                fontSize: "21px",
              }}
            >
              {editingEmployee.isNew
                ? "Add Employee"
                : "Edit Employee"}
            </h2>

            <p
              style={{
                margin: "0 0 25px",
                color: "#8994a8",
                fontSize: "12px",
              }}
            >
              {editingEmployee.isNew
                ? "Add a new employee to the security monitoring system."
                : "Update employee risk information"}
            </p>

            <label style={labelStyle}>
              Employee Name
            </label>

            <input
              value={editingEmployee.name}
              onChange={(e) =>
                setEditingEmployee({
                  ...editingEmployee,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

            <label style={labelStyle}>
              Department
            </label>

            <input
              value={editingEmployee.department}
              onChange={(e) =>
                setEditingEmployee({
                  ...editingEmployee,
                  department: e.target.value,
                })
              }
              style={inputStyle}
            />

            <label style={labelStyle}>
              Risk Score
            </label>

            <input
              type="number"
              min="0"
              max="100"
              value={editingEmployee.risk}
              onChange={(e) => {
                const risk = Number(e.target.value);

                let status = "Low";

                if (risk >= 70) {
                  status = "High";
                } else if (risk >= 40) {
                  status = "Medium";
                }

                setEditingEmployee({
                  ...editingEmployee,
                  risk,
                  status,
                });
              }}
              style={inputStyle}
            />

            <label style={labelStyle}>
              Status
            </label>

            <select
              value={editingEmployee.status}
              onChange={(e) =>
                setEditingEmployee({
                  ...editingEmployee,
                  status: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setEditingEmployee(null)
                }
                style={cancelButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                style={saveButtonStyle}
              >
                {editingEmployee.isNew
                  ? "Add Employee"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const headerStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#8994a8",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  background: "#0D1524",
  borderBottom: "1px solid #273449",
};

const cellStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#f5f7fb",
  fontSize: "13px",
  borderBottom:
    "1px solid rgba(39, 52, 73, 0.7)",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "12px",
  fontWeight: "600",
};

const inputStyle = {
  width: "100%",
  height: "44px",
  padding: "0 12px",
  marginBottom: "17px",
  background: "#0D1524",
  border: "1px solid #273449",
  borderRadius: "8px",
  color: "#f5f7fb",
  outline: "none",
  fontSize: "13px",
};

const editButtonStyle = {
  padding: "7px 12px",
  marginRight: "8px",
  border: "1px solid #2563eb",
  borderRadius: "6px",
  background: "rgba(37, 99, 235, 0.1)",
  color: "#60a5fa",
  cursor: "pointer",
};

const deleteButtonStyle = {
  padding: "7px 12px",
  border: "1px solid #ef4444",
  borderRadius: "6px",
  background: "rgba(239, 68, 68, 0.1)",
  color: "#f87171",
  cursor: "pointer",
};

const cancelButtonStyle = {
  padding: "9px 16px",
  border: "1px solid #273449",
  borderRadius: "7px",
  background: "#0D1524",
  color: "#8994a8",
  cursor: "pointer",
};

const saveButtonStyle = {
  padding: "9px 16px",
  border: "none",
  borderRadius: "7px",
  background:
    "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
};

export default Employees;