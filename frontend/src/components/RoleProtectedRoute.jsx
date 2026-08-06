import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleProtectedRoute({ children, allowedRoles }) {

    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/" />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
}

export default RoleProtectedRoute;