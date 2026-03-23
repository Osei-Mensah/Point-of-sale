import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  // Prevent flicker while checking auth
  if (loading) {
    return <p>Loading...</p>;
  }

  // Not authenticated → redirect
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Role-based check (if roles specified)
  if (allowedRoles && user) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/sales" replace />;
    }
  }

  // Authenticated → allow access
  return children;
}

export default ProtectedRoute;
