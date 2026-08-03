function UserInfo() {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        marginTop: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Admin Profile</h2>

      <p><strong>Name:</strong> Admin</p>
      <p><strong>Role:</strong> Security Analyst</p>
      <p><strong>Status:</strong> 🟢 Online</p>
      <p><strong>Last Login:</strong> Today 09:30 AM</p>
    </div>
  );
}

export default UserInfo;