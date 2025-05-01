import axiosInstance from '../axiosInstance'

export const userRegister = async (formData) =>{
    const response = await axiosInstance.post('register/', formData, {
        headers : {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}

export const verifyOTP = async (data) =>{
    const response = await axiosInstance.post('verify-otp/', data, {
        headers : {
            "Content-Type" : 'application/json',
        },
    })
    return response.data
}

export const resendOTP = async (data)=>{
    const response = await axiosInstance.post('resend-otp/', data, {
        headers : {
            "Content-Type" : "application/json",
        }
    })
    return response.data
}

export const userLogin = async (credential) => {
  const response = await axiosInstance.post('login/', credential);
  return response.data;
};

export const userLogout = async () => {
  // Make sure cookies are being sent with the request
  const response = await axiosInstance.post('logout/', {}, {
    withCredentials: true  // Explicitly ensure credentials are sent
  });
  return response.data;
};

export const resetPassword = async (data)=> {
    const response = await axiosInstance.put('reset-password/', data, {
        headers : {
            "Content-Type" : "application/json",
        }
    })

    return response.data
}

export const googleSignIn = async (token) => {
  const response = await axiosInstance.post('auth/google/signin/', { token });
  return response.data;
};

export const updateProfile = async (formData) =>{
    try {
        const response = await axiosInstance.put('profile/update/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data', 
          },
        });
        // console.log("Update profile response:", response.data); 
        return response.data;
    } catch (err) {
        console.error('Error updating user profile:', err.response?.data || err);
        throw err;
    }
}

export const getAllUser = async (searchTerm = '') => {
  try {
    const response = await axiosInstance.get(`users/${searchTerm ? `?username=${searchTerm}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error retrieving users:', error);
    throw error;
  }
};

export const getUser = async (username) => {
    try {
      const response = await axiosInstance.get(`users/${username}/`);
      console.log("getUser response:", response.data); // Debug log
      return response.data; // Ensure data is returned
    } catch (error) {
      console.error('Error on retrieving user data: ', error.response?.data || error);
      throw error; // Propagate error for handling
    }
  };


export const checkUserExists = async (username) => {
    try {
        const response = await axiosInstance.get(`users/${username}/`);
        return { exists: true, data: response.data };
    } catch (error) {
        if (error.response?.status === 404) {
        return { exists: false };
        }
        console.error('Error checking user existence:', error.response?.data || error);
        throw error; // Propagate other errors (e.g., network issues)
    }
};

export const getUserById = async (id) => {
    try {
      const response = await axiosInstance.get(`users/id/${id}/`);
      console.log("getUserById response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error on retrieving user by ID: ', error.response?.data || error);
      throw error;
    }
  };

// Follow a user
export const followUser = async (username) => {
    const response = await axiosInstance.post(`users/${username}/follow/`);
    return response.data;
};
  
// Unfollow a user
export const unfollowUser = async (username) => {
    const response = await axiosInstance.post(`users/${username}/unfollow/`);
    return response.data;
};

export const blockUser = async (username) => {
    const response = await axiosInstance.post(`/block/${username}/`);
    return response.data;
};
  
export const unblockUser = async (username) => {
    const response = await axiosInstance.post(`/unblock/${username}/`);
    return response.data;
};

// Stories
export const getMusicTracks = async () => {
  const response = await axiosInstance.get('music-tracks/');
  console.log('Raw music tracks response:', response.data); // Debug log
  return response.data;
};

export const createStory = async (formData) => {
    const response = await axiosInstance.post('/stories/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };
  
  export const getStories = async ({ page = 1, pageSize = 10 } = {}) => {
    const response = await axiosInstance.get('/stories/', {
      params: {
        page,
        page_size: pageSize,
      },
    });
    // Since the backend uses Django pagination, response.data will likely have results, next, previous, etc.
    return response.data;
  };
  
  export const getStory = async (storyId) => {
    const response = await axiosInstance.get(`/stories/${storyId}/`);
    return response.data;
  };
  
  export const deleteStory = async (storyId) => {
    const response = await axiosInstance.delete(`/stories/${storyId}/`);
    return response.data;
  };
  
  export const toggleStoryLike = async (storyId) => {
    const response = await axiosInstance.post(`/stories/${storyId}/like/`);
    return response.data;
  };
  
  export const getStoryViewers = async (storyId) => {
    const response = await axiosInstance.get(`/stories/${storyId}/viewers/`);
    return response.data;
  };


  export const getLiveStreams = async () => {
    try {
      console.log('Fetching live streams...');
      const response = await axiosInstance.get('/live/');
      console.log('Live streams response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching live streams:', error.response?.data || error.message);
      throw error;
    }
  };
  
  export const createLiveStream = async (title, endExisting = false) => {
    try {
      console.log('Creating live stream with:', { title, endExisting });
      const response = await axiosInstance.post('/live/', { title, end_existing: endExisting });
      console.log('Create live stream response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create live stream error:', error.response?.data || error.message);
      throw error;
    }
  };
  
  export const getLiveStream = async (liveId) => {
    try {
      console.log(`Fetching live stream ${liveId}...`);
      const response = await axiosInstance.get(`/live/${liveId}/`);
      console.log('Live stream response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching live stream:', error.response?.data || error.message);
      throw error;
    }
  };
  
  export const joinLiveStream = async (liveId) => {
    try {
      console.log(`Joining live stream ${liveId}...`);
      const response = await axiosInstance.post(`/live/${liveId}/join/`);
      console.log('Join live stream response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining live stream:', error.response?.data || error.message);
      throw error;
    }
  };
  
  export const endLiveStream = async (liveId) => {
    try {
      console.log(`Ending live stream ${liveId}...`);
      const response = await axiosInstance.delete(`/live/${liveId}/`);
      console.log('End live stream response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error ending live stream:', error.response?.data || error.message);
      throw error;
    }
  };
  
  // Keep refreshToken for manual calls if needed, but it’s not used in API retries
  export const refreshToken = async () => {
    try {
      const refreshToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('refresh_token='))
        ?.split('=')[1];
  
      if (!refreshToken) {
        console.error('No refresh token found');
        return null;
      }
  
      const response = await axiosInstance.post('/token/refresh/', { refresh: refreshToken });
      const { access } = response.data;
      document.cookie = `access_token=${access}; path=/; SameSite=Lax`;
      console.log('Token refreshed successfully');
      return access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };