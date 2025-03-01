import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Camera, ChevronRight, ArrowLeft } from 'lucide-react';
import { updateProfile } from '../../API/authAPI';
import axiosInstance from '../../axiosInstance';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { login } from '../../redux/slices/userSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import Loader from '../../utils/Loader/Loader';

const EditProfile = () => {
  const [previewImage, setPreviewImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // New state for file
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, refreshToken } = useSelector((state) => state.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  useEffect(() => {
    // console.log("User from Redux:", user);
    // console.log("Token from Redux:", token);
    if (user && user.profile_picture && !selectedFile) {
      const fetchProfilePicture = async () => {
        try {
          if (user.profile_picture.startsWith('http')) {
            const response = await axiosInstance.get('profile/picture/', {
              responseType: 'blob',
            });
            const imageUrl = URL.createObjectURL(response.data);
            // console.log("Setting previewImage from proxy:", imageUrl);
            setPreviewImage(imageUrl);
            setImageError(false);
          } else {
            const imageUrl = `${CLOUDINARY_ENDPOINT}${user.profile_picture}`;
            // console.log("Setting previewImage from Cloudinary:", imageUrl);
            setPreviewImage(imageUrl);
          }
        } catch (error) {
          console.error("Error fetching profile picture:", error);
          setImageError(true);
        }
      };

      fetchProfilePicture();
      setValue('username', user.username);
      setValue('first_name', user.first_name);
      setValue('last_name', user.last_name);
      setValue('bio', user.bio);
    }
  }, [user, token, setValue, selectedFile]);

  const onSubmit = async (data) => {
    // console.log("Form data:", data);
    // console.log("data.profile_picture:", data.profile_picture);
    const formData = new FormData();

    formData.append('username', data.username);
    formData.append('first_name', data.first_name);
    formData.append('last_name', data.last_name);
    formData.append('bio', data.bio);

    // Use selectedFile instead of form state
    if (selectedFile) {
      // console.log("Appending new profile_picture:", selectedFile);
      formData.append('profile_picture', selectedFile);
    } else {
      // console.log("No new profile_picture selected, preserving existing");
    }

    for (let [key, value] of formData.entries()) {
      // console.log(`FormData key: ${key} => value:`, value);
    }

    try {
      setLoading(true);
      // console.log("Sending form data to backend");
      const response = await updateProfile(formData);
      dispatch(login({ user: response?.user, token: token, refreshToken: refreshToken }));
      dispatch(showToast({ message: response?.message || "Profile updated successfully", type: 'success' }));
      navigate(`/${user.username}`);
    } catch (error) {
      const errorResponse = error.response?.data;
      let errorMessage = "An unexpected error occurred";
      
      if (errorResponse) {
        if (errorResponse.detail && errorResponse.code === "token_not_valid") {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (typeof errorResponse === 'string') {
          errorMessage = errorResponse;
        } else if (typeof errorResponse === 'object') {
          errorMessage = Object.entries(errorResponse)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) return `${field}: ${messages.join(", ")}`;
              return `${field}: ${messages}`;
            })
            .join("\n");
        }
        dispatch(showToast({ message: errorMessage, type: 'error' }));
      } else {
        dispatch(showToast({ message: errorMessage, type: 'error' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    // console.log("Selected file:", file);
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
      setSelectedFile(file); // Store file in state
      setImageError(false);
    }
  };

  const handleImageError = () => {
    // console.log("Image load error for:", previewImage);
    setImageError(true);
  };

  const errorMessageClass = "mt-1 text-red-300 bg-red-900/40 text-sm flex items-center px-2 py-1 rounded-md border border-red-500/20";

  return loading ? <Loader /> : (
    <div className="h-fit bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">
      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#FF6C37] font-['Orbitron'] transform hover:scale-105 transition-transform duration-600 cursor-default animate-pulse">
              SNAPFY
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6C37] rounded-full blur-xl opacity-50 animate-pulse"></div>
          </div>
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">Edit Profile</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-[#FF6C37] hover:border-[#198754] transition-colors duration-300">
                {previewImage && !imageError ? (
                  <img 
                    src={previewImage} 
                    alt="Profile Preview" 
                    className="w-full h-full object-cover" 
                    onError={handleImageError} 
                    // onLoad={() => console.log("Image loaded successfully:", previewImage)}
                    loading='lazy'
                  />
                ) : (
                  <Camera className="w-12 h-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50" />
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  {...register('profile_picture', {
                    validate: {
                      format: (files) => {
                        if (!files || files.length === 0) return true;
                        const type = files[0].type;
                        return (
                          ['image/jpeg', 'image/png', 'image/jpg'].includes(type) ||
                          'Please upload a JPG or PNG file'
                        );
                      },
                    },
                  })}
                  accept='.jpeg, .png, .jpg'
                  onChange={handleImageChange}
                />
              </div>
            </div>
            {errors.profile_picture && (
              <p className={errorMessageClass}>
                <X size={16} className="mr-1" /> {errors.profile_picture.message}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                  {...register('username', {
                    required: 'Username required',
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Letters, numbers & underscore only',
                    },
                  })}
                />
                {errors.username && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.username.message}
                  </p>
                )}
              </div>
            </div>

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
                      message: 'Letters only',
                    },
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
                      message: 'Letters only',
                    },
                  })}
                />
                {errors.last_name && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <textarea
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50 resize-none h-24"
                  {...register('bio', {
                    required: 'Bio is required',
                  })}
                />
                {errors.bio && (
                  <p className={errorMessageClass}>
                    <X size={16} className="mr-1" /> {errors.bio.message}
                  </p>
                )}
              </div>

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

export default EditProfile;