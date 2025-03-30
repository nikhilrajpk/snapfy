import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { userLogout } from '../../API/authAPI'; // Import userLogout
import { logout } from '../../redux/slices/userSlice';
import { useDispatch } from 'react-redux';

function ProtectedRoute({ children, authentication = true }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const [isChecking, setIsChecking] = useState(true); // Add loading state

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {

        if (authentication && !isAuthenticated) {
          navigate('/');
        } else if (!authentication && isAuthenticated) {
          if (user?.is_staff) {
            navigate('/admin-dashboard');
          } else {
            navigate('/home');
          }
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // If backend rejects due to invalid/expired token
          try {
            await userLogout(); // Notify backend of logout
            dispatch(logout()); // Clear frontend state
            navigate('/'); // Redirect to login
          } catch (logoutError) {
            console.error('Logout failed:', logoutError);
            navigate('/'); // Force redirect anyway
          }
        }
      } finally {
        setIsChecking(false); // Done checking
      }
    };

    checkAuthStatus();
  }, [isAuthenticated, authentication, navigate, user, dispatch]);

  // Show loading state while checking authentication
  if (isChecking) {
    return <div>Loading...</div>; // Or your Loader component
  }

  return children;
}

export default ProtectedRoute;