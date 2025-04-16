import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, User, LogOut, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { userLogout } from '../../API/authAPI';
import { useNotifications } from '../../Features/Notification/NotificationContext';

const NavItem = ({ icon: Icon, label, to, onClick }) => {
  const { user } = useSelector((state) => state.user);
  const { unreadCount } = useNotifications();

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center py-3 pl-2 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
          isActive ? 'bg-[#198754] text-white' : 'hover:bg-[#E9F3EE] text-gray-700 hover:text-[#198754]'
        }`
      }
    >
      {label === 'PROFILE' && user?.profile_picture ? (
        <img
          src={`${CLOUDINARY_ENDPOINT}${user.profile_picture}`}
          alt={user.username}
          className="w-6 h-6 rounded-full mr-3 object-cover"
          onError={(e) => (e.target.src = '/default-profile.png')}
        />
      ) : (
        <Icon size={22} className="mr-3" />
      )}
      <span className="font-medium">{label}</span>
      {label === 'NOTIFICATION' && unreadCount > 0 && (
        <span className="ml-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </NavLink>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const handleLogout = async () => {
    // Set a flag to indicate logout is in progress
    window.isLoggingOut = true;

    try {
      await userLogout();
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      dispatch(logout());
      dispatch(showToast({ message: 'Logged out successfully', type: 'success' }));
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      dispatch(logout());
      dispatch(showToast({ message: 'Logged out successfully', type: 'warning' }));
      navigate('/');
    } finally {
      // Clear the flag after logout completes
      window.isLoggingOut = false;
    }
  };

  return (
    <nav className="bg-white rounded-2xl shadow-sm p-2 mb-4">
      <NavItem icon={Home} label="HOME" to="/home" />
      <NavItem icon={Search} label="SEARCH" to="/search" />
      <NavItem icon={Compass} label="EXPLORE" to="/explore" />
      <NavItem icon={Film} label="SHORTS" to="/shorts" />
      <NavItem icon={MessageCircle} label="MESSAGES" to="/messages" />
      <NavItem icon={Bell} label="NOTIFICATION" to="/notifications" />
      <NavItem icon={PlusCircle} label="CREATE" to="/create-post" />
      <NavItem icon={User} label="PROFILE" to={`/${user?.username}`} />
      <NavItem icon={LogOut} label="LOGOUT" to="/" onClick={(e) => { e.preventDefault(); handleLogout(); }} />
    </nav>
  );
};

export default Navbar;