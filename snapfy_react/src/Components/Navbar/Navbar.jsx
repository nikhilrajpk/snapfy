import React from 'react';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, User, Moon, LogOut } from 'lucide-react';

const NavItem = ({ icon: Icon, label, active }) => {
  return (
    <div className={`flex items-center p-3 rounded-xl mb-2 transition-all duration-200 ${active ? 'bg-[#198754] text-white' : 'hover:bg-[#E9F3EE] text-gray-700 hover:text-[#198754]'}`}>
      <Icon size={22} className="mr-3" />
      <span className="font-medium">{label}</span>
    </div>
  );
};

const Navbar = () => {
  return (
    <nav className="bg-white rounded-2xl shadow-sm p-2 mb-4">
      <NavItem icon={Home} label="HOME" active />
      <NavItem icon={Compass} label="EXPLORE" />
      <NavItem icon={Film} label="SHORTS" />
      <NavItem icon={MessageCircle} label="MESSAGES" />
      <NavItem icon={Bell} label="NOTIFICATIONS" />
      <NavItem icon={PlusCircle} label="CREATE" />
      <NavItem icon={User} label="PROFILE" />
      <NavItem icon={Moon} label="THEME MODE" />
      <NavItem icon={LogOut} label="LOGOUT" />
    </nav>
  );
};

export default Navbar;