import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUser, followUser } from '../../API/authAPI';
import { useSelector, useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { setUser } from '../../redux/slices/userSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';

const SuggestionItem = ({ username, profile_picture, mutualFollowers, isFollowingMe, onFollow, followedUsers }) => {
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
          {isFollowingMe ? (
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
          followedUsers.includes(username)
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-[#198754] text-white hover:bg-[#146c43]'
        }`}
        disabled={followedUsers.includes(username)}
      >
        {followedUsers.includes(username) ? 'Following' : isFollowingMe ? 'Follow Back' : 'Follow+'}
      </button>
    </div>
  );
};

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]); // Local state for UI feedback
  const { user } = useSelector((state) => state.user); // Logged-in user (e.g., sung)
  const dispatch = useDispatch();

  // Fetch suggestions only once on mount, not on user state change
  useEffect(() => {
    const retrieveUsers = async () => {
      try {
        const response = await getAllUser();
        console.log('Fetching users for suggestions:', response);

        // Filter out current user and users already followed, then limit to 7
        const filteredUsers = response
          .filter((s) => s.username !== user?.username) // Exclude self
          .filter((s) => !user?.following?.includes(s.username)) // Exclude followed users
          .slice(0, 7); // Limit to 7

        setSuggestions(filteredUsers);
      } catch (error) {
        console.error('Error retrieving users in suggestions:', error);
        dispatch(showToast({ message: 'Failed to load suggestions', type: 'error' }));
      }
    };

    if (user) {
      retrieveUsers();
    }
    // Dependency array includes only dispatch, not user, to avoid re-fetch on user change
  }, [dispatch]);

  const handleFollow = async (username) => {
    try {
      await followUser(username);
      dispatch(showToast({ message: `Now following ${username}`, type: 'success' }));

      // Update logged-in user's following list in Redux (for persistence)
      const updatedUser = { ...user, following: [...(user.following || []), username] };
      dispatch(setUser(updatedUser));

      // Track locally for UI feedback, but don’t update suggestions
      setFollowedUsers((prev) => [...prev, username]);
    } catch (error) {
      console.error('Error following user:', error);
      dispatch(showToast({ message: 'Failed to follow user', type: 'error' }));
    }
  };

  // Calculate mutual followers and check if user follows me
  const getSuggestionInfo = (suggestion) => {
    const suggestionFollowers = suggestion.followers || [];
    const userFollowing = user?.following || [];

    // Mutual followers: overlap between suggestion's followers and user's following
    const mutualFollowers = suggestionFollowers.filter((follower) =>
      userFollowing.includes(follower)
    ).length;

    // Check if this suggestion follows the logged-in user
    const isFollowingMe = suggestion.following?.includes(user?.username) || false;

    return { mutualFollowers, isFollowingMe };
  };

  return (
    <div className="space-y-4">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion) => {
          const { mutualFollowers, isFollowingMe } = getSuggestionInfo(suggestion);
          return (
            <SuggestionItem
              key={suggestion.id}
              username={suggestion.username}
              profile_picture={suggestion.profile_picture}
              mutualFollowers={mutualFollowers}
              isFollowingMe={isFollowingMe}
              onFollow={() => handleFollow(suggestion.username)}
              followedUsers={followedUsers}
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