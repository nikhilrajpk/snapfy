// src/components/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserCheck, 
  UserX, 
  Users as UsersIcon, 
  TrendingUp, 
  Flag,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

import axiosInstance from '../../axiosInstance'

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    blocked_users: 0,
    new_users_today: 0,
    new_users_this_week: 0,
    new_users_this_month: 0,
    active_users: 0,
    online_users: 0,
    reports_count: 0,
    unhandled_reports: 0
  });
  
  const [userGrowth, setUserGrowth] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, growthResponse] = await Promise.all([
          axiosInstance.get(`/admin/dashboard-stats/`),
          axiosInstance.get(`/admin/user-growth/?period=${selectedPeriod}`)
        ]);
        
        setStats(statsResponse.data);
        setUserGrowth(growthResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedPeriod]);

  const formattedUserGrowth = userGrowth.map(item => ({
    date: item.date,
    'New Users': item.count
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={stats.total_users} 
          icon={User} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Active Users" 
          value={stats.active_users} 
          icon={UserCheck} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Blocked Users" 
          value={stats.blocked_users} 
          icon={UserX} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Online Now" 
          value={stats.online_users} 
          icon={UsersIcon} 
          color="bg-purple-500" 
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="New Users Today" 
          value={stats.new_users_today} 
          icon={User} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="New Users This Week" 
          value={stats.new_users_this_week} 
          icon={User} 
          color="bg-pink-500" 
        />
        <StatCard 
          title="New Users This Month" 
          value={stats.new_users_this_month} 
          icon={User} 
          color="bg-yellow-500" 
        />
      </div>

      {/* Reports Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          title="Total Reports" 
          value={stats.reports_count} 
          icon={Flag} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Pending Reports" 
          value={stats.unhandled_reports} 
          icon={AlertCircle} 
          color="bg-red-600" 
        />
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">User Growth</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setSelectedPeriod('daily')}
              className={`px-3 py-1 rounded ${selectedPeriod === 'daily' ? 'bg-[#198754] text-white' : 'bg-gray-100'}`}
            >
              Daily
            </button>
            <button 
              onClick={() => setSelectedPeriod('weekly')}
              className={`px-3 py-1 rounded ${selectedPeriod === 'weekly' ? 'bg-[#198754] text-white' : 'bg-gray-100'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-3 py-1 rounded ${selectedPeriod === 'monthly' ? 'bg-[#198754] text-white' : 'bg-gray-100'}`}
            >
              Monthly
            </button>
          </div>
        </div>
        
        <div className="h-80">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <p>Loading chart data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedUserGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#198754" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#198754" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="New Users" stroke="#198754" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;