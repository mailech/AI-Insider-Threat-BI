import DashboardLayout from "../layouts/DashboardLayout";
import "../styles/profile.css";

function Profile() {

    const user = {
        name: "Narendra Reddy",
        employeeId: "EMP001",
        email: "narendra@company.com",
        role: "Administrator",
        department: "Cyber Security",
        designation: "Security Administrator",
        manager: "John Anderson",
        device: "Dell Latitude 7420",
        access: "Full Access",
        status: "Active"
    };

    return (

        <DashboardLayout>

            <div className="profile-page">

                <div className="profile-card">

                    <div className="profile-header">

                        <div className="profile-avatar">

                            NR

                        </div>

                        <div>

                            <h2>{user.name}</h2>

                            <p>{user.designation}</p>

                        </div>

                    </div>

                    <div className="profile-details">

                        <div className="detail">

                            <span>Employee ID</span>

                            <strong>{user.employeeId}</strong>

                        </div>

                        <div className="detail">

                            <span>Email</span>

                            <strong>{user.email}</strong>

                        </div>

                        <div className="detail">

                            <span>Department</span>

                            <strong>{user.department}</strong>

                        </div>

                        <div className="detail">

                            <span>Role</span>

                            <strong>{user.role}</strong>

                        </div>

                        <div className="detail">

                            <span>Manager</span>

                            <strong>{user.manager}</strong>

                        </div>

                        <div className="detail">

                            <span>Assigned Device</span>

                            <strong>{user.device}</strong>

                        </div>

                        <div className="detail">

                            <span>Access Level</span>

                            <strong>{user.access}</strong>

                        </div>

                        <div className="detail">

                            <span>Status</span>

                            <strong className="status-active">

                                {user.status}

                            </strong>

                        </div>

                    </div>

                    <button className="edit-profile-btn">

                        Edit Profile

                    </button>

                </div>

                <div className="security-card">

                    <h2>Security Summary</h2>

                    <div className="security-grid">

                        <div className="security-item">

                            <h3>42</h3>

                            <p>Total Logins</p>

                        </div>

                        <div className="security-item">

                            <h3>3</h3>

                            <p>Failed Logins</p>

                        </div>

                        <div className="security-item">

                            <h3>18</h3>

                            <p>Files Accessed</p>

                        </div>

                        <div className="security-item">

                            <h3>2</h3>

                            <p>Risk Alerts</p>

                        </div>

                    </div>

                </div>

            </div>

        </DashboardLayout>

    );

}

export default Profile;