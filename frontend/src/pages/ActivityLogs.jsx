import DashboardLayout from "../layouts/DashboardLayout";
import DashboardCard from "../components/DashboardCard";
import "../styles/activitylogs.css";

function ActivityLogs() {

    const logs = [

        {
            employee:"EMP101",
            activity:"Login Success",
            device:"Dell Latitude",
            time:"09:10 AM",
            severity:"Low"
        },

        {
            employee:"EMP102",
            activity:"Downloaded Payroll.xlsx",
            device:"HP EliteBook",
            time:"09:42 AM",
            severity:"Medium"
        },

        {
            employee:"EMP103",
            activity:"USB Device Connected",
            device:"Lenovo ThinkPad",
            time:"10:15 AM",
            severity:"High"
        },

        {
            employee:"EMP104",
            activity:"Multiple Failed Login Attempts",
            device:"MacBook Pro",
            time:"11:30 AM",
            severity:"Critical"
        },

        {
            employee:"EMP105",
            activity:"Remote VPN Login",
            device:"Dell Precision",
            time:"01:20 PM",
            severity:"Medium"
        }

    ];

    return(

        <DashboardLayout>

            <div className="activity-header">

                <div>

                    <h1>Activity Monitoring</h1>

                    <p>Monitor employee activities and suspicious events.</p>

                </div>

            </div>

            <div className="card-grid">

                <DashboardCard
                    title="Today's Events"
                    value="1,245"
                    color="#2563eb"
                />

                <DashboardCard
                    title="Failed Logins"
                    value="18"
                    color="#f59e0b"
                />

                <DashboardCard
                    title="USB Activities"
                    value="42"
                    color="#8b5cf6"
                />

                <DashboardCard
                    title="Critical Alerts"
                    value="7"
                    color="#dc2626"
                />

            </div>

            <div className="activity-toolbar">

                <input
                    type="text"
                    placeholder="Search employee or activity..."
                />

                <select>

                    <option>All Severity</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>

                </select>

            </div>

            <div className="activity-table">

                <table>

                    <thead>

                        <tr>

                            <th>Employee</th>
                            <th>Activity</th>
                            <th>Device</th>
                            <th>Time</th>
                            <th>Severity</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            logs.map((log,index)=>(

                                <tr key={index}>

                                    <td>{log.employee}</td>

                                    <td>{log.activity}</td>

                                    <td>{log.device}</td>

                                    <td>{log.time}</td>

                                    <td>

                                        <span className={`badge ${log.severity.toLowerCase()}`}>

                                            {log.severity}

                                        </span>

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                </table>

            </div>

        </DashboardLayout>

    );

}

export default ActivityLogs;