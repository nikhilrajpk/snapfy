import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../../axiosInstance';
import { showToast } from '../../redux/slices/toastSlice';

const fetchAnalyticsReports = async ({ page, limit, dataType }) => {
  const params = new URLSearchParams({ page, limit });
  if (dataType) params.append('data_type', dataType);
  const response = await axiosInstance.get(`/admin/list-analytics-reports/?${params.toString()}`);
  return response.data;
};

const AdminExport = () => {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [dataType, setDataType] = useState('');
  const limit = 10;

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['analyticsReports', page, dataType],
    queryFn: () => fetchAnalyticsReports({ page, limit, dataType }),
  });

  const totalPages = reportsData?.total_pages || 1;

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

  const handleDownloadReport = async (dataType, period) => {
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

      dispatch(showToast({ message: `PDF report for ${dataType} downloaded`, type: 'success' }));
    } catch (error) {
      console.error('Error downloading report:', error);
      dispatch(showToast({ message: 'Failed to download PDF report', type: 'error' }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText size={28} className="text-[#198754]" />
          Export Reports
        </h1>
        <div className="flex space-x-2">
          <select
            value={dataType}
            onChange={(e) => {
              setDataType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1 rounded bg-gray-100 text-gray-700"
          >
            <option value="">All Types</option>
            <option value="users">Users</option>
            <option value="posts">Posts</option>
            <option value="likes">Likes</option>
            <option value="comments">Comments</option>
            <option value="hashtags">Hashtags</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Saved Reports</h2>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
          </div>
        ) : reportsData?.reports?.length === 0 ? (
          <p className="text-gray-500">No reports found.</p>
        ) : (
          <div className="space-y-4">
            {reportsData?.reports?.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {report.data_type.charAt(0).toUpperCase() + report.data_type.slice(1)} {report.report_type} Report
                  </p>
                  <p className="text-sm text-gray-500">
                    Generated by {report.generated_by} on {new Date(report.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Period: {report.start_date} to {report.end_date}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadReport(report.data_type, report.report_type)}
                  className="px-4 py-2 bg-[#198754] text-white rounded hover:bg-[#157347] flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
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

export default AdminExport;