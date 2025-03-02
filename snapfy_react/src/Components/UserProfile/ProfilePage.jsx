import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { UserPlus, Shield, Flag, Grid, PlaySquare, Bookmark, Archive, Play, Heart, MessageCircle } from 'lucide-react';

import Logo from '../Logo/Logo';
import Navbar from '../Navbar/Navbar';
import PostPopup from '../Post/PostPopUp';

const ProfilePage = ({ isLoggedInUser, userData }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar with Logo and Navbar */}
      <div className="w-56 border-r border-gray-200 hidden lg:block">
        <div className="sticky top-0 p-4 h-screen">
          <div className="mb-3 mt-2 ml-[-6px]">
            <Logo />
          </div>
          <Navbar />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Profile header with background image */}
          <div className="h-40 bg-gradient-to-r from-orange-100 to-amber-100 relative"></div>
          
          <div className="px-6 pb-6 relative">
            {isLoggedInUser ? (
              <LoggedInUserProfile userData={userData} />
            ) : (
              <OtherUserProfile userData={userData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoggedInUserProfile = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  const { user } = useSelector(state => state.user);
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  return (
    <div className="w-full">
      {/* Profile image and actions row */}
      <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
          <img 
            src={imageError ? '/default-profile.png' : userData?.profileImage}
            alt="Profile" 
            loading="lazy" 
            className="w-full h-full object-cover" 
            onError={handleImageError}
          />
        </div>
        
        <div className="flex-grow mt-4 md:mt-0 md:ml-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{userData?.username}</h1>
              {fullName && <h2 className="text-lg text-gray-700 font-medium">{fullName}</h2>}
            </div>
            
            <Link 
              to={`/${user?.username}/profile/update`} 
              className="mt-3 md:mt-0 bg-gradient-to-r from-[#1E3932] to-[#198754] hover:from-[#198754] hover:to-[#1E3932] duration-500 hover:scale-110 text-white px-6 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="mb-8">
        <p className="text-gray-800 whitespace-pre-line">
          {userData?.bio || "No bio available"}
        </p>
      </div>
      
      {/* Stats cards */}
      <ProfileStatsCards 
        posts={userData?.postCount} 
        followers={userData?.followerCount} 
        following={userData?.followingCount} 
      />
      
      {/* Content tabs */}
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={true} 
        showSaved={true}
      />
      
      <ProfileContent posts={userData?.posts} userData={userData} type={activeTab.toLowerCase()} />
    </div>
  );
};

const OtherUserProfile = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  return (
    <div className="w-full">
      {/* Profile image and actions row */}
      <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
          <img 
            src={imageError ? '/default-profile.png' : userData?.profileImage}
            alt="Profile" 
            loading="lazy" 
            className="w-full h-full object-cover" 
            onError={handleImageError}
          />
        </div>
        
        <div className="flex-grow mt-4 md:mt-0 md:ml-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{userData?.username}</h1>
              {fullName && <h2 className="text-lg text-gray-700 font-medium">{fullName}</h2>}
            </div>
            
            <div className="flex gap-2 mt-3 md:mt-0">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center">
                <UserPlus size={16} className="mr-1" />
                Follow
              </button>
              <button className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition duration-200">
                <Flag size={16} />
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition duration-200">
                <Shield size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="mb-8">
        <p className="text-gray-800 whitespace-pre-line">
          {userData?.bio || "No bio available"}
        </p>
      </div>
      
      {/* Stats cards */}
      <ProfileStatsCards 
        posts={userData?.postCount} 
        followers={userData?.followerCount} 
        following={userData?.followingCount} 
      />
      
      {/* Content tabs */}
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={false} 
        showSaved={false}
      />
      
      <ProfileContent posts={userData?.posts} userData={userData} type={activeTab.toLowerCase()} />
    </div>
  );
};

const ProfileStatsCards = ({ posts, followers, following }) => (
  <div className="grid grid-cols-3 gap-4 mb-8">
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm">
      <p className="text-gray-600 text-sm font-medium mb-1">POSTS</p>
      <p className="text-2xl font-bold text-gray-800">{posts || 0}</p>
    </div>
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm">
      <p className="text-gray-600 text-sm font-medium mb-1">FOLLOWERS</p>
      <p className="text-2xl font-bold text-gray-800">{followers || 0}</p>
    </div>
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm">
      <p className="text-gray-600 text-sm font-medium mb-1">FOLLOWING</p>
      <p className="text-2xl font-bold text-gray-800">{following || 0}</p>
    </div>
  </div>
);

const ProfileContentTabs = ({ activeTab, setActiveTab, showSaved, showArchived }) => {
  const tabs = [
    { label: 'POSTS', value: 'POSTS', icon: <Grid size={18} /> },
    { label: 'SHORTS', value: 'SHORTS', icon: <PlaySquare size={18} /> },
    ...(showSaved ? [{ label: 'SAVED', value: 'SAVED', icon: <Bookmark size={18} /> }] : []),
    ...(showArchived ? [{ label: 'ARCHIVED', value: 'ARCHIVED', icon: <Archive size={18} /> }] : []),
  ];

  return (
    <div className="border-t border-b border-gray-200 mb-6">
      <div className="flex">
        {tabs.map(tab => (
          <TabButton
            key={tab.value}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          />
        ))}
      </div>
    </div>
  );
};

const TabButton = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center py-3 font-medium transition duration-200 ${
      isActive 
        ? 'border-b-2 border-orange-500 text-orange-500' 
        : 'text-gray-500 hover:text-gray-800'
    }`}
  >
    {icon && <span className="mr-2">{icon}</span>}
    {label}
  </button>
);

const ProfileContent = ({ posts, type, userData }) => {
  const [mediaErrors, setMediaErrors] = useState(new Set());
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleMediaError = useCallback((index) => {
    setMediaErrors(prev => new Set(prev).add(index));
  }, []);

  // Filter posts based on type
  const filteredPosts = (posts || []).filter(post => {
    const isVideo = post.file.includes('/video/upload/');
    if (type === 'posts') return true; // Show all (images and videos)
    if (type === 'shorts') return isVideo; // Show only videos
    if (type === 'saved' || type === 'archived') return true;
    return false;
  });

  // Open the post popup
  const openPostPopup = (post) => {
    setSelectedPost(post);
    setIsPopupOpen(true);
  };

  // Close the post popup
  const closePostPopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredPosts.map((post, index) => {
          const isVideo = post.file.includes('/video/upload/');
          const mediaUrl = post.file.replace('auto/upload/', ''); // Adjust Cloudinary URL if needed

          return (
            <div 
              key={index} 
              className="aspect-square overflow-hidden rounded-xl shadow-sm hover:shadow-md transition duration-200 group cursor-pointer relative"
              onClick={() => openPostPopup(post)}
            >
              {isVideo ? (
                <>
                  <video
                    src={mediaErrors.has(index) ? '/default-post.png' : mediaUrl}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
                    muted
                    autoPlay={false} // Paused by default
                    onError={() => handleMediaError(index)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-100 transition-opacity duration-200 bg-transparent bg-opacity-30">
                    <Play size={40} fill='#1E3932' className="text-[#1E3932]" />
                  </div>
                </>
              ) : (
                <img 
                  src={mediaErrors.has(index) ? '/default-post.png' : mediaUrl}
                  alt={`Post ${index + 1}`} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" 
                  loading="lazy"
                  onError={() => handleMediaError(index)}
                />
              )}
              
              {/* Hover overlay with likes and comments info */}
              <div className="absolute inset-0 bg-[#198754] bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex space-x-4 text-white">
                  <div className="flex items-center">
                    <Heart size={20} fill="white" className="mr-2" />
                    <span className="font-semibold">{post.likes || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageCircle size={20} fill="white" className="mr-2" />
                    <span className="font-semibold">{post.comments?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post popup component */}
      {isPopupOpen && (
        <PostPopup
          post={selectedPost}
          userData={userData}
          isOpen={isPopupOpen}
          onClose={closePostPopup}
          currentUser={{ username: 'current_user' }} // Replace with your authenticated user
        />
      )}
    </>
  );
};


export default React.memo(ProfilePage);