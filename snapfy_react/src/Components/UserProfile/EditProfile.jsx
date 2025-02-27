import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Camera, ChevronRight, ArrowLeft} from 'lucide-react';
// import {userRegister} from '../../API/authAPI'
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../redux/slices/toastSlice';
import { useDispatch } from 'react-redux';

import Loader from '../../utils/Loader/Loader'

const EditProfile = () => {
  
  const [previewImage, setPreviewImage] = useState(null);
  

  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async (data) => {
    const formData = new FormData();
  
    // Appending all fields
    for (const key in data) {
      if (key === "profile_picture") {
        if (data.profile_picture[0]) {
          formData.append(key, data.profile_picture[0]);
        }
      } else {
        formData.append(key, data[key]);
      }
    }
  
    // Debugging: Check FormData content
    // for (let [key, value] of formData.entries()) {
    //   console.log(`key: ${key} => value:`, value);
    // }
  
    try {
      setLoading(true);
      // const response = await userRegister(formData);
  
      // Show success toast
      // dispatch(showToast({message:response?.message, type:'success'}))
      
      // navigation to verify email
      const email = formData.get('email') 
      navigate(`/verify-otp/?email=${encodeURIComponent(email)}`)

    } catch (error) {
      const errorResponse = error.response?.data; // DRF returns validation errors in `data`
  
      if (errorResponse) {
        const errorMessages = Object.entries(errorResponse)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n");

        dispatch(showToast({message:errorMessages, type:'error'}))
      } else {
        dispatch(showToast({message:"An unexpected error occurred", type:'error'}))
      }
    } finally {
      setLoading(false);
    }
  };
  

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Error message style class
  const errorMessageClass = "mt-1 text-red-300 bg-red-900/40 text-sm flex items-center px-2 py-1 rounded-md border border-red-500/20";

  return loading ? (<Loader/>) : (
    <div className="h-fit bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">

      <div className="w-full max-w-md relative">
        {/* Decorative Elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        {/* <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#FF6C37]/20 rounded-full blur-2xl"></div> */}
        
        {/* Logo/Brand */}
        <div className="text-center mb-8 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#FF6C37] font-['Orbitron'] transform hover:scale-105 transition-transform duration-600 cursor-default animate-pulse">
              SNAPFY
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6C37] rounded-full blur-xl opacity-50 animate-pulse"></div>
          </div>
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">Edit Profile</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>
          
          {/* <h2 className="text-2xl font-semibold text-white mb-8 text-center">Join the Community</h2> */}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Image Preview */}
             <div className="flex justify-center mb-6">
               <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-[#FF6C37] hover:border-[#198754] transition-colors duration-300">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50" />
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  {...register('profile_picture', {
                    required: 'Profile image is required',
                    validate: {
                      format: (files) => {
                        if (!files[0]) return true;
                        const type = files[0].type;
                        return (
                          type === 'image/jpeg' ||
                          type === 'image/png' ||
                          type === 'image/jpg' ||
                          'Please upload a JPG or PNG file'
                        );
                      }
                    }
                  })}
                  onChange={handleImageChange}
                />
              </div>
            </div>
            {errors.profile_picture && (
              <p className={errorMessageClass}>
                <X size={16} className="mr-1" /> {errors.profile_picture.message}
              </p>
            )}

            {/* Username & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                  {...register('username', {
                    required: 'Username required',
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Letters, numbers & underscore only'
                    }
                  })}
                />
                {errors.username && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.username.message}
                  </p>
                )}
              </div>
              {/* Email field */}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                  {...register('email', {
                    required: 'Email required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errors.email && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Name Fields */}
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <input
                  type="text"
                  placeholder="First Name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                  {...register('first_name', {
                    required: 'First name required',
                    pattern: {
                      value: /^[A-Za-z]+$/,
                      message: 'Letters only'
                    }
                  })}
                />
                {errors.first_name && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.first_name.message}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last Name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                  {...register('last_name', {
                    required: 'Last name required',
                    pattern: {
                      value: /^[A-Za-z]+$/,
                      message: 'Letters only'
                    }
                  })}
                />
                {errors.last_name && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <textarea
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50 resize-none h-24"
                {...register('bio', {
                  required: 'Bio is required'
                })}
              />
              {errors.bio && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.bio.message}
                  </p>
                )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-6 bg-[#1E3932] text-white rounded-xl hover:bg-[#198754] focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transform hover:scale-105 transition-all duration-200 flex items-center justify-center group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Edit Profile
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center text-white/70 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default EditProfile