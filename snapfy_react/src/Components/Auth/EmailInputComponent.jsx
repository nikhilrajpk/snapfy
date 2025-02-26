import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {  X, ChevronRight, ArrowLeft} from 'lucide-react';
import {resendOTP} from '../../API/authAPI'
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../redux/slices/toastSlice';
import { useDispatch } from 'react-redux';

import Loader from '../../utils/Loader/Loader'

const EmailInputComponent = () => {
  
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await resendOTP(data);
      
      // Show success toast
      dispatch(showToast({message:"OTP send to email", type:'success'}))
      
      // navigation to verify email
      navigate(`/verify-otp?email=${encodeURIComponent(data?.email)}&forgot_password=true`)

    } catch (error) {
        dispatch(showToast({message:"This email is not registered. Plese register!", type:'error'}))
    } finally {
      setLoading(false);
    }
  };

  // Error message style class
  const errorMessageClass = "mt-1 text-red-300 bg-red-900/40 text-sm flex items-center px-2 py-1 rounded-md border border-red-500/20";

  return loading ? (<Loader/>) : (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">

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
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">Enter Your Email</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>
          
          {/* <h2 className="text-2xl font-semibold text-white mb-8 text-center">Join the Community</h2> */}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username & Email */}
            <div className="grid grid-cols-1">
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-6 bg-[#1E3932] text-white rounded-xl hover:bg-[#198754] focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transform hover:scale-105 transition-all duration-200 flex items-center justify-center group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                SEND OTP
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
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailInputComponent