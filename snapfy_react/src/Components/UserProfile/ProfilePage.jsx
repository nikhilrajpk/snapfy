import React, { useState } from 'react';
import Navbar from '../Navbar/Navbar';
import Logo from '../Logo/Logo';
import { Link } from 'react-router-dom';

// Main Profile Page component that handles both logged-in and other user profiles
const ProfilePage = ({ isLoggedInUser, userData }) => {
  return (
    <div className="flex">
      {/* Placeholder for Navbar component */}
      {/* Left sidebar - 2 columns */}
      <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Logo />
              <Navbar />
            </div>
      </div>
      
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg p-6">
        {isLoggedInUser ? (
          <LoggedInUserProfile userData={userData} />
        ) : (
          <OtherUserProfile userData={userData} />
        )}
      </div>
    </div>
  );
};

// Component for logged-in user's profile
const LoggedInUserProfile = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  
  return (
    <div className="w-full">
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden mr-4">
          <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{userData.username}</h2>
            <Link to={'/:username/edit-profile'} className="bg-gray-800 text-white px-4 py-1 rounded-full text-sm">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
      
      <ProfileStats 
        posts={userData.postCount} 
        followers={userData.followerCount} 
        following={userData.followingCount} 
      />
      
      <ProfileBio 
        bioText={userData.bio}
        websiteUrl={userData.website}
      />
      
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={true} 
        showSaved={true}
      />
      
      <ProfileContent posts={userData.posts} type={activeTab.toLowerCase()} />
    </div>
  );
};

// Component for other users' profiles
const OtherUserProfile = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  
  return (
    <div className="w-full">
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden mr-4">
          <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{userData.username}</h2>
            <div className="flex gap-2">
              <button className="bg-gray-800 text-white px-4 py-1 rounded-full text-sm">
                Block
              </button>
              <button className="bg-gray-800 text-white px-4 py-1 rounded-full text-sm">
                Report
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <ProfileStats 
        posts={userData.postCount} 
        followers={userData.followerCount} 
        following={userData.followingCount} 
      />
      
      <ProfileBio 
        bioText={userData.bio}
        websiteUrl={userData.website}
      />
      
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={false} 
        showSaved={false}
      />
      
      <ProfileContent posts={userData.posts} type={activeTab.toLowerCase()} />
    </div>
  );
};

// Reusable component for profile stats
const ProfileStats = ({ posts, followers, following }) => {
  return (
    <div className="flex justify-around py-4">
      <div className="text-center">
        <p className="font-bold">POSTS</p>
        <p className="text-lg">{posts}</p>
      </div>
      <div className="text-center">
        <p className="font-bold">FOLLOWERS</p>
        <p className="text-lg">{followers}</p>
      </div>
      <div className="text-center">
        <p className="font-bold">FOLLOWING</p>
        <p className="text-lg">{following}</p>
      </div>
    </div>
  );
};

// Reusable component for profile bio
const ProfileBio = ({ bioText, websiteUrl }) => {
  return (
    <div className="mb-6">
      <p className="text-gray-800">Bio: {bioText}</p>
      <a href={websiteUrl} className="text-blue-500 hover:underline">{websiteUrl}</a>
    </div>
  );
};

// Reusable component for profile content tabs
const ProfileContentTabs = ({ activeTab, setActiveTab, showSaved, showArchived }) => {
  return (
    <div className="border-t border-b py-2 mb-4">
      <div className="flex">
        <TabButton 
          label="POSTS" 
          isActive={activeTab === 'POSTS'} 
          onClick={() => setActiveTab('POSTS')} 
        />
        <TabButton 
          label="SHORTS" 
          isActive={activeTab === 'SHORTS'} 
          onClick={() => setActiveTab('SHORTS')} 
        />
        {showSaved && (
          <TabButton 
            label="SAVED" 
            isActive={activeTab === 'SAVED'} 
            onClick={() => setActiveTab('SAVED')} 
          />
        )}
        {showArchived && (
          <TabButton 
            label="ARCHIVED" 
            isActive={activeTab === 'ARCHIVED'} 
            onClick={() => setActiveTab('ARCHIVED')} 
          />
        )}
      </div>
    </div>
  );
};

// Tab button component for the content tabs
const TabButton = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-center py-2 font-medium ${
        isActive 
          ? 'border-b-2 border-black' 
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );
};

// Component to display the profile content based on active tab
const ProfileContent = ({ posts, type }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {posts.map((post, index) => (
        <div key={index} className="aspect-square overflow-hidden rounded">
          <img 
            src={post.imageUrl} 
            alt={`Post ${index + 1}`} 
            className="w-full h-full object-cover" 
          />
        </div>
      ))}
    </div>
  );
};


export default ProfilePage;