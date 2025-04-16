import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

// Admin Protected Route
export const AdminProtectedRoute = ({ children }) => {
    const { user } = useSelector((state) => state.user);
    if (!user || !user.is_staff) {
      return <Navigate to="/" replace />;
    }
    return children;
  };