import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUser, followUser } from '../../API/authAPI';
import { useSelector, useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { setUser } from '../../redux/slices/userSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';

const SuggestionItem = ({ username, profile_picture, mutualFollowers, isFollowingMe, onFollow, followedUsers, isAlreadyFollowing }) => {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center space-x-3">
        <img
          src={profile_picture ? `${CLOUDINARY_ENDPOINT}${profile_picture}` : '/default-profile.png'}
          alt={username}
          className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover"
          loading="lazy"
          onError={(e) => (e.target.src = '/default-profile.png')}
        />
        <div>
          <Link
            to={`/user/${username}`}
            className="font-semibold text-gray-800 hover:text-[#198754] transition-colors duration-150"
          >
            {username}
          </Link>
          {isFollowingMe && !isAlreadyFollowing ? (
            <div className="text-xs text-gray-600 italic">Follows you</div>
          ) : mutualFollowers > 0 ? (
            <div className="text-xs text-gray-600">
              Followed by {mutualFollowers} {mutualFollowers === 1 ? 'mutual' : 'mutuals'}
            </div>
          ) : (
            <div className="text-xs text-gray-400">New to you</div>
          )}
        </div>
      </div>
      <button
        onClick={onFollow}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
          followedUsers.includes(username) || isAlreadyFollowing
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-[#198754] text-white hover:bg-[#146c43]'
        }`}
        disabled={followedUsers.includes(username) || isAlreadyFollowing}
      >
        {followedUsers.includes(username) || isAlreadyFollowing ? 'Following' : isFollowingMe ? 'Follow Back' : 'Follow+'}
      </button>
    </div>
  );
};

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

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
        console.log('Fetching users for suggestions:', response);

        const followingUsernames = (user?.following || []).map(f => f.username);

        const filteredUsers = response
          .filter((s) => s.username !== user?.username)
          .filter((s) => !followingUsernames.includes(s.username))
          .filter((s) => !followedUsers.includes(s.username));

        const shuffledUsers = shuffleArray(filteredUsers);
        const randomSuggestions = shuffledUsers.slice(0, 7);

        setSuggestions(randomSuggestions);
      } catch (error) {
        console.error('Error retrieving users in suggestions:', error);
        dispatch(showToast({ message: 'Failed to load suggestions', type: 'error' }));
      }
    };

    if (user) {
      retrieveUsers();
    }
  }, [dispatch]);

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
      console.error('Error following user:', error);
      dispatch(showToast({ message: 'Failed to follow user', type: 'error' }));
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
    console.log(`Suggestion: ${suggestion.username}, Mutual followers: ${mutualFollowers}, Follows me: ${isFollowingMe}, Already following: ${isAlreadyFollowing}`);
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