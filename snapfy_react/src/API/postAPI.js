import axiosInstance from "../axiosInstance";


export const createPost = async (formData)=>{
    const response = await axiosInstance.post('create-post/', formData, {
        headers : {
            "Content-Type" : "multipart/form-data",
        }
    })

    return response
}

export const updatePost = async (formData) => {
    try {
      const postId = formData.get('id'); // Extracting postId from formData
      const response = await axiosInstance.put(`edit-post/${postId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("Update post response:", response.data);
      return response.data;
    } catch (err) {
      console.error('Error updating post:', err.response?.data || err);
      throw err;
    }
};

export const deletePost = async (postId) => {
    console.log("DELETE URL:", axiosInstance.defaults.baseURL + `delete-post/${postId}/`);
    try {
    const response = await axiosInstance.delete(`delete-post/${postId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'An error occurred while deleting the post' };
    }
};

export const getPost = async (postId)=> {
    const response = await axiosInstance.get(`posts/${postId}`)
    return response.data
}

export const getPosts = async (isExplore = false) => {
  try {
    const response = await axiosInstance.get('posts/', {
      params: isExplore ? { explore: true } : {},
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};


export const savePost = async (data)=>{
  try{
    const response = await axiosInstance.post('save-post/', data, {
      'headers' : {
        'Content-Type' : 'application/json'
      }
    })

    return response.data
  }catch(error){
    throw error.response?.data || {'detail' : 'An error occured while saving the post'}
  }
}


export const isSavedPost = async (data) => {
  // console.log('Sending isSavedPost request with params:', data);
  try {
    const response = await axiosInstance.get('is-saved-post/', {
      params: data, // { post: 36, user: "f8c18464-..." }
      headers: { 'Content-Type': 'application/json' },
    });
    // console.log('isSavedPost response:', response.data);
    return {
      exists: response.data.exists,      // Use 'exists' directly
      savedPostId: response.data.savedPostId, // Include savedPostId
    };
  } catch (error) {
    console.error('Error in isSavedPost:', error.response?.data || error.message);
    return { exists: false, savedPostId: null };
  }
};

export const removeSavedPost = async (savedPostId) => {
  try {
    const response = await axiosInstance.delete(`remove-saved-post/${savedPostId}/`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error
  }
};


export const archivePost = async (data) => {
  try {
    const response = await axiosInstance.post('post/archive/', data);
    return response.data;
  } catch (error) {
    console.error('Error archiving post:', error);
    throw error;
  }
};

export const removeArchivedPost = async (archivedPostId) => {
  try {
    const response = await axiosInstance.delete(`post/archive/${archivedPostId}/`);
    return response.data;
  } catch (error) {
    console.error('Error removing archived post:', error);
    throw error;
  }
};

export const isArchivedPost = async (data) => {
  try {
    const response = await axiosInstance.get('post/is-archived/', { params: data });
    return response.data;
  } catch (error) {
    console.error('Error checking if post is archived:', error);
    throw error;
  }
};



export const getShorts = async () => {
  try {
    const response = await axiosInstance.get('posts/', {
      params: { shorts: true },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching shorts:', error);
    throw error;
  }
};


// Like post
export const likePost = async (postId) => {
  try {
    const response = await axiosInstance.post(`posts/${postId}/like/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Error liking post' };
  }
};

export const getLikeCount = async (postId) => {
  try {
    const response = await axiosInstance.get(`posts/${postId}/like_count/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Error fetching like count' };
  }
};

export const isLikedPost = async ({ post, user }) => {
  try {
    const response = await axiosInstance.get(`posts/${post}/is_liked/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Error checking like status' };
  }
};

export const addComment = async (data) => {
  try {
    const response = await axiosInstance.post(`posts/${data.post}/comment/`, { text: data.text });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Error adding comment' };
  }
};

export const addCommentReply = async (data) => {
  try {
    const response = await axiosInstance.post(`posts/${data.post}/comment/${data.comment}/reply/`, { text: data.text });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Error adding reply' };
  }
};