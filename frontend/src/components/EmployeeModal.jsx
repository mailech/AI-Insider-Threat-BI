import "../styles/employeeModal.css";

function EmployeeModal({ isOpen, onClose }) {

    if (!isOpen) return null;

    return (

        <div className="modal-overlay">

            <div className="employee-modal">

                <div className="modal-header">

                    <h2>Add Employee</h2>

                    <button
                        className="close-btn"
                        onClick={onClose}
                    >
                        ✕
                    </button>

                </div>

                <form className="employee-form">

                    <div className="form-grid">

                        <div className="form-group">
                            <label>Employee ID</label>
                            <input
                                type="text"
                                placeholder="EMP101"
                            />
                        </div>

                        <div className="form-group">
                            <label>Employee Name</label>
                            <input
                                type="text"
                                placeholder="Employee Name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Department</label>
                            <select>
                                <option>IT</option>
                                <option>HR</option>
                                <option>Finance</option>
                                <option>Operations</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Designation</label>
                            <input
                                type="text"
                                placeholder="Software Engineer"
                            />
                        </div>

                        <div className="form-group">
                            <label>Manager</label>
                            <input
                                type="text"
                                placeholder="Manager Name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Assigned Device</label>
                            <input
                                type="text"
                                placeholder="Dell Latitude"
                            />
                        </div>

                        <div className="form-group">
                            <label>Access Privilege</label>

                            <select>
                                <option>Admin</option>
                                <option>Manager</option>
                                <option>User</option>
                                <option>Read Only</option>
                            </select>

                        </div>

                    </div>

                    <div className="modal-buttons">

                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-btn"
                        >
                            Save Employee
                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}

export default EmployeeModal;