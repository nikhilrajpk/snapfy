import React from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';

const Post = ({ username, profileImage, image, likes, description, hashtags, commentCount }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Post image */}
      <div className="w-full">
        <img src={image} alt="Post" className="w-full h-64 object-cover" />
      </div>
      
      {/* Post actions */}
      <div className="p-4">
        <div className="flex justify-between mb-3">
          <div className="flex space-x-4">
            <button className="text-gray-600 hover:text-red-500 transition-colors">
              <Heart size={24} />
            </button>
            <button className="text-gray-600 hover:text-blue-500 transition-colors">
              <MessageSquare size={24} />
            </button>
            <button className="text-gray-600 hover:text-green-500 transition-colors">
              <Share2 size={24} />
            </button>
          </div>
          <button className="text-gray-600 hover:text-orange-500 transition-colors">
            <Bookmark size={24} className="fill-white text-[#198754]" />
          </button>
        </div>
        
        {/* Likes count */}
        <div className="text-gray-700 font-medium mb-2">
          {likes.toLocaleString()} likes
        </div>
        
        {/* Post caption */}
        <div className="mb-2">
          <span className="font-semibold text-gray-800 mr-2">{username}</span>
          <span className="text-gray-600">{description}</span>
        </div>
        
        {/* Hashtags */}
        <div className="mb-3">
          {hashtags.map(tag => (
            <span key={tag} className="text-[#198754] mr-1">#{tag}</span>
          ))}
        </div>
        
        {/* View comments */}
        <div className="text-gray-500 text-sm mb-3 cursor-pointer hover:text-gray-700">
          view all {commentCount} comments
        </div>
        
        {/* Add comment */}
        <div className="text-gray-500 border-t pt-3">
          Add new comment...
        </div>
      </div>
    </div>
  );
};

export default Post;