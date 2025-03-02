import axiosInstance from "../axiosInstance";


export const createPost = async (formData)=>{
    const response = await axiosInstance.post('create-post/', formData, {
        headers : {
            "Content-Type" : "multipart/form-data",
        }
    })

    return response
}