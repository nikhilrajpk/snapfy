import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useDispatch } from 'react-redux';

import { showToast } from '../../redux/slices/toastSlice';
import { verifyOTP, resendOTP } from '../../API/authAPI';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [counter, setCounter] = useState(30);
  const [submitCount, setSubmitCount] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()

  // memoizing the retrieval of email
  const email = useMemo(() => searchParams.get("email"), [searchParams]);
  const forgot_password = useMemo(() => searchParams.get("forgot_password", false), [searchParams]);

  // Counter effect
  useEffect(() => {
    const timer = counter > 0 && setInterval(() => {
      setCounter((prev) => prev - 1);
    }, 1000);

    if (counter === 0) {
      setIsResendDisabled(false);
    }

    return () => clearInterval(timer);
  }, [counter]);

  const handleResendOTP = async () => {
    if (resendCount >= 3) {
      // dispatching toast action
      dispatch(showToast({message: "Maximum resend attempts reached. Please try registering again.", type: "error"}))
      
      // Redirect to register page 
      navigate('/register');
      return;
    }

    try {
      setLoading(true);
      const response = await resendOTP({"email": email})
      
      setResendCount(prev => prev + 1);
      setCounter(30);
      setIsResendDisabled(true);
      // dispatching toast action
      dispatch(showToast({message: "OTP resent successfully!", type: "success"}))

    } catch (error) {
      // dispatching toast action
      dispatch(showToast({message: error.response?.data || "Failed to resend OTP", type: "error"}))
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4).split('');
    const newOtp = [...otp];
    
    pastedData.forEach((value, index) => {
      if (index < 4 && /^\d$/.test(value)) {
        newOtp[index] = value;
      }
    });
    
    setOtp(newOtp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 4) {
      // dispatching toast action
      dispatch(showToast({message: "Please enter all 4 digits", type: "error"}))
      return;
    }

    // submit counter checking - 3 chances.
    setSubmitCount((prev)=> prev + 1)
    if (submitCount === 3){
        // dispatching toast action
        dispatch(showToast({message: "You have reached your submit limit!", type: "error"}))
        if (forgot_password){
          navigate('/')
        }else{
          navigate('/register')
        }
        return
    }

    setLoading(true);
    try {
      const response = await verifyOTP({"email":email, "otp":otpString})
      // dispatching toast action
      dispatch(showToast({message: response?.message || "OTP verified successfully!", type: "success"}))

      if(forgot_password){
        navigate(`/reset-password?email=${encodeURIComponent(email)}`) 
      }else{
        navigate('/');
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
            
            dispatch(showToast({message: errorMessage || "Verification failed", type: "error"}))
        } else {
            dispatch(showToast({message: "An unexpected error occured", type: "error"}))
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">

      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="text-center mb-8 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#FF6C37] font-['Orbitron'] transform hover:scale-105 transition-transform duration-600 cursor-default">
              SNAPFY
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6C37] rounded-full blur-xl opacity-50"></div>
          </div>
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">
            Enter Verification Code
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-14 h-14 text-center text-2xl font-bold bg-white/5 border-2 border-white/20 rounded-xl focus:outline-none focus:border-[#FF6C37] text-white placeholder-white/30"
                  placeholder="•"
                />
              ))}
            </div>

            {/* Counter and Resend Section */}
            <div className="text-center space-y-2">
              {counter > 0 ? (
                <p className="text-white/70">
                  Resend OTP in <span className="text-[#FF6C37] font-semibold">{counter}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResendDisabled || resendCount >= 3 || loading}
                  className="flex items-center justify-center gap-2 text-white/70 hover:text-white transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resend OTP {resendCount > 0 && `(${3 - resendCount} attempts left)`}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-[#1E3932] text-white rounded-xl hover:bg-[#198754] focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transform hover:scale-105 transition-all duration-200 flex items-center justify-center group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center">
                {loading ? "Verifying..." : "Verify OTP"}
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            <span
             className="w-full flex items-center justify-center text-white/70 hover:text-white transition-colors group"
            >You have only {3 - submitCount} chances left</span>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center text-white/70 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {forgot_password ? "Back to Login" : "Back to Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OTPVerification);