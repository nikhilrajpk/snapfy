import React, { useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { UserPlus, Shield, Flag, Grid, PlaySquare, Bookmark, Archive, Play, Heart, MessageCircle, UserMinus } from 'lucide-react';
import SideBar from '../Navbar/SideBar';
import PostPopup from '../Post/PostPopUp';
import { showToast } from '../../redux/slices/toastSlice';
import { setUser } from '../../redux/slices/userSlice';
import { followUser, unfollowUser, getUser } from '../../API/authAPI';

const ProfilePage = ({ isLoggedInUser, userData: initialUserData, onPostDeleted, onSaveChange, onUserUpdate }) => {
  const [showFollowModal, setShowFollowModal] = useState(null);
  const [followList, setFollowList] = useState([]);
  const [userData, setUserData] = useState(initialUserData);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // console.log('ProfilePage initialUserData:', initialUserData);
  // console.log('ProfilePage logged-in user:', user);

  useEffect(() => {
    if (isLoggedInUser && user && (!userData.followers || !userData.following)) {
      const fetchFullUserData = async () => {
        try {
          const fullUserData = await getUser(user.username);
          setUserData(fullUserData);
          dispatch(setUser(fullUserData));
        } catch (error) {
          console.error('Error fetching full user data:', error);
        }
      };
      fetchFullUserData();
    }
  }, [isLoggedInUser, user, userData.followers, userData.following, dispatch]);

  const fetchFollowList = (type) => {
    const usernames = type === 'followers' ? userData?.followers : userData?.following;
    // console.log(`Fetching ${type} list:`, usernames);
    setFollowList(usernames?.map(username => ({ id: username, username })) || []);
    setShowFollowModal(type);
  };

  const closeModal = () => {
    setShowFollowModal(null);
    setFollowList([]);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-orange-100 to-amber-100 relative"></div>
          <div className="px-6 pb-6 relative">
            {isLoggedInUser ? (
              <LoggedInUserProfile 
                userData={userData} 
                onPostDeleted={onPostDeleted} 
                onSaveChange={onSaveChange} 
                fetchFollowList={fetchFollowList}
              />
            ) : (
              <OtherUserProfile 
                userData={userData} 
                onUserUpdate={onUserUpdate} 
                fetchFollowList={fetchFollowList}
              />
            )}
          </div>
        </div>
      </div>
      {showFollowModal && (
        <FollowModal type={showFollowModal} list={followList} onClose={closeModal} />
      )}
    </div>
  );
};

const LoggedInUserProfile = ({ userData, onPostDeleted, onSaveChange, fetchFollowList }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  const { user } = useSelector(state => state.user);
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md hover:scale-[3] hover:relative hover:translate-x-28 hover:translate-y-10 duration-700">
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
      <div className="mb-8">
        <p className="text-gray-800 whitespace-pre-line">{userData?.bio || "No bio available"}</p>
      </div>
      <ProfileStatsCards 
        posts={userData?.postCount} 
        followers={userData?.followerCount || userData?.follower_count} 
        following={userData?.followingCount || userData?.following_count} 
        fetchFollowList={fetchFollowList}
      />
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={true} 
        showSaved={true}
      />
      <ProfileContent 
        posts={userData?.posts} 
        userData={userData} 
        type={activeTab.toLowerCase()} 
        onPostDeleted={onPostDeleted} 
        onSaveChange={onSaveChange} 
      />
    </div>
  );
};

const OtherUserProfile = ({ userData, onUserUpdate, fetchFollowList }) => {
  const [activeTab, setActiveTab] = useState('POSTS');
  const [imageError, setImageError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsBack, setFollowsBack] = useState(false);
  const [followerCount, setFollowerCount] = useState(userData?.followerCount || userData?.follower_count || 0);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncFollowStatus = async () => {
      if (user && userData && isMounted) {
        // console.log('User (logged-in):', user);
        // console.log('UserData (profile):', userData);

        // Only fetch if we don't have following data yet
        let updatedLoggedInUser = user;
        if (!user.following) {
          updatedLoggedInUser = await getUser(user.username);
          dispatch(setUser(updatedLoggedInUser));
        }

        const isUserFollowing = updatedLoggedInUser.following?.includes(userData.username) || false;
        // console.log('isUserFollowing:', isUserFollowing, 'following:', updatedLoggedInUser.following, 'userData.username:', userData.username);
        if (isMounted) setIsFollowing(isUserFollowing);

        const isFollowedBack = userData.following?.includes(user.username) || false;
        // console.log('isFollowedBack:', isFollowedBack, 'userData.following:', userData.following, 'user.username:', user.username);
        if (isMounted) setFollowsBack(isFollowedBack);

        if (isMounted) setFollowerCount(userData.followerCount || userData.follower_count);
      }
    };

    syncFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [user.username, userData.username, dispatch]); // Depend only on stable identifiers

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        const updatedProfileUser = await unfollowUser(userData.username);
        setIsFollowing(false);
        setFollowerCount(updatedProfileUser.follower_count);
        onUserUpdate(updatedProfileUser);
        dispatch(showToast({ message: `Unfollowed ${userData.username}`, type: 'success' }));
        const updatedLoggedInUser = await getUser(user.username);
        dispatch(setUser(updatedLoggedInUser));
        setFollowsBack(userData.following?.includes(user.username) || false);
      } else {
        const updatedProfileUser = await followUser(userData.username);
        setIsFollowing(true);
        setFollowerCount(updatedProfileUser.follower_count);
        onUserUpdate(updatedProfileUser);
        dispatch(showToast({ message: `Now following ${userData.username}`, type: 'success' }));
        const updatedLoggedInUser = await getUser(user.username);
        dispatch(setUser(updatedLoggedInUser));
        setFollowsBack(userData.following?.includes(user.username) || false);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      if (error.response?.status === 400) {
        dispatch(showToast({ message: error.response.data.error || 'Action already performed', type: 'info' }));
      } else {
        dispatch(showToast({ message: 'Failed to update follow status', type: 'error' }));
      }
    }
  };

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md hover:scale-[3] hover:relative hover:translate-x-28 hover:translate-y-10 duration-700">
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
              <button 
                onClick={handleFollowToggle}
                className={`${
                  isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                } px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={16} className="mr-1" />
                    Unfollow
                  </>
                ) : followsBack ? (
                  <>
                    <UserPlus size={16} className="mr-1" />
                    Follow Back
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-1" />
                    Follow
                  </>
                )}
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
      <div className="mb-8">
        <p className="text-gray-800 whitespace-pre-line">{userData?.bio || "No bio available"}</p>
      </div>
      <ProfileStatsCards 
        posts={userData?.postCount} 
        followers={followerCount}
        following={userData?.followingCount || userData?.following_count}
        fetchFollowList={fetchFollowList}
      />
      <ProfileContentTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        showArchived={false} 
        showSaved={false}
      />
      <ProfileContent 
        posts={userData?.posts} 
        userData={userData} 
        type={activeTab.toLowerCase()} 
      />
    </div>
  );
};

const FollowModal = ({ type, list, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4 capitalize">{type}</h2>
      <ul className="max-h-60 overflow-y-auto">
        {list?.length > 0 ? (
          list.map((user) => (
            <li key={user.id} className="py-2 border-b">
              <Link to={`/user/${user.username}`} className="text-gray-800 hover:text-orange-500">
                {user.username}
              </Link>
            </li>
          ))
        ) : (
          <li className="py-2 text-gray-600">No {type} found</li>
        )}
      </ul>
      <button 
        onClick={onClose}
        className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg w-full"
      >
        Close
      </button>
    </div>
  </div>
);

const ProfileStatsCards = ({ posts, followers, following, fetchFollowList }) => (
  <div className="grid grid-cols-3 gap-4 mb-8">
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm">
      <p className="text-gray-600 text-sm font-medium mb-1">POSTS</p>
      <p className="text-2xl font-bold text-gray-800">{posts || 0}</p>
    </div>
    <div 
      className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm cursor-pointer hover:bg-amber-100"
      onClick={() => fetchFollowList('followers')}
    >
      <p className="text-gray-600 text-sm font-medium mb-1">FOLLOWERS</p>
      <p className="text-2xl font-bold text-gray-800">{followers || 0}</p>
    </div>
    <div 
      className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center shadow-sm cursor-pointer hover:bg-amber-100"
      onClick={() => fetchFollowList('following')}
    >
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

const ProfileContent = ({ posts, type, userData, onPostDeleted, onSaveChange }) => {
  const [mediaErrors, setMediaErrors] = useState(new Set());
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleMediaError = useCallback((index) => {
    setMediaErrors(prev => new Set(prev).add(index));
  }, []);

  let filteredPosts = [];
  if (type === 'saved') {
    filteredPosts = (userData?.saved_posts || [])
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .map(saved => saved.post);
  } else if (type === 'archived') {
    filteredPosts = (userData?.archived_posts || [])
      .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at))
      .map(archived => archived.post);
  } else {
    filteredPosts = (posts || []).filter(post => {
      const isVideo = post.file.includes('/video/upload/');
      if (type === 'posts') return true;
      if (type === 'shorts') return isVideo;
      return false;
    });
  }

  // console.log(`ProfileContent type: ${type}, filteredPosts:`, filteredPosts);

  const openPostPopup = (post) => {
    setSelectedPost(post);
    setIsPopupOpen(true);
  };

  const closePostPopup = () => {
    setIsPopupOpen(false);
  };

  const handleVideoLoaded = (e, index) => {
    console.log(`Video ${index} duration loaded:`, e.target.duration);
  };

  const handleVideoError = (e, index) => {
    console.log(`Video ${index} load error:`, e);
    console.log(`Attempted URL:`, e.target.src);
    handleMediaError(index);
  };

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredPosts.map((post, index) => {
          const isVideo = post.file.includes('/video/upload/');
          const mediaUrl = normalizeUrl(post.file);

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
                    autoPlay={false}
                    onLoadedMetadata={(e) => handleVideoLoaded(e, index)}
                    onError={(e) => handleVideoError(e, index)}
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
              <div className="absolute inset-0 bg-[#198754] bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex space-x-4 text-white">
                  <div className="flex items-center">
                    <Heart size={20} fill="white" className="mr-2" />
                    <span className="font-semibold">{post.likes || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageCircle size={20} fill="white" className="mr-2" />
                    <span className="font-semibold">{post.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isPopupOpen && (
        <PostPopup
          post={selectedPost}
          userData={userData}
          isOpen={isPopupOpen}
          onClose={closePostPopup}
          onPostDeleted={onPostDeleted}
          onSaveChange={onSaveChange}
        />
      )}
    </>
  );
};

export default React.memo(ProfilePage);