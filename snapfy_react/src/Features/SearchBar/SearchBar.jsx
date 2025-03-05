import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from '../../Components/Navbar/SideBar';
import { Search, Hash, AtSign, Loader2 } from 'lucide-react';
import { getAllUser } from '../../API/authAPI';
import axiosInstance from '../../axiosInstance';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import PostPopup from '../../Components/Post/PostPopUp';

const SearchBar = () => {
  const [searchType, setSearchType] = useState('username');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const navigate = useNavigate();

  // console.log("results ::", results);

  const handleSearchType = (type) => {
    setSearchType(type);
    setSearchText('');
    setResults([]);
    setError(null);
  };

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (searchType === 'hashtag') {
        const response = await axiosInstance.get(`posts/?hashtag=${searchText}`);
        setResults(response.data);
      } else {
        const response = await getAllUser(searchText);
        setResults(response);
      }
    } catch (error) {
      console.error('Search error:', error.response?.data || error);
      setError('Failed to fetch search results. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchText, searchType]);

  const handleUserClick = (username) => {
    navigate(`/user/${username}`);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setIsPopupOpen(true);
  };

  const closePostPopup = () => {
    setIsPopupOpen(false);
    setSelectedPost(null);
  };

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 max-w-4xl mx-auto p-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border-2 border-[#198754]">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => handleSearchType('hashtag')}
                className={`p-2 rounded-lg ${searchType === 'hashtag' ? 'bg-[#198754] text-white' : 'bg-gray-200 text-gray-700'} hover:bg-[#1E3932] hover:text-white transition`}
              >
                <Hash size={20} />
              </button>
              <button
                type="button"
                onClick={() => handleSearchType('username')}
                className={`p-2 rounded-lg ${searchType === 'username' ? 'bg-[#198754] text-white' : 'bg-gray-200 text-gray-700'} hover:bg-[#1E3932] hover:text-white transition`}
              >
                <AtSign size={20} />
              </button>
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={`Search for ${searchType === 'hashtag' ? 'hashtags' : 'usernames'}`}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#198754]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#198754] text-white p-2 rounded-lg hover:bg-[#1E3932] transition flex items-center space-x-1"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchType === 'hashtag' ? (
              results.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition"
                >
                  <div className="aspect-square">
                    {post.file.includes('/video/upload/') ? (
                      <video
                        src={normalizeUrl(post.file)}
                        className="w-full h-full object-cover"
                        muted
                        controls
                      />
                    ) : (
                      <img
                        src={normalizeUrl(post.file)}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-700 truncate">{post.caption}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {post.hashtags.map((tag) => (
                        <span key={tag.id} className="text-blue-500 text-xs">#{tag.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              results.map((user) => (
                <div
                  key={user.username}
                  onClick={() => handleUserClick(user.username)}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md transition"
                >
                  <img
                    src={user.profile_picture ? `${CLOUDINARY_ENDPOINT}${user.profile_picture}` : '/default-profile.png'}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-gray-800">{user.username}</p>
                    <p className="text-sm text-gray-600">{user.first_name} {user.last_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          !isLoading && searchText && (
            <div className="text-center text-gray-500">No results found for &ldquo;{searchText}&rdquo;</div>
          )
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center mt-6">
            <Loader2 size={32} className="animate-spin text-[#198754]" />
          </div>
        )}

        {/* PostPopup for selected post */}
        {isPopupOpen && selectedPost && (
          <PostPopup
            post={selectedPost}
            userData={{
              username: selectedPost.user.username,
              profileImage: selectedPost.user.profile_picture
                ? `${CLOUDINARY_ENDPOINT}${selectedPost.user.profile_picture}`
                : '/default-profile.png',
            }}
            isOpen={isPopupOpen}
            onClose={closePostPopup}
          />
        )}
      </div>
    </div>
  );
};

export default SearchBar;