// src/components/admin/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
import { LogOut, Menu, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/userSlice';
import { showToast } from '../../redux/slices/toastSlice';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      dispatch(logout());
      dispatch(showToast({ message: 'Logged out successfully', type: 'success' }));
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      dispatch(showToast({ message: 'Logout failed', type: 'error' }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-white shadow-md text-gray-600 hover:bg-gray-50"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-[#198754]">Snapfy Admin</h1>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto">
            <AdminNavbar closeMobileSidebar={() => setSidebarOpen(false)} />
          </div>
          
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} className="mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;