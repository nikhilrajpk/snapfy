import React from 'react';
import { ChevronRight } from 'lucide-react';

const StoryCircle = ({ image, isActive, username }) => {
  return (
    <div className="flex flex-col items-center space-y-1 ">
      <div className={`w-16 h-16 rounded-full p-0.5 ${isActive ? 'bg-[#198754]' : 'bg-gray-200'}`}>
        <img src={image || "/api/placeholder/60/60"} 
             alt={username || "User"} 
             className="w-full h-full object-cover rounded-full border-2 border-white" />
      </div>
      <span className="text-xs text-gray-600">{username}</span>
    </div>
  );
};

const Stories = () => {
  // Mock data for stories
  const stories = [
    { id: 1, username: 'you', image: '/api/placeholder/60/60', isActive: false, isUser: true },
    { id: 2, username: 'user1', image: '/api/placeholder/60/60', isActive: true },
    { id: 3, username: 'user2', image: '/api/placeholder/60/60', isActive: false },
    { id: 4, username: 'user3', image: '/api/placeholder/60/60', isActive: true },
    { id: 5, username: 'user4', image: '/api/placeholder/60/60', isActive: true },
    { id: 6, username: 'user5', image: '/api/placeholder/60/60', isActive: true },
    { id: 7, username: 'user6', image: '/api/placeholder/60/60', isActive: true },
    { id: 8, username: 'user7', image: '/api/placeholder/60/60', isActive: true },
    { id: 9, username: 'user8', image: '/api/placeholder/60/60', isActive: true },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm relative">
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {stories.map(story => (
          <StoryCircle 
            key={story.id} 
            image={story.image} 
            isActive={story.isActive}
            username={story.username}
          />
        ))}
      </div>
      
      <button className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-[#198754] text-white flex items-center justify-center shadow-md">
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

<style >{`
    .overflow-y-scroll::-webkit-scrollbar {
      display: none;
    }
`}</style>

export default Stories;