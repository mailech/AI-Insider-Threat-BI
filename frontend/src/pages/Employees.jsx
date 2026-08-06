import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";
import EmployeeModal from "../components/EmployeeModal";
import "../styles/employees.css";

function Employees() {

  const [showModal, setShowModal] = useState(false);

  const employees = [
    {
      id: "EMP101",
      name: "John Smith",
      department: "IT",
      designation: "Software Engineer",
      manager: "Alice Johnson",
      device: "Dell Latitude",
      access: "Admin",
    },
    {
      id: "EMP102",
      name: "Emily Davis",
      department: "Finance",
      designation: "Accountant",
      manager: "Michael Brown",
      device: "HP EliteBook",
      access: "User",
    },
    {
      id: "EMP103",
      name: "Robert Wilson",
      department: "HR",
      designation: "HR Executive",
      manager: "Sarah Lee",
      device: "Lenovo ThinkPad",
      access: "Manager",
    },
  ];

  return (
    <DashboardLayout>

      <div className="employee-header">

        <div>
          <h1>Employee Management</h1>
          <p>Manage employee identities and access privileges.</p>
        </div>

        <button
          className="add-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Employee
        </button>

      </div>

      <div className="employee-toolbar">

        <input
          type="text"
          placeholder="Search employee..."
        />

      </div>

      <div className="employee-table">

        <table>

          <thead>

            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Manager</th>
              <th>Device</th>
              <th>Access</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {employees.map((emp) => (

              <tr key={emp.id}>

                <td>{emp.id}</td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td>{emp.designation}</td>
                <td>{emp.manager}</td>
                <td>{emp.device}</td>
                <td>{emp.access}</td>

                <td>

                  <button className="view-btn">
                    View
                  </button>

                  <button className="edit-btn">
                    Edit
                  </button>

                  <button className="delete-btn">
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <EmployeeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

    </DashboardLayout>
  );
}

export default Employees;