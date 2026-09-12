import { Navigate } from "react-router-dom";

function getCurrentUser() {
  try {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, allowedRoles }) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;