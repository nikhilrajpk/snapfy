// src/components/admin/AdminNavbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  UserX, 
  BarChart2, 
  FileText, 
  Bell, 
  Settings,
  Flag,
  TrendingUp
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, to, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center py-3 pl-2 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
        isActive ? 'bg-[#198754] text-white' : 'hover:bg-[#E9F3EE] text-gray-700 hover:text-[#198754]'
      }`
    }
  >
    <Icon size={22} className="mr-3" />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const AdminNavbar = ({ closeMobileSidebar }) => {
  const handleClick = () => {
    if (closeMobileSidebar) {
      closeMobileSidebar();
    }
  };

  return (
    <nav className="space-y-1">
      <NavItem icon={Home} label="DASHBOARD" to="/admin" onClick={handleClick} />
      <NavItem icon={Users} label="USERS" to="/admin/users" onClick={handleClick} />
      <NavItem icon={UserX} label="BLOCKED USERS" to="/admin/blocked-users" onClick={handleClick} />
      <NavItem icon={Flag} label="REPORTS" to="/admin/reports" onClick={handleClick} />
      <NavItem icon={TrendingUp} label="TRENDING SONGS" to="/admin/trending" onClick={handleClick} />
      <NavItem icon={BarChart2} label="ANALYTICS" to="/admin/analytics" onClick={handleClick} />
      <NavItem icon={FileText} label="EXPORT REPORTS" to="/admin/export" onClick={handleClick} />
      {/* <NavItem icon={Bell} label="NOTIFICATIONS" to="/admin/notifications" onClick={handleClick} /> */}
      {/* <NavItem icon={Settings} label="SETTINGS" to="/admin/settings" onClick={handleClick} /> */}
    </nav>
  );
};

export default AdminNavbar;