import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, removeSavedPost, isSavedPost } from '../../API/postAPI';
import { showToast } from '../../redux/slices/toastSlice';

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
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedPostId, setSavedPostId] = useState(null);

  // Check initial saved status
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!id || !user?.id) {
        console.log('Missing post ID or user ID, skipping save check');
        return;
      }

      try {
        const response = await isSavedPost({ post: id, user: user.id });
        console.log('isSavedPost response in Post:', response);
        setSaved(response.exists || false); // Fallback to false if undefined
        setSavedPostId(response.savedPostId || null);
      } catch (error) {
        console.error('Error checking saved status:', error);
        setSaved(false);
        setSavedPostId(null);
      }
    };

    checkSavedStatus();
  }, [id, user?.id]);

  // Handle like toggle
  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikes((prevLikes) => (isLiked ? prevLikes - 1 : prevLikes + 1));
  };

  // Handle save/remove save
  const handleSave = async () => {
    if (!saved) {
      setSaved(true);
      try {
        const response = await savePost({ post: id });
        console.log('Saved post response:', response);
        setSavedPostId(response.id); // Use 'id' from response
        dispatch(showToast({ message: `Post "${caption}" saved successfully`, type: 'success' }));
      } catch (error) {
        console.error('Error saving post:', error.response?.data || error.message);
        setSaved(false);
        dispatch(showToast({ message: 'Error saving post', type: 'error' }));
      }
    } else {
      setSaved(false);
      if (!savedPostId) {
        console.error('No SavedPost ID available to remove');
        dispatch(showToast({ message: 'Error: Saved post ID not found', type: 'error' }));
        return;
      }
      try {
        const response = await removeSavedPost(savedPostId);
        console.log('Remove saved post response:', response);
        setSavedPostId(null);
        dispatch(showToast({
          message: response.message || 'Post removed from saved list',
          type: 'success',
        }));
      } catch (error) {
        console.error('Error removing post from saved list:', error.response?.data || error.message);
        setSaved(true); // Revert if error occurs
        dispatch(showToast({
          message: 'Error removing post from saved list',
          type: 'error',
        }));
      }
    }
  };

  // Handle comment submission
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      setCommentCount((prevCount) => prevCount + 1);
      setNewComment('');
    }
  };

  // Handle media rendering with fallback
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

  // Render hashtags with clickable links
  const renderHashtags = () => (
    <div className="mb-3">
      {hashtags.map((tag, idx) => (
        <span key={idx} className="text-[#198754] mr-1">
          #{tag}
        </span>
      ))}
    </div>
  );

  // Render mentions with clickable user links
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
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Post Media */}
      <div className="w-full">{renderMedia()}</div>

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex justify-between mb-3">
          <div className="flex space-x-4">
            <button
              onClick={handleLikeToggle}
              className={`text-gray-600 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart size={24} fill={isLiked ? '#FF0000' : 'none'} stroke={isLiked ? '#FF0000' : 'currentColor'} />
            </button>
            <button
              onClick={() => navigate(`/post/${id}/comments`)}
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

        {/* Likes Count */}
        <div className="text-gray-700 font-medium mb-2">{likes.toLocaleString()} likes</div>

        {/* Post Caption */}
        <div className=" Wmb-2 flex gap-2 items-center">
          <img
            src={profileImage}
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

        {/* View Comments */}
        <div
          onClick={() => navigate(`/post/${id}/comments`)}
          className="text-gray-500 text-sm mb-3 cursor-pointer hover:text-gray-700"
        >
          View all {commentCount} comments
        </div>

        {/* Add Comment */}
        <form onSubmit={handleCommentSubmit} className="text-gray-500 border-t pt-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#198754] rounded-lg p-2"
          />
        </form>
      </div>
    </div>
  );
};

export default Post;