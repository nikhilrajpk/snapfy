import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Post = ({ 
  id,
  username, 
  profileImage, 
  image, 
  likes: initialLikes, 
  description, 
  hashtags = [], 
  mentions = [], 
  commentCount: initialCommentCount 
}) => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');

  // Handle like toggle
  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikes(prevLikes => isLiked ? prevLikes - 1 : prevLikes + 1);
  };

  // Handle comment submission
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      // In a real app, you'd send this to backend
      setCommentCount(prevCount => prevCount + 1);
      setNewComment('');
    }
  };

  // Handle media rendering with fallback
  const renderMedia = () => {
    if (!image) return null;

    const mediaProps = {
      className: "w-full h-96 object-contain",
      loading: "lazy",
      alt: `Post by ${username}`
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
        <span 
          key={idx} 
          className="text-[#198754] mr-1"
        >
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
      <div className="w-full">
        {renderMedia()}
      </div>
      
      {/* Post Actions */}
      <div className="p-4">
        <div className="flex justify-between mb-3">
          <div className="flex space-x-4">
            <button 
              onClick={handleLikeToggle}
              className={`text-gray-600 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart 
                size={24} 
                fill={isLiked ? '#FF0000' : 'none'}
                stroke={isLiked ? '#FF0000' : 'currentColor'}
              />
            </button>
            <button 
              onClick={() => navigate(`/post/${id}/comments`)}
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              <MessageSquare size={24} />
            </button>
            <button 
              onClick={() => {
                // Implement share functionality
                navigator.clipboard.writeText(window.location.href)
                  .then(() => alert('Post link copied!'));
              }}
              className="text-gray-600 hover:text-green-500 transition-colors"
            >
              <Share2 size={24} />
            </button>
          </div>
          <button className="text-gray-600 hover:text-orange-500 transition-colors">
            <Bookmark size={24} />
          </button>
        </div>
        
        {/* Likes Count */}
        <div className="text-gray-700 font-medium mb-2">
          {likes.toLocaleString()} likes
        </div>
        
        {/* Post Caption */}
        <div className="mb-2 flex gap-2 items-center">
          <img 
            src={profileImage} 
            alt={`${username}'s profile`}
            className='w-8 h-8 rounded-full object-cover'
            loading='lazy'
            onClick={() => navigate(`/user/${username}`)}
          />
          <div>
            <span 
              className="font-semibold text-gray-800 mr-2 cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${username}`)}
            >
              {username}
            </span>
            <span className="text-gray-600">{description}</span>
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