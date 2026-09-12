
import { useMemo, useState } from "react";
import "../styles/UEBA.css";

const users = [
  {
    id: "EMP001",
    name: "Rahul Sharma",
    department: "Engineering",
    peerGroup: "Engineering",
    loginDeviation: 72,
    fileDeviation: 68,
    downloadDeviation: 81,
    deviceDeviation: 55,
    networkDeviation: 63,
    trend: "Increasing",
    prediction: "High",
  },
  {
    id: "EMP002",
    name: "Priya Reddy",
    department: "Finance",
    peerGroup: "Finance",
    loginDeviation: 22,
    fileDeviation: 18,
    downloadDeviation: 25,
    deviceDeviation: 20,
    networkDeviation: 16,
    trend: "Stable",
    prediction: "Low",
  },
  {
    id: "EMP003",
    name: "Arjun Kumar",
    department: "IT Security",
    peerGroup: "IT Security",
    loginDeviation: 78,
    fileDeviation: 82,
    downloadDeviation: 76,
    deviceDeviation: 88,
    networkDeviation: 73,
    trend: "Increasing",
    prediction: "Critical",
  },
  {
    id: "EMP004",
    name: "Sneha Patel",
    department: "HR",
    peerGroup: "HR",
    loginDeviation: 19,
    fileDeviation: 24,
    downloadDeviation: 17,
    deviceDeviation: 21,
    networkDeviation: 18,
    trend: "Stable",
    prediction: "Low",
  },
  {
    id: "EMP005",
    name: "Vikram Singh",
    department: "Operations",
    peerGroup: "Operations",
    loginDeviation: 61,
    fileDeviation: 57,
    downloadDeviation: 74,
    deviceDeviation: 65,
    networkDeviation: 59,
    trend: "Increasing",
    prediction: "High",
  },
  {
    id: "EMP006",
    name: "Ananya Rao",
    department: "Engineering",
    peerGroup: "Engineering",
    loginDeviation: 27,
    fileDeviation: 31,
    downloadDeviation: 23,
    deviceDeviation: 28,
    networkDeviation: 25,
    trend: "Stable",
    prediction: "Low",
  },
];

function calculateUEBAScore(user) {
  return Math.round(
    user.loginDeviation * 0.2 +
      user.fileDeviation * 0.2 +
      user.downloadDeviation * 0.2 +
      user.deviceDeviation * 0.2 +
      user.networkDeviation * 0.2
  );
}

function getRiskLevel(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function UEBA() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);

  const processedUsers = useMemo(() => {
    return users.map((user) => {
      const score = calculateUEBAScore(user);

      return {
        ...user,
        score,
        risk: getRiskLevel(score),
      };
    });
  }, []);

  const filteredUsers = processedUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase()) ||
      user.department.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      department === "All" || user.department === department;

    return matchesSearch && matchesDepartment;
  });

  const increasing = processedUsers.filter(
    (user) => user.trend === "Increasing"
  ).length;

  const highRisk = processedUsers.filter(
    (user) => user.score >= 60
  ).length;

  const stable = processedUsers.filter(
    (user) => user.trend === "Stable"
  ).length;

  const averageScore = Math.round(
    processedUsers.reduce((sum, user) => sum + user.score, 0) /
      processedUsers.length
  );

  const departments = [
    "All",
    ...new Set(users.map((user) => user.department)),
  ];

  return (
    <div className="ueba-page">
      <div className="ueba-header">
        <div>
          <h1>UEBA Intelligence</h1>
          <p>
            User and Entity Behavior Analytics for detecting abnormal
            behavioral patterns and emerging threats.
          </p>
        </div>

        <div className="ueba-status">
          ● Analytics Active
        </div>
      </div>

      {/* Summary */}

      <div className="ueba-summary">
        <div className="ueba-card">
          <span>Users Analyzed</span>
          <strong>{processedUsers.length}</strong>
          <small>Behavior profiles monitored</small>
        </div>

        <div className="ueba-card">
          <span>Increasing Risk</span>
          <strong>{increasing}</strong>
          <small>Behavior trending upward</small>
        </div>

        <div className="ueba-card">
          <span>High Risk Users</span>
          <strong>{highRisk}</strong>
          <small>Requires security attention</small>
        </div>

        <div className="ueba-card">
          <span>Average UEBA Score</span>
          <strong>{averageScore}</strong>
          <small>Across monitored users</small>
        </div>
      </div>

      {/* Intelligence panels */}

      <div className="ueba-grid">
        <div className="ueba-panel">
          <h2>Peer Group Analysis</h2>
          <p>
            User behavior is compared with employees performing
            similar roles or belonging to the same department.
          </p>

          <div className="peer-list">
            {departments
              .filter((item) => item !== "All")
              .map((dept) => {
                const members = processedUsers.filter(
                  (user) => user.department === dept
                );

                const average = Math.round(
                  members.reduce(
                    (sum, user) => sum + user.score,
                    0
                  ) / members.length
                );

                return (
                  <div className="peer-row" key={dept}>
                    <div>
                      <strong>{dept}</strong>
                      <span>{members.length} users</span>
                    </div>

                    <div className="peer-score">
                      <span>Avg. Score</span>
                      <strong>{average}</strong>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="ueba-panel">
          <h2>Behavior Trend Analysis</h2>
          <p>
            Current behavior trends help identify users whose
            activity is moving away from their normal patterns.
          </p>

          <div className="trend-container">
            <div className="trend-item">
              <div>
                <strong>Increasing</strong>
                <span>Potential emerging risk</span>
              </div>
              <b>{increasing}</b>
            </div>

            <div className="trend-item">
              <div>
                <strong>Stable</strong>
                <span>Behavior within expected range</span>
              </div>
              <b>{stable}</b>
            </div>

            <div className="trend-item">
              <div>
                <strong>Average UEBA Score</strong>
                <span>Current population baseline</span>
              </div>
              <b>{averageScore}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}

      <div className="ueba-controls">
        <input
          type="text"
          placeholder="Search employee, ID or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept === "All" ? "All Departments" : dept}
            </option>
          ))}
        </select>
      </div>

      {/* User analysis */}

      <div className="ueba-table-card">
        <div className="section-heading">
          <div>
            <h2>User Behavior Intelligence</h2>
            <p>
              Comparison of user activity against behavioral and
              peer-group expectations.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="ueba-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Peer Group</th>
                <th>Login</th>
                <th>Files</th>
                <th>Downloads</th>
                <th>Devices</th>
                <th>Network</th>
                <th>UEBA Score</th>
                <th>Trend</th>
                <th>Prediction</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.id}</small>
                  </td>

                  <td>{user.peerGroup}</td>

                  <td>{user.loginDeviation}%</td>
                  <td>{user.fileDeviation}%</td>
                  <td>{user.downloadDeviation}%</td>
                  <td>{user.deviceDeviation}%</td>
                  <td>{user.networkDeviation}%</td>

                  <td>
                    <div className="ueba-score">
                      <strong>{user.score}</strong>
                      <div>
                        <span
                          style={{
                            width: `${user.score}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`trend-badge ${user.trend.toLowerCase()}`}
                    >
                      {user.trend}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`prediction-badge ${user.prediction.toLowerCase()}`}
                    >
                      {user.prediction}
                    </span>
                  </td>

                  <td>
                    <button
                      className="ueba-view-btn"
                      onClick={() => setSelectedUser(user)}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}

      {selectedUser && (
        <div
          className="ueba-modal-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="ueba-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{selectedUser.name}</h2>
                <p>
                  {selectedUser.id} • {selectedUser.department}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>

            <div className="ueba-overview">
              <div>
                <span>UEBA Score</span>
                <strong>{selectedUser.score}/100</strong>
              </div>

              <span
                className={`prediction-badge ${selectedUser.prediction.toLowerCase()}`}
              >
                {selectedUser.prediction} Prediction
              </span>
            </div>

            <h3>Behavior Deviation Analysis</h3>

            <div className="deviation-list">
              {[
                ["Login Pattern", selectedUser.loginDeviation],
                ["File Access", selectedUser.fileDeviation],
                ["Downloads", selectedUser.downloadDeviation],
                ["Device Usage", selectedUser.deviceDeviation],
                ["Network Activity", selectedUser.networkDeviation],
              ].map(([label, value]) => (
                <div className="deviation-row" key={label}>
                  <div>
                    <strong>{label}</strong>
                    <span>{value}% deviation from expected behavior</span>
                  </div>

                  <b>{value}%</b>
                </div>
              ))}
            </div>

            <div className="ueba-explanation">
              <strong>UEBA Interpretation</strong>
              <p>
                The system compares this user's behavior with
                expected activity and peer-group behavior. Increasing
                deviations may indicate emerging insider-threat
                risk and should be correlated with anomalies,
                privileges and security events.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UEBA;