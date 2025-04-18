import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
  BarChart2,
  Users,
  FileText,
  Heart,
  MessageSquare,
  Hash,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axiosInstance from '../../axiosInstance';
import { showToast } from '../../redux/slices/toastSlice';

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

const fetchDashboardStats = async () => {
  const response = await axiosInstance.get('/admin/dashboard-stats/');
  return response.data;
};

const fetchUserGrowth = async (period) => {
  const response = await axiosInstance.get(`/admin/user-growth/?period=${period}`);
  return response.data;
};

const fetchPostGrowth = async (period) => {
  const response = await axiosInstance.get(`/admin/post-growth/?period=${period}`);
  return response.data;
};

const fetchLikeGrowth = async (period) => {
  const response = await axiosInstance.get(`/admin/like-growth/?period=${period}`);
  return response.data;
};

const fetchCommentGrowth = async (period) => {
  const response = await axiosInstance.get(`/admin/comment-growth/?period=${period}`);
  return response.data;
};

const fetchHashtagTrends = async (period) => {
  const response = await axiosInstance.get(`/admin/hashtag-trends/?period=${period}`);
  return response.data;
};

const AdminAnalytics = () => {
  const dispatch = useDispatch();
  const [period, setPeriod] = useState('weekly');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  const { data: userGrowth, isLoading: userLoading } = useQuery({
    queryKey: ['userGrowth', period],
    queryFn: () => fetchUserGrowth(period),
  });

  const { data: postGrowth, isLoading: postLoading } = useQuery({
    queryKey: ['postGrowth', period],
    queryFn: () => fetchPostGrowth(period),
  });

  const { data: likeGrowth, isLoading: likeLoading } = useQuery({
    queryKey: ['likeGrowth', period],
    queryFn: () => fetchLikeGrowth(period),
  });

  const { data: commentGrowth, isLoading: commentLoading } = useQuery({
    queryKey: ['commentGrowth', period],
    queryFn: () => fetchCommentGrowth(period),
  });

  const { data: hashtagTrends, isLoading: hashtagLoading } = useQuery({
    queryKey: ['hashtagTrends', period],
    queryFn: () => fetchHashtagTrends(period),
  });

  // Combine data for chart
  const combinedData = userGrowth?.map((userItem, index) => ({
    date: userItem.date,
    'New Users': userItem.count,
    'New Posts': postGrowth?.[index]?.count || 0,
    'New Likes': likeGrowth?.[index]?.count || 0,
    'New Comments': commentGrowth?.[index]?.count || 0,
  })) || [];

  // Pagination logic
  const totalItems = combinedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = page * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = combinedData.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;

      startPage = Math.max(page - maxPagesBeforeCurrent, 1);
      endPage = Math.min(page + maxPagesAfterCurrent, totalPages);

      if (endPage - startPage < maxPagesToShow - 1) {
        if (page <= maxPagesBeforeCurrent) {
          endPage = startPage + maxPagesToShow - 1;
        } else {
          startPage = endPage - maxPagesToShow + 1;
        }
      }
    }

    if (startPage > 1) {
      items.push(1);
      if (startPage > 2) items.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) items.push('...');
      items.push(totalPages);
    }

    return items;
  };

  // Generate report
  const handleGenerateReport = async (dataType) => {
    try {
      const response = await axiosInstance.get(`/admin/generate-report/?type=${dataType}&period=${period}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataType}_${period}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      dispatch(showToast({ message: `PDF report for ${dataType} generated successfully`, type: 'success' }));
    } catch (error) {
      console.error('Error generating report:', error);
      dispatch(showToast({ message: 'Failed to generate PDF report', type: 'error' }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 size={28} className="text-[#198754]" />
          Analytics
        </h1>
        <div className="flex space-x-2">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setPage(1);
              }}
              className={`px-3 py-1 rounded capitalize ${
                period === p ? 'bg-[#198754] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats?.total_users, icon: Users, color: 'bg-blue-500' },
          { label: 'Total Posts', value: stats?.total_posts, icon: FileText, color: 'bg-green-500' },
          { label: 'Total Likes', value: stats?.total_likes, icon: Heart, color: 'bg-red-500' },
          { label: 'Total Comments', value: stats?.total_comments, icon: MessageSquare, color: 'bg-purple-500' },
        ].map(({ label, value, icon, color }) => (
          <StatCard
            key={label}
            title={label}
            value={statsLoading ? 'Loading...' : value ?? 'N/A'}
            icon={icon}
            color={color}
          />
        ))}
      </div>

      {/* Generate Report Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Generate PDF Reports</h2>
        <div className="flex flex-wrap gap-4">
          {[
            { type: 'users', label: 'User Growth' },
            { type: 'posts', label: 'Post Growth' },
            { type: 'likes', label: 'Like Growth' },
            { type: 'comments', label: 'Comment Growth' },
            { type: 'hashtags', label: 'Hashtag Trends' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleGenerateReport(type)}
              className="px-4 py-2 bg-[#198754] text-white rounded hover:bg-[#157347] flex items-center gap-2"
            >
              <Download size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Engagement Trends Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-6">Engagement Trends</h2>
        <div className="h-80">
          {userLoading || postLoading || likeLoading || commentLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="New Users" stroke="#198754" strokeWidth={2} />
                <Line type="monotone" dataKey="New Posts" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="New Likes" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="New Comments" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 bg-white border-t flex items-center justify-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            {getPaginationItems().map((item, index) => (
              <button
                key={index}
                onClick={() => typeof item === 'number' && handlePageChange(item)}
                disabled={item === '...'}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                  item === page
                    ? 'bg-[#198754] text-white'
                    : item === '...'
                      ? 'bg-white text-gray-500 cursor-default'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label={typeof item === 'number' ? `Page ${item}` : undefined}
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
              }`}
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Hashtag Trends Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-6">Top Hashtag Trends</h2>
        <div className="h-80">
          {hashtagLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hashtagTrends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                {hashtagTrends?.[0] && Object.keys(hashtagTrends[0]).filter(key => key !== 'date').map((hashtag, index) => (
                  <Line
                    key={hashtag}
                    type="monotone"
                    dataKey={hashtag}
                    stroke={['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'][index % 5]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 bg-white border-t flex items-center justify-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            {getPaginationItems().map((item, index) => (
              <button
                key={index}
                onClick={() => typeof item === 'number' && handlePageChange(item)}
                disabled={item === '...'}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                  item === page
                    ? 'bg-[#198754] text-white'
                    : item === '...'
                      ? 'bg-white text-gray-500 cursor-default'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label={typeof item === 'number' ? `Page ${item}` : undefined}
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
              }`}
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;