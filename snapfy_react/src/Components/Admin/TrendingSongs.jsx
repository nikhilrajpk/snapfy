import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Music, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Play, 
  Pause 
} from 'lucide-react';
import axiosInstance from '../../axiosInstance';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';

const TrendingSongs = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false); // New state for create/update
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTracks, setTotalTracks] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    file: null,
    is_trending: false,
    start_time: 0,
    end_time: 30
  });
  const [audioDuration, setAudioDuration] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null); // Store the object URL to revoke later
  const dispatch = useDispatch();

  useEffect(() => {
    fetchTracks();
  }, [currentPage, searchQuery, trendingOnly]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/music-tracks/', {
        params: {
          page: currentPage,
          limit: 10,
          query: searchQuery,
          trending: trendingOnly
        }
      });
      
      setTracks(response.data.tracks);
      setTotalPages(response.data.total_pages);
      setTotalTracks(response.data.total);
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        console.error('Error fetching music tracks:', error);
        dispatch(showToast({ message: 'Failed to load music tracks', type: 'error' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateTrack = async (e) => {
    e.preventDefault();
    const { title, file, is_trending, start_time, end_time } = formData;

    if (!title || (!file && !editingTrack)) {
      dispatch(showToast({ message: 'Title and file are required', type: 'error' }));
      return;
    }

    if (file && (end_time - start_time > 30 || end_time - start_time < 3 || start_time < 0 || end_time > audioDuration)) {
      dispatch(showToast({ message: 'Invalid trimming range (must be 3–30 seconds)', type: 'error' }));
      return;
    }

    setFormLoading(true); // Start loading
    const data = new FormData();
    data.append('title', title);
    data.append('is_trending', is_trending);
    if (file) {
      data.append('file', file);
      data.append('start_time', start_time);
      data.append('end_time', end_time);
    }

    try {
      let response;
      if (editingTrack) {
        response = await axiosInstance.put(`/admin/music-tracks/${editingTrack.id}/`, data);
        setTracks(tracks.map(track => track.id === editingTrack.id ? response.data : track));
        dispatch(showToast({ message: 'Track updated successfully', type: 'success' }));
      } else {
        response = await axiosInstance.post('/admin/music-tracks/', data);
        setTracks([response.data, ...tracks]);
        setTotalTracks(prev => prev + 1);
        dispatch(showToast({ message: 'Track created successfully', type: 'success' }));
      }
      closeModal();
    } catch (error) {
      console.error('Error saving music track:', error);
      dispatch(showToast({ message: 'Failed to save music track', type: 'error' }));
    } finally {
      setFormLoading(false); // Stop loading
    }
  };

  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;
    setLoading(true); // Start loading
    try {
      await axiosInstance.delete(`/admin/music-tracks/${trackId}/`);
      setTracks(tracks.filter(track => track.id !== trackId));
      setTotalTracks(prev => prev - 1);
      dispatch(showToast({ message: 'Track deleted successfully', type: 'success' }));
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        console.error('Error deleting music track:', error);
        dispatch(showToast({ message: 'Failed to delete music track', type: 'error' }));
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const openModal = (track = null) => {
    setEditingTrack(track);
    setFormData({
      title: track ? track.title : '',
      file: null,
      is_trending: track ? track.is_trending : false,
      start_time: track ? 0 : 0,
      end_time: track ? 30 : 30
    });
    setAudioDuration(null);
    setIsPlaying(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrack(null);
    setFormData({ title: '', file: null, is_trending: false, start_time: 0, end_time: 30 });
    setAudioDuration(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Clear the src
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current); // Prevent memory leaks
      audioUrlRef.current = null;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Selected file:', file.name, file.type);
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audioUrlRef.current = objectUrl;
      audio.src = objectUrl;
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded. Duration:', audio.duration);
        setAudioDuration(audio.duration);
        setFormData({
          ...formData,
          file,
          start_time: 0,
          end_time: Math.min(30, audio.duration)
        });
      };
      audio.onerror = (err) => {
        console.error('Error loading audio file:', err);
        dispatch(showToast({ message: 'Invalid audio file', type: 'error' }));
        setFormData({ ...formData, file: null });
        setAudioDuration(null);
        URL.revokeObjectURL(objectUrl);
        audioUrlRef.current = null;
      };
    } else {
      console.log('No file selected');
      setFormData({ ...formData, file: null });
      setAudioDuration(null);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    }
  };

  const handleTimeChange = (type, value) => {
    const newValue = parseFloat(value) || 0;
    if (type === 'start_time') {
      setFormData({ ...formData, start_time: newValue });
    } else {
      setFormData({ ...formData, end_time: newValue });
    }
    if (audioRef.current) {
      audioRef.current.currentTime = type === 'start_time' ? newValue : formData.start_time;
      if (isPlaying) {
        console.log('Updating playback position to:', audioRef.current.currentTime);
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !formData.file) {
      console.warn('Cannot play: audioRef or file is missing', { audioRef: audioRef.current, file: formData.file });
      dispatch(showToast({ message: 'No audio file selected', type: 'error' }));
      return;
    }

    if (isPlaying) {
      console.log('Pausing audio');
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log('Playing audio from:', formData.start_time);
      audioRef.current.currentTime = formData.start_time;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          dispatch(showToast({ message: 'Failed to play audio', type: 'error' }));
        });
    }
  };

  useEffect(() => {
    if (audioRef.current && formData.file) {
      const audio = audioRef.current;
      const handleTimeUpdate = () => {
        if (audio.currentTime >= formData.end_time) {
          console.log('Audio reached end_time, pausing');
          audio.pause();
          audio.currentTime = formData.start_time;
          setIsPlaying(false);
        }
      };
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [formData.start_time, formData.end_time, formData.file]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Trending Songs</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={trendingOnly}
              onChange={() => setTrendingOnly(!trendingOnly)}
              className="mr-2"
            />
            Show Trending Only
          </label>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#157347] transition duration-200 flex items-center"
            disabled={formLoading || loading}
          >
            <Plus size={18} className="mr-2" />
            Add New Track
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#198754] focus:border-[#198754]"
              placeholder="Search by track title..."
              disabled={formLoading || loading}
            />
          </div>
          <button
            type="submit"
            className="ml-3 px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#157347] transition duration-200"
            disabled={formLoading || loading}
          >
            Search
          </button>
        </form>
      </div>

      {/* Tracks Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trending
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audio
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
                    </div>
                  </td>
                </tr>
              ) : tracks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No tracks found
                  </td>
                </tr>
              ) : (
                tracks.map(track => (
                  <tr key={track.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {track.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        track.is_trending ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {track.is_trending ? 'Trending' : 'Not Trending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a
                        href={track.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-[#198754] hover:text-[#157347]"
                      >
                        <Music size={16} className="mr-1" />
                        Listen
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openModal(track)}
                        className="mr-2 text-blue-600 hover:text-blue-800"
                        disabled={formLoading || loading}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="text-red-600 hover:text-red-800 flex items-center"
                        disabled={formLoading || loading}
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-red-600"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && tracks.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || formLoading || loading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || formLoading || loading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * 10, totalTracks)}</span> of{' '}
                  <span className="font-medium">{totalTracks}</span> tracks
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || formLoading || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-[#198754] border-[#198754] text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      } ${formLoading || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={formLoading || loading}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || formLoading || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit Track */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="bg-white rounded-xl p-6 border-2 border-[#198754] w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingTrack ? 'Edit Track' : 'Add New Track'}
              </h2>
              <button 
                onClick={closeModal} 
                className="text-gray-500 hover:text-gray-700"
                disabled={formLoading}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateTrack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-[#198754] focus:border-[#198754]"
                  required
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Audio File</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                  required={!editingTrack}
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trim Audio (3–30 seconds)
                </label>
                {formData.file && audioDuration ? (
                  <>
                    <div className="mt-2 flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500">Start Time (seconds)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={audioDuration - 3}
                          value={formData.start_time}
                          onChange={(e) => handleTimeChange('start_time', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-[#198754] focus:border-[#198754]"
                          disabled={(!formData.file && editingTrack) || formLoading}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500">End Time (seconds)</label>
                        <input
                          type="number"
                          step="0.1"
                          min={formData.start_time + 3}
                          max={audioDuration}
                          value={formData.end_time}
                          onChange={(e) => handleTimeChange('end_time', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-[#198754] focus:border-[#198754]"
                          disabled={(!formData.file && editingTrack) || formLoading}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Duration: {(formData.end_time - formData.start_time).toFixed(1)}s / {formatDuration(audioDuration)}
                      </p>
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className="flex items-center px-3 py-1 bg-[#198754] text-white rounded-lg hover:bg-[#157347]"
                        disabled={!formData.file || formLoading}
                      >
                        {isPlaying ? <Pause size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                    </div>
                    <audio
                      ref={audioRef}
                      src={formData.file ? audioUrlRef.current : ''}
                      hidden
                    />
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    {editingTrack ? 'Upload a new file to trim' : 'Select an audio file to trim'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_trending}
                    onChange={(e) => setFormData({ ...formData, is_trending: e.target.checked })}
                    className="mr-2"
                    disabled={formLoading}
                  />
                  Trending
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#157347] flex items-center"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                  ) : null}
                  {editingTrack ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingSongs;