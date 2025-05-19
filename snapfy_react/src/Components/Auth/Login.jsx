import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import {useDispatch} from 'react-redux';
import {login} from '../../redux/slices/userSlice'
import { userLogin, googleSignIn } from '../../API/authAPI';
import Loader from '../../utils/Loader/Loader'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { showToast } from '../../redux/slices/toastSlice';

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false)
  
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await userLogin(data);
      console.log('Login response:', response);
      dispatch(login({ user: response.user }));
      
      document.cookie = `access_token=${response.access}; path=/; max-age=${3600 * 24}; SameSite=Lax`;
      document.cookie = `refresh_token=${response.refresh}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax`;
      if (response.is_admin) {
        dispatch(showToast({ message: "Admin logged in", type: "success" }));
        navigate('/admin');
      } else {
        dispatch(showToast({ message: "User logged in", type: "success" }));
        navigate('/home');
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (errorResponse) {
          let errorMessage = "";
          
          // Handle different formats of error responses
          if (typeof errorResponse === 'string') {
          // If response is just a string
          errorMessage = errorResponse;
          } else if (errorResponse.detail) {
          // DRF often puts a single error in a 'detail' field
          errorMessage = errorResponse.detail;
          } else if (typeof errorResponse === 'object') {
          // Handle object with field-level errors
          errorMessage = Object.entries(errorResponse).map(([field, messages]) => {
              if (Array.isArray(messages)) {
              return `${field}: ${messages.join(", ")}`;
              } else if (typeof messages === 'string') {
              return `${field}: ${messages}`;
              } else {
              return `${field}: Invalid format`;
              }
          }).join("\n");
          }
          
          dispatch(showToast({message:errorMessage || "Verification failed", type:"error"}))
      } else {
          dispatch(showToast({message: "An unexpected error occurred", type:"error"}))
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const res = await googleSignIn(response.credential);
      console.log('Google sign-in response:', res);
      dispatch(login({ user: res.user }));
      if (res.access && res.refresh) {
        // Manually set cookies if tokens are in response body
        document.cookie = `access_token=${res.access}; path=/; max-age=${3600 * 24}; SameSite=Lax`;
        document.cookie = `refresh_token=${res.refresh}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax`;
      }
      dispatch(showToast({ message: "User Logged In", type: "success" }));
      navigate('/home');
    } catch (error) {
      const errorResponse = error.response?.data;

      if (errorResponse) {
          let errorMessage = "";
          
          // Handle different formats of error responses
          if (typeof errorResponse === 'string') {
          // If response is just a string
          errorMessage = errorResponse;
          } else if (errorResponse.detail) {
          // DRF often puts a single error in a 'detail' field
          errorMessage = errorResponse.detail;
          } else if (typeof errorResponse === 'object') {
          // Handle object with field-level errors
          errorMessage = Object.entries(errorResponse).map(([field, messages]) => {
              if (Array.isArray(messages)) {
              return `${field}: ${messages.join(", ")}`;
              } else if (typeof messages === 'string') {
              return `${field}: ${messages}`;
              } else {
              return `${field}: Invalid format`;
              }
          }).join("\n");
          }
          
          dispatch(showToast({message:errorMessage || "This email already exist", type:"error"}))
      } else {
          dispatch(showToast({message: "An unexpected error occurred", type:"error"}))
      }
    }
  };

  const handleGoogleError = () => {
    dispatch(showToast({ message: "Google Login failed", type: "error" }));
  };

  const errorMessageClass = "mt-1 text-red-300 bg-red-900/40 text-sm flex items-center px-2 py-1 rounded-md border border-red-500/20";

  return loading ? <Loader/> : (
    <GoogleOAuthProvider clientId={String(import.meta.env.VITE_GOOGLE_CLIENT_ID)}>

    <div className="min-h-screen bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">

      <div className="w-full max-w-md relative">
        {/* Decorative Elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        {/* <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#FF6C37]/20 rounded-full blur-2xl"></div> */}
        
        {/* Logo/Brand */}
        <div className="text-center mb-8 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#FF6C37] font-['Orbitron'] transform hover:scale-105 transition-transform duration-200 cursor-default animate-pulse">
              SNAPFY
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6C37] rounded-full blur-xl opacity-50 animate-pulse"></div>
          </div>
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">Welcome back</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>
          
          <h2 className="text-2xl font-semibold text-white mb-8 text-center">Login to Your Account</h2>
          
          {/* Google Sign In Button */}
          <div className="mb-6 mx-auto hover:scale-105 duration-300">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              text="signin_with"
              theme="filled_white"
              shape="pill" 
            />
          </div>
          

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-white/60 bg-[#1E3932]/50 backdrop-blur-xl rounded-full">or continue with</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username Field */}
            <div>
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                {...register('username', {
                  required: 'Username is required'
                })}
              />
              {errors.username && (
                <p className={errorMessageClass}>
                  <span className="mr-1">⚠</span> {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50 pr-10"
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className={errorMessageClass}>
                  <span className="mr-1">⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link 
                to="/enter-email"
                className="text-[#1E3932] hover:text-white transition-colors text-sm relative group"
              >
                Forgot Password?
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 px-6 bg-[#1E3932] text-white rounded-xl hover:bg-[#198754] focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transform hover:scale-105 transition-all duration-200 flex items-center justify-center group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Login
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-white/70 mt-6">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-[#1E3932] hover:text-white hover:underline transition-colors relative group">
                Sign up
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
    </GoogleOAuthProvider>
  );
};

export default Login;