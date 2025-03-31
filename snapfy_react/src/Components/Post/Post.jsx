import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
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
          await userLogout();
          dispatch(logout());
          navigate('/');
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

  const handleLike = async () => {
    try {
      const response = await likePost(id);
      // Assuming likePost returns { is_liked: boolean, likes: number }
      setIsLiked(response.is_liked); // Use is_liked instead of exists
      setLikes(response.likes);
      dispatch(showToast({ message: response.is_liked ? 'Post liked' : 'Post unliked', type: 'success' }));
    } catch (error) {
      if (error.response?.status === 401) {
        await userLogout();
        dispatch(logout());
        navigate('/');
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
        await userLogout();
        dispatch(logout());
        navigate('/');
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        console.error('Error saving/removing post:', error);
        setSaved(saved); // Revert on error
        dispatch(showToast({ message: 'Error saving/removing post', type: 'error' }));
      }
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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => alert('Post link copied!'));
                }}
                className="text-gray-600 hover:text-green-500 transition-colors"
              >
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
    </>
  );
};

export default Post;