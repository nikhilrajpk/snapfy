// src/components/admin/Reports.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';
import { Flag, CheckCircle, XCircle } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/admin/reports/?page=${page}&status=${status}`);
        setReports(response.data.reports);
        setTotalPages(response.data.total_pages);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [page, status]);

  const handleResolveReport = async (reportId) => {
    try {
      await axiosInstance.post('/admin/reports/', { report_id: reportId });
      setReports(reports.map(report => 
        report.id === reportId ? { ...report, resolved: true } : report
      ));
    } catch (error) {
      console.error('Error resolving report:', error);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await axiosInstance.post(`/admin/block-user/${userId}/`, { action: 'block' });
      alert('User blocked successfully');
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Reports</h1>
      <div className="flex space-x-2">
        <button
          onClick={() => setStatus('pending')}
          className={`px-3 py-1 rounded ${status === 'pending' ? 'bg-[#198754] text-white' : 'bg-gray-100'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatus('resolved')}
          className={`px-3 py-1 rounded ${status === 'resolved' ? 'bg-[#198754] text-white' : 'bg-gray-100'}`}
        >
          Resolved
        </button>
      </div>
      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Reporter</th>
                <th className="p-2 text-left">Reported User</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id} className="border-b">
                  <td className="p-2">{report.reporter}</td>
                  <td className="p-2">{report.reported_user}</td>
                  <td className="p-2">{report.reason}</td>
                  <td className="p-2">{new Date(report.created_at).toLocaleDateString()}</td>
                  <td className="p-2">
                    {report.resolved ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-red-500" size={20} />
                    )}
                  </td>
                  <td className="p-2">
                    {!report.resolved && (
                      <button
                        onClick={() => handleResolveReport(report.id)}
                        className="px-2 py-1 bg-[#198754] text-white rounded mr-2"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={() => handleBlockUser(report.reported_user_id)} // Ensure reported_user_id is included in response
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Block User
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setPage(page => Math.max(page - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page => Math.min(page + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;