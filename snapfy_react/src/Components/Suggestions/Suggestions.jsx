import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {getAllUser} from '../../API/authAPI'
import {CLOUDINARY_ENDPOINT} from '../../APIEndPoints'
import { useSelector } from 'react-redux';

const SuggestionItem = ({ username, profileImage, mutualFollowers }) => {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center">
        <img 
          src={`${CLOUDINARY_ENDPOINT}${profileImage}` || "default.png"} 
          alt={username} 
          className="w-10 h-10 rounded-full mr-3"
          loading='lazy'
        />
        <div>
          <Link to={`/user/${username}`} className="font-medium text-gray-800">{username}</Link>
          <div className="text-xs text-gray-500">Followed by user2 + {mutualFollowers} others</div>
        </div>
      </div>
      <button className="text-[#198754] text-sm font-medium hover:text-[#198762]">
        Follow+
      </button>
    </div>
  );
};


const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([])
  const {user} = useSelector(state=> state.user)

  useEffect(()=> {
    const retrieveUsers = async ()=>{
      try{
        const response = await getAllUser()
        console.log('fetching users');

        // Filter out the current user before updating state
        const filteredUsers = response.filter((s) => s.username !== user?.username);
        setSuggestions(filteredUsers);

      }catch(error){
        console.log("error in retrieving users in suggestions :: ", error)
      }
    }

    retrieveUsers()
  }, [user])

  

  // Mock data for suggestions
  // const suggestions = [
  //   { id: 1, username: 'nestinterior123', profileImage: '/api/placeholder/40/40', mutualFollowers: 3 },
  //   { id: 2, username: 'zoro', profileImage: '/api/placeholder/40/40', mutualFollowers: 4 },
  //   { id: 3, username: 'naruto', profileImage: '/api/placeholder/40/40', mutualFollowers: 5 },
  //   { id: 4, username: 'user1', profileImage: '/api/placeholder/40/40', mutualFollowers: 6 },
  //   { id: 5, username: 'user1', profileImage: '/api/placeholder/40/40', mutualFollowers: 2 },
  //   { id: 6, username: 'user1', profileImage: '/api/placeholder/40/40', mutualFollowers: 8 },
  // ];

  return (
    <div className="space-y-3">
      {suggestions.map(suggestion => (
        <SuggestionItem 
          key={suggestion.id}
          username={suggestion.username}
          profileImage={suggestion.profile_picture}
          mutualFollowers={4}
        />
      ))}
    </div>
  );
};

export default Suggestions;