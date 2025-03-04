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

export const getPost = async (postId)=> {
    const response = await axiosInstance.get(`posts/${postId}`)
    return response.data
}

export const getPosts = async ()=> {
    const response = await axiosInstance.get('posts/')
    return response.data
}