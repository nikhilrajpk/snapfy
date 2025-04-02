import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Bookmark, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, removeSavedPost, isSavedPost, likePost, isLikedPost, getLikeCount } from '../../API/postAPI';
import { showToast } from '../../redux/slices/toastSlice';
import PostPopup from './PostPopUp';
import { createPortal } from 'react-dom';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { getRelativeTime } from '../../utils/timeUtils/getRelativeTime';
import { userLogout } from '../../API/authAPI';
import { logout } from '../../redux/slices/userSlice';
import axiosInstance from '../../axiosInstance';

const Post = ({
  id,
  username,
  profileImage,
  image,
  likes: initialLikes,
  caption,
  hashtags = [],
  mentions = [],
  commentCount: initialCommentCount,
  created_at,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [saved, setSaved] = useState(false);
  const [savedPostId, setSavedPostId] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!id || !user?.id) {
        console.log('Missing post ID or user ID, skipping checks');
        return;
      }

      try {
        const savedResponse = await isSavedPost({ post: id, user: user.id });
        setSaved(savedResponse.exists || false);
        setSavedPostId(savedResponse.savedPostId || null);

        const likedResponse = await isLikedPost({ post: id, user: user.id });
        setIsLiked(likedResponse.exists);

        const countResponse = await getLikeCount(id);
        setLikes(countResponse.likes);
      } catch (error) {
        if (error.response?.status === 401) {
          // await userLogout();
          // dispatch(logout());
          // navigate('/');
          dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
        } else {
          console.error('Error checking initial status:', error);
          setSaved(false);
          setSavedPostId(null);
          setIsLiked(false);
          setLikes(initialLikes);
        }
      }
    };

    checkInitialStatus();
  }, [id, user?.id, initialLikes]);

  useEffect(() => {
    const fetchRecentChats = async () => {
      try {
        const response = await axiosInstance.get('/chatrooms/my-chats/');
        setRecentChats(response.data.slice(0, 5)); // Limit to 5 recent chats
      } catch (error) {
        console.error('Error fetching recent chats:', error);
      }
    };
    if (isShareModalOpen) fetchRecentChats();
  }, [isShareModalOpen]);

  const handleLike = async () => {
    try {
      const response = await likePost(id);
      
      setIsLiked(response.is_liked);
      setLikes(response.likes);
      dispatch(showToast({ message: response.is_liked ? 'Post liked' : 'Post unliked', type: 'success' }));
    } catch (error) {
      if (error.response?.status === 401) {
        // await userLogout();
        // dispatch(logout());
        // navigate('/');
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        dispatch(showToast({ message: 'Failed to like post', type: 'error' }));
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!saved) {
        const response = await savePost({ post: id, user: user.id });
        setSaved(true);
        setSavedPostId(response.id);
        dispatch(showToast({ message: `Post "${caption}" saved successfully`, type: 'success' }));
      } else {
        await removeSavedPost(savedPostId);
        setSaved(false);
        setSavedPostId(null);
        dispatch(showToast({ message: 'Post removed from saved list', type: 'success' }));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // await userLogout();
        // dispatch(logout());
        // navigate('/');
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        console.error('Error saving/removing post:', error);
        setSaved(saved); // Revert on error
        dispatch(showToast({ message: 'Error saving/removing post', type: 'error' }));
      }
    }
  };

  const handleSearchUsers = async (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/chatrooms/search-users/?q=${encodeURIComponent(term)}`);
      setSearchResults(response.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleSharePost = async (recipientId, roomId = null) => {
    try {
      let chatRoomId = roomId;
      if (!chatRoomId) {
        const response = await axiosInstance.post('/chatrooms/start-chat/', { username: recipientId });
        chatRoomId = response.data.id;
      }

      const messageContent = `Shared post: ${window.location.origin}/post/${id}`;
      const formData = new FormData();
      formData.append('content', messageContent);
      await axiosInstance.post(`/chatrooms/${chatRoomId}/send-message/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      dispatch(showToast({ message: 'Post shared successfully', type: 'success' }));
      setIsShareModalOpen(false);
      // navigate(`/messages/${chatRoomId}`);
    } catch (error) {
      console.error('Error sharing post:', error);
      dispatch(showToast({ message: 'Failed to share post', type: 'error' }));
    }
  };

  const openPostPopup = () => {
    setIsPopupOpen(true);
  };

  const closePostPopup = () => {
    setIsPopupOpen(false);
  };

  const handleCommentCountChange = (newCommentCount) => {
    setCommentCount(newCommentCount); // Update comment count from popup
  };

  // Callback to update like status from PostPopup
  const handleLikeChange = (newLikes, newIsLiked) => {
    setLikes(newLikes);
    setIsLiked(newIsLiked);
  };

  const renderMedia = () => {
    if (!image) return null;
    const mediaProps = {
      className: 'w-full h-96 object-contain',
      loading: 'lazy',
      alt: `Post by ${username}`,
    };
    if (image.includes('video/upload/')) {
      return <video src={image} controls muted {...mediaProps} />;
    }
    return <img src={image} {...mediaProps} />;
  };

  const renderHashtags = () => (
    <div className="mb-3">
      {hashtags.map((tag, idx) => (
        <span key={idx} className="text-[#198754] mr-1">
          #{tag}
        </span>
      ))}
    </div>
  );

  const renderMentions = () => (
    <div className="mb-3">
      {mentions.map((m, idx) => (
        <span
          key={idx}
          onClick={() => navigate(`/user/${m}`)}
          className="cursor-pointer text-[#198754] mr-1 hover:underline"
        >
          @{m}
        </span>
      ))}
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Post Media */}
        <div className="w-full">{renderMedia()}</div>

        {/* Post Actions */}
        <div className="p-4">
          <div className="flex justify-between mb-3">
            <div className="flex space-x-4">
              <button
                onClick={handleLike}
                className={`text-gray-600 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <Heart size={24} fill={isLiked ? '#FF0000' : 'none'} stroke={isLiked ? '#FF0000' : 'currentColor'} />
              </button>
              <button
                onClick={openPostPopup}
                className="text-gray-600 hover:text-blue-500 transition-colors"
              >
                <MessageSquare size={24} />
              </button>
              <button onClick={() => setIsShareModalOpen(true)} className="text-gray-600 hover:text-green-500 transition-colors">
                <Share2 size={24} />
              </button>
            </div>
            <button
              onClick={handleSave}
              className={`text-gray-600 transition-colors ${saved ? 'text-orange-500' : 'hover:text-orange-500'}`}
            >
              <Bookmark size={24} fill={saved ? '#1E3932' : 'none'} stroke={saved ? '#1E3932' : 'currentColor'} />
            </button>
          </div>

          {/* Likes, Comment Count, and Time */}
          <div className="text-gray-700 font-medium mb-2">
            {likes.toLocaleString()} likes • {commentCount} comments •{' '}
            <span className="text-gray-500">{getRelativeTime(created_at)}</span>
          </div>

          {/* Post Caption */}
          <div className="mb-2 flex gap-2 items-center">
            <img
              src={`${CLOUDINARY_ENDPOINT}${profileImage}`}
              alt={`${username}'s profile`}
              className="w-8 h-8 rounded-full object-cover"
              loading="lazy"
              onClick={() => navigate(`/user/${username}`)}
            />
            <div>
              <span
                className="font-semibold text-gray-800 mr-2 cursor-pointer hover:underline"
                onClick={() => navigate(`/user/${username}`)}
              >
                {username}
              </span>
              <span className="text-gray-600">{caption}</span>
            </div>
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && renderHashtags()}

          {/* Mentions */}
          {mentions.length > 0 && renderMentions()}
        </div>
      </div>

      {/* Post Popup */}
      {isPopupOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50">
            <PostPopup
              post={{
                id,
                file: image,
                caption,
                likes,
                comment_count: commentCount,
                user: { username, profile_picture: profileImage },
                created_at,
                is_liked: isLiked, // Pass initial like status
              }}
              userData={{
                username,
                profileImage,
              }}
              isOpen={isPopupOpen}
              onClose={closePostPopup}
              onLikeChange={handleLikeChange}
              onCommentCountChange={handleCommentCountChange}
            />
          </div>,
          document.body
        )}

      {/* Share modal */}
      {isShareModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsShareModalOpen(false)}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Share Post</h3>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-[#198754]"
                value={searchTerm}
                onChange={e => handleSearchUsers(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              {searchResults.length > 0 && (
                <div className="absolute bg-white shadow-lg rounded-lg mt-2 w-full max-h-40 overflow-y-auto z-20">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onClick={() => handleSharePost(u.username)}
                    >
                      <img src={`${CLOUDINARY_ENDPOINT}${u?.profile_picture}`} className='w-5 object-contain rounded-full'/>
                      <span>{u.username}</span>
                      <button className="text-[#198754] hover:text-[#157a47]">Send</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Recent Chats</h4>
              {recentChats.length > 0 ? (
                recentChats.map(room => {
                  const otherUser = room.users.find(u => u.id !== user.id);
                  return (
                    <div
                      key={room.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onClick={() => handleSharePost(otherUser.username, room.id)}
                    >
                      <img src={`${CLOUDINARY_ENDPOINT}${otherUser?.profile_picture}`} className='w-5 object-contain rounded-full'/>
                      <span>{room.is_group ? room.group_name : otherUser?.username}</span>
                      <button className="text-[#198754] hover:text-[#157a47]">Send</button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-600">No recent chats</p>
              )}
            </div>
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="mt-4 w-full bg-gray-500 text-white py-2 rounded-full hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Post;