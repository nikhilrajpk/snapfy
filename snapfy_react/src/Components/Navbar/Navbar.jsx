import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, User, Moon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NavItem = ({ icon: Icon, label, to, onClick }) => {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => 
        `flex items-center p-3 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
          isActive 
            ? 'bg-[#198754] text-white' 
            : 'hover:bg-[#E9F3EE] text-gray-700 hover:text-[#198754]'
        }`
      }
    >
      <Icon size={22} className="mr-3" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );
};

const Navbar = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const {user} = useSelector(state=> state.user)
  
  const handleLogout = () => {
    dispatch(logout())

    // dispatching toast action
    dispatch(showToast({message: "Logged out.", type:"success"}))

    // navigating to login page
    navigate('/')
  }

  return (
    <nav className="bg-white rounded-2xl shadow-sm p-2 mb-4">
      <NavItem icon={Home} label="HOME" to="/home" />
      <NavItem icon={Compass} label="EXPLORE" to="/explore" />
      <NavItem icon={Film} label="SHORTS" to="/shorts" />
      <NavItem icon={MessageCircle} label="MESSAGES" to="/messages" />
      <NavItem icon={Bell} label="NOTIFICATIONS" to="/notifications" />
      <NavItem icon={PlusCircle} label="CREATE" to="/create-post" />
      <NavItem icon={User} label="PROFILE" to={`/${user?.username}`} />
      <NavItem icon={Moon} label="THEME MODE" to="/theme" />
      <NavItem 
        icon={LogOut} 
        label="LOGOUT" 
        to="/" 
        onClick={(e) => {
          e.preventDefault();
          handleLogout();
        }} 
      />
    </nav>
  );
};

export default Navbar;