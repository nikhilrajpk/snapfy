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

export const userLogin = async (credential) =>{
    const response = await axiosInstance.post('login/', credential, {
        headers: {
            'Content-Type': 'application/json',
          },
    })

    return response.data
}

export const resetPassword = async (data)=> {
    const response = await axiosInstance.put('reset-password/', data, {
        headers : {
            "Content-Type" : "application/json",
        }
    })

    return response.data
}

export const updateProfile = async (userId, formData) =>{
    try{
        const response = await axiosInstance.put(`update-profile/${userId}/`, formData, {
            headers : {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    }catch(err){
        console.error('Error updating user profile:', err.response?.data || err);
        throw err;
    }
}

export const getAllUser = async () =>{
    try{
        const response = await axiosInstance.get(`users/`)

        return response.data
    }catch(error){
        console.error('Error on retrieving users data : ', error.response?.data || error);
        throw error
    }
}

export const getUser = async (userId) =>{
    try{
        const response = axiosInstance.get(`users/${userId}/`)
        return response
    }catch(error){
        console.error('Error on retrieving user data : ', error.response?.data || error)
        throw error
    }
}

// export const removeUser = async (userId) =>{
//     try {
//         const response = axiosInstance.delete(`users/${userId}/`)
//         return response
//     } catch (error) {
//         console.error('Error on deleting user data : ', error.response?.data || error)
//     }
// }