import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Shield, Flag, Grid, PlaySquare, Bookmark, Archive, Play, Heart, MessageCircle, UserMinus, Search } from 'lucide-react';
import SideBar from '../Navbar/SideBar';
import PostPopup from '../Post/PostPopUp';
import { showToast } from '../../redux/slices/toastSlice';
import { setUser } from '../../redux/slices/userSlice';
import { followUser, unfollowUser, getUser, blockUser, unblockUser } from '../../API/authAPI';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import axiosInstance from '../../axiosInstance';

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
          const fullUserData = await getUser(user?.username);
          setUserData(fullUserData);
          dispatch(setUser(fullUserData));
        } catch (error) {
          console.error('Error fetching full user data:', error);
        }
      };
      fetchFullUserData();
    }
  }, [isLoggedInUser, user, userData.followers, userData.following, dispatch]);

  const fetchFollowList = (type, customList = null) => {
    let userList;
    if (customList) {
      userList = customList;
    } else {
      userList = (type === 'followers' ? userData?.followers : userData?.following) || [];
    }
    const formattedList = userList.map(user => ({
      id: user?.username,
      username: user?.username,
      profile_picture: user.profile_picture ? `${CLOUDINARY_ENDPOINT}${user.profile_picture}` : '/default-profile.png'
    }));
    setFollowList(formattedList);
    setShowFollowModal(type || 'mutual followers'); // Use type or default to 'mutual followers'
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
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [followerCount, setFollowerCount] = useState(userData?.followerCount || userData?.follower_count || 0);
  const [isBlocked, setIsBlocked] = useState(false); // Logged-in user blocked profile owner
  const [isBlockedByUser, setIsBlockedByUser] = useState(false); // Profile owner blocked logged-in user
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [hasReported, setHasReported] = useState(false);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkReportStatus = async () => {
      if (user && userData) {
        try {
          const response = await axiosInstance.get('/check-report-status/', {
            params: { reported_username: userData?.username }
          });
          if (isMounted) {
            setHasReported(response.data.has_reported);
          }
        } catch (error) {
          console.error('Error checking report status:', error);
        }
      }
    };

    checkReportStatus();
  
    const syncFollowStatus = async () => {
      if (user && userData && isMounted) {
        const updatedLoggedInUser = await getUser(user?.username);
        dispatch(setUser(updatedLoggedInUser));
  
        console.log(`${updatedLoggedInUser?.username} following:`, updatedLoggedInUser.following);
        console.log(`${userData?.username} username:`, userData?.username);
        const isUserFollowing = updatedLoggedInUser.following?.some(f => f?.username === userData?.username) || false;
        console.log('isUserFollowing:', isUserFollowing);
  
        const isUserBlocked = updatedLoggedInUser.blocked_users?.includes(userData?.username) || false;
        const isBlockedByProfileOwner = userData?.blocked_users?.includes(user?.username) || false;
  
        if (isMounted) {
          setIsFollowing(isUserFollowing);
          setIsBlocked(isUserBlocked);
          setIsBlockedByUser(isBlockedByProfileOwner);
          setFollowerCount(userData?.followerCount || userData?.follower_count);
        }
  
        const isFollowedBack = userData?.following?.some(f => f?.username === user?.username) || false;
        if (isMounted) setFollowsBack(isFollowedBack);
  
        const loggedInFollowing = (updatedLoggedInUser.following || []).map(f => f?.username);
        const profileFollowers = (userData.followers || []).map(f => f?.username);
        const mutuals = userData?.followers
          ?.filter(follower => 
            loggedInFollowing.includes(follower?.username) && follower?.username !== user?.username // Exclude self
          )
          .map(follower => ({
            username: follower?.username,
            profile_picture: follower.profile_picture
              ? `${follower.profile_picture}`
              : '/default-profile.png'
          }));
        if (isMounted) setMutualFollowers(mutuals);
      }
    };
  
    syncFollowStatus();
  
    return () => {
      isMounted = false;
    };
  }, [user?.username, userData?.username, dispatch]);


  // If the logged-in user is blocked by the profile owner, show restricted message
  if (isBlockedByUser) {
    return (
      <div className="w-full text-center py-10">
        <h1 className="text-2xl font-bold text-gray-800">Restricted Access</h1>
        <p className="text-gray-600 mt-2">You are restricted by this user.</p>
      </div>
    );
  }

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        const updatedProfileUser = await unfollowUser(userData?.username);
        setIsFollowing(false);
        setFollowerCount(updatedProfileUser.follower_count);
        onUserUpdate(updatedProfileUser);
        dispatch(showToast({ message: `Unfollowed ${userData?.username}`, type: 'success' }));
        const updatedLoggedInUser = await getUser(user?.username);
        dispatch(setUser(updatedLoggedInUser));
        setFollowsBack(updatedProfileUser.following?.some(f => f?.username === user?.username) || false);
        setMutualFollowers(prev => prev.filter(f => f?.username !== user?.username));
      } else {
        const updatedProfileUser = await followUser(userData?.username);
        setIsFollowing(true);
        setFollowerCount(updatedProfileUser.follower_count);
        onUserUpdate(updatedProfileUser);
        dispatch(showToast({ message: `Now following ${userData?.username}`, type: 'success' }));
        const updatedLoggedInUser = await getUser(user?.username);
        dispatch(setUser(updatedLoggedInUser));
        setFollowsBack(updatedProfileUser.following?.some(f => f?.username === user?.username) || false);
        if (updatedProfileUser.following?.some(f => f?.username === user?.username)) {
          const newMutual = {
            username: user?.username,
            profile_picture: updatedLoggedInUser.profile_picture
              ? `${CLOUDINARY_ENDPOINT}${updatedLoggedInUser.profile_picture}`
              : '/default-profile.png'
          };
          setMutualFollowers(prev => [...prev, newMutual]);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      dispatch(showToast({ message: 'Failed to update follow status', type: 'error' }));
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (isBlocked) {
        const response = await unblockUser(userData?.username);
        setIsBlocked(false);
        dispatch(showToast({ message: `Unblocked ${userData?.username}`, type: 'success' }));
        dispatch(setUser(response.user));
        const updatedProfileUser = await getUser(userData?.username);
        onUserUpdate(updatedProfileUser);
        setFollowerCount(updatedProfileUser.follower_count);
        setFollowsBack(updatedProfileUser.following?.some(f => f?.username === user?.username) || false);
      } else {
        const response = await blockUser(userData?.username);
        setIsBlocked(true);
        setIsFollowing(false); // Reset local state
        setFollowsBack(false);
        dispatch(showToast({ message: `Blocked ${userData?.username}`, type: 'success' }));
        dispatch(setUser(response.user)); // Update Sanji’s state
  
        // Update the blocked user’s state (Naruto)
        const updatedLoggedInUser = await getUser(user?.username);
        dispatch(setUser(updatedLoggedInUser));
  
        const updatedProfileUser = await getUser(userData?.username);
        onUserUpdate(updatedProfileUser);
        setFollowerCount(updatedProfileUser.follower_count);
        setMutualFollowers([]);
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      dispatch(showToast({ message: 'Failed to update block status', type: 'error' }));
    }
  };

  const handleMessageClick = async () => {
    try {
      const response = await axiosInstance.post('/chatrooms/start-chat/', { username: userData?.username });
      const newRoom = response.data;
      navigate(`/messages/${newRoom.id}`);
      dispatch(showToast({ message: `Chat started with ${userData?.username}`, type: 'success' }));
    } catch (error) {
      console.error('Error starting chat:', error);
      dispatch(showToast({ message: 'Failed to start chat', type: 'error' }));
    }
  };

  const handleReportClick = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      dispatch(showToast({ message: 'Please provide a reason for the report', type: 'error' }));
      return;
    }

    try {
      await axiosInstance.post('/report-user/', {
        reported_username: userData?.username,
        reason: reportReason
      });
      dispatch(showToast({ message: `Reported ${userData?.username} successfully`, type: 'success' }));
      setHasReported(true); // Disable the report button
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      dispatch(showToast({ message: error.response?.data?.error || 'Failed to submit report', type: 'error' }));
    }
  };

  const handleReportCancel = () => {
    setShowReportModal(false);
    setReportReason('');
  };

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  const renderMutualFollowers = () => {
    if (mutualFollowers.length === 0) return null;

    const firstTwo = mutualFollowers.slice(0, 2);
    const remainingCount = mutualFollowers.length - 2;
    // console.log('mutual 281::',mutualFollowers)
    return (
      <p className="text-sm text-gray-600 mt-1 flex items-center">
        Followed by &nbsp;
        {firstTwo.map((mutual, index) => (
          <span key={mutual?.username} className="flex items-center">
            <img
              src={`${CLOUDINARY_ENDPOINT}${mutual.profile_picture}`}
              alt={mutual?.username}
              className="w-5 h-5 rounded-full mr-1"
              onError={(e) => (e.target.src = '/default-profile.png')}
            />
            <Link to={`/user/${mutual?.username}`} className="font-medium text-gray-800 hover:text-[#198754]">
              {mutual?.username}
            </Link>
            {index < firstTwo.length - 1 ? ', ' : ''}
          </span>
        ))}
        {remainingCount > 0 && (
          <>
            &nbsp;{' and '}&nbsp;
            <button
              onClick={() => fetchFollowList('mutual followers', mutualFollowers)}
              className="font-medium text-gray-800 hover:text-[#198754] underline"
            >
              {remainingCount} other{remainingCount > 1 ? 's' : ''}
            </button>
          </>
        )}
      </p>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md hover:scale-[3] hover:relative hover:translate-x-28 hover:translate-y-10 duration-700">
          <img
            src={imageError ? '/default-profile.png' : `${userData?.profileImage}`}
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
              {renderMutualFollowers()}
            </div>
            <div className="flex gap-2 mt-3 md:mt-0">
              <button
                onClick={handleFollowToggle}
                className={`${
                  isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                } px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center`}
                disabled={isBlocked}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={16} className="mr-1" />
                    Unfollow
                  </>
                ) : followsBack && !isFollowing ? (
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
              <button
                onClick={handleMessageClick}
                className="bg-[#198754] text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 hover:bg-[#157a47] flex items-center"
                disabled={isBlocked}
              >
                <MessageCircle size={16} className="mr-1" />
                Message
              </button>

              <button
                onClick={handleReportClick}
                className={`bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  hasReported ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'
                }`}
                disabled={hasReported}
              >
                <Flag size={16} />
              </button>

              <button
                onClick={handleBlockToggle}
                className={`${
                  isBlocked ? 'bg-gray-200 text-gray-800' : 'bg-red-100 hover:bg-red-200 text-red-600'
                } px-3 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center`}
              >
                {isBlocked ? (
                  <>
                    <Shield size={16} className="mr-1" />
                    Unblock
                  </>
                ) : (
                  <>
                    <Shield size={16} className="mr-1" />
                    Block
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-8">
        <p className="text-gray-800 whitespace-pre-line">{userData?.bio || "No bio available"}</p>
      </div>
      <ProfileStatsCards
        posts={userData?.posts?.length}
        followers={followerCount}
        following={userData?.following_count || userData?.following?.length}
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
      {showReportModal && (
        <ReportModal
          username={userData?.username}
          onSubmit={handleReportSubmit}
          onCancel={handleReportCancel}
          reportReason={reportReason}
          setReportReason={setReportReason}
        />
      )}
    </div>
  );
};

const ReportModal = ({ username, onSubmit, onCancel, reportReason, setReportReason }) => {
  return (
    <div className="fixed inset-0 backdrop-blur-md bg-transparent bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-[#157347] rounded-2xl shadow-xl p-6 w-full max-w-md ">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Report {username}</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="mb-4">
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Please describe why you are reporting this user..."
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] bg-gray-50 resize-none"
            rows={5}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#157347] transition duration-200"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

const FollowModal = ({ type, list, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = useCallback((username) => {
    setImageErrors(prev => ({ ...prev, [username]: true }));
  }, []);

  const filteredList = useMemo(() => {
    if (!searchQuery) return list;
    return list.filter(user => 
      user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [list, searchQuery]);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold capitalize text-gray-800">{type}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${type}...`}
            className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] bg-gray-50"
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {filteredList.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {filteredList.map((user) => (
                <li key={user.id} className="py-3 flex items-center hover:bg-gray-50 rounded-lg px-2 transition-colors">
                  <div className="relative flex-shrink-0">
                    <img
                      src={imageErrors[user?.username] ? '/default-profile.png' : user.profile_picture}
                      alt={user?.username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      onError={() => handleImageError(user?.username)}
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <Link 
                      to={`/user/${user?.username}`} 
                      className="text-gray-800 font-medium hover:text-[#198754] transition-colors"
                    >
                      {user?.username}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <p>No {type} found</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="mt-4 bg-[#198754] text-white px-4 py-3 rounded-xl w-full hover:bg-[#157347] transition duration-200 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};

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
        ? 'border-b-2 border-[#198754] text-[#198754]' 
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