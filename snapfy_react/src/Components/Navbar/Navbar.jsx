import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, User, Moon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NavItem = ({ icon: Icon, label, active, onclick }) => {

  return (
    <NavLink onClick={onclick} className={`flex items-center p-3 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${active ? 'bg-[#198754] text-white' : 'hover:bg-[#E9F3EE] text-gray-700 hover:text-[#198754]'}`}>
      <Icon size={22} className="mr-3" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );
};

const Navbar = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleLogout = ()=>{
      dispatch(logout())

      // dispatching toast action
      dispatch(showToast({message: "Logged out.", type:"success"}))

      // navigating to login page
      navigate('/')
  }

  const handleNavigate = (path)=>{
    navigate(path)
  }

  return (
    <nav className="bg-white rounded-2xl shadow-sm p-2 mb-4">
      <NavItem icon={Home} label="HOME" onclick={()=> handleNavigate('/home')} active />
      <NavItem icon={Compass} label="EXPLORE" />
      <NavItem icon={Film} label="SHORTS" />
      <NavItem icon={MessageCircle} label="MESSAGES" />
      <NavItem icon={Bell} label="NOTIFICATIONS" />
      <NavItem icon={PlusCircle} label="CREATE" />
      <NavItem icon={User} label="PROFILE" onclick={()=> handleNavigate('/:username')} />
      <NavItem icon={Moon} label="THEME MODE" />
      <NavItem icon={LogOut} label="LOGOUT" onclick={handleLogout} />
    </nav>
  );
};

export default Navbar;