import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllUser, followUser, userLogout } from '../../API/authAPI';
import { useSelector, useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { logout, setUser } from '../../redux/slices/userSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';

const SuggestionItem = ({ username, profile_picture, mutualFollowers, isFollowingMe, onFollow, followedUsers, isAlreadyFollowing }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
      <div className="flex items-start space-x-3">
        <div className="relative">
          {isFollowingMe && !isAlreadyFollowing && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white z-10" 
                 title="Follows you">
            </div>
          )}
          <img
            src={String(profile_picture).startsWith('http') ? profile_picture : `${CLOUDINARY_ENDPOINT}${profile_picture}`}
            alt={username}
            className="w-14 h-14 rounded-full object-cover shadow-sm"
            loading="lazy"
            onError={(e) => (e.target.src = '/default-profile.png')}
          />
        </div>
        <div className="flex-1">
          <Link
            to={`/user/${username}`}
            className="font-semibold text-gray-800 hover:text-[#198754] transition-colors duration-150 text-base flex items-center"
          >
            {username}
            {mutualFollowers > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-normal">
                {mutualFollowers} {mutualFollowers === 1 ? 'mutual' : 'mutuals'}
              </span>
            )}
          </Link>
          <div className="mt-0.5 flex items-center">
            {isFollowingMe && !isAlreadyFollowing ? (
              <div className="text-xs text-blue-600 font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                </svg>
                Follows you
              </div>
            ) : mutualFollowers > 0 ? (
              <div className="text-xs text-gray-500">
                Suggested for you
              </div>
            ) : (
              <div className="text-xs text-gray-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
                New to you
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 ml-16">
        <button
          onClick={onFollow}
          className={`w-full px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            followedUsers.includes(username) || isAlreadyFollowing
              ? 'bg-gray-100 text-gray-500 border border-gray-200'
              : isFollowingMe
                ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                : 'bg-[#198754] text-white hover:bg-[#146c43]'
          }`}
          disabled={followedUsers.includes(username) || isAlreadyFollowing}
        >
          {followedUsers.includes(username) || isAlreadyFollowing ? (
            <span className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Following
            </span>
          ) : isFollowingMe ? (
            <span className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 018 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
              </svg>
              Follow Back
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 018 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
              </svg>
              Follow
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]);
  const hasFetched = useRef(false);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const retrieveUsers = async () => {
      try {
        const response = await getAllUser();
        const followingUsernames = (user?.following || []).map(f => f.username);
        const blockedUsernames = user?.blocked_users || [];
        const filteredUsers = response
          .filter((s) => s.username !== user?.username)
          .filter((s) => !followingUsernames.includes(s.username))
          .filter((s) => !followedUsers.includes(s.username))
          .filter((s) => !blockedUsernames.includes(s.username));
        const shuffledUsers = shuffleArray(filteredUsers);
        const randomSuggestions = shuffledUsers.slice(0, 7);
        setSuggestions(randomSuggestions);
        hasFetched.current = true;
      } catch (error) {
        console.error('Error retrieving users in suggestions:', error);
        if (error.response?.status === 401) {
          // await userLogout();
          // dispatch(logout());
          // navigate('/');
          dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
        } else {
          dispatch(showToast({ message: 'Failed to load suggestions', type: 'error' }));
        }
      }
    };

    if (user) {
      retrieveUsers();
    }
  }, [user, dispatch, navigate]);

  const handleFollow = async (username) => {
    try {
      await followUser(username);
      dispatch(showToast({ message: `Now following ${username}`, type: 'success' }));
      const updatedUser = { 
        ...user, 
        following: [...(user.following || []), { username, profile_picture: null }] 
      };
      dispatch(setUser(updatedUser));
      setFollowedUsers((prev) => [...prev, username]);
    } catch (error) {
      if (error.response?.status === 401) {
        // await userLogout();
        // dispatch(logout());
        // navigate('/');
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
      } else {
        dispatch(showToast({ message: 'Failed to follow user', type: 'error' }));
      }
    }
  };

  const getSuggestionInfo = (suggestion) => {
    const suggestionFollowers = (suggestion.followers || []).map(f => f.username);
    const userFollowing = (user?.following || []).map(f => f.username);
    const mutualFollowers = suggestionFollowers.filter((follower) =>
      userFollowing.includes(follower)
    ).length;
    const isFollowingMe = (suggestion.following || []).some(f => f.username === user?.username);
    const isAlreadyFollowing = userFollowing.includes(suggestion.username);
    return { mutualFollowers, isFollowingMe, isAlreadyFollowing };
  };

  return (
    <div className="space-y-4">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion) => {
          const { mutualFollowers, isFollowingMe, isAlreadyFollowing } = getSuggestionInfo(suggestion);
          return (
            <SuggestionItem
              key={suggestion.id}
              username={suggestion.username}
              profile_picture={suggestion.profile_picture}
              mutualFollowers={mutualFollowers}
              isFollowingMe={isFollowingMe}
              onFollow={() => handleFollow(suggestion.username)}
              followedUsers={followedUsers}
              isAlreadyFollowing={isAlreadyFollowing}
            />
          );
        })
      ) : (
        <div className="text-gray-500 text-center py-4">No suggestions available</div>
      )}
    </div>
  );
};

export default Suggestions;