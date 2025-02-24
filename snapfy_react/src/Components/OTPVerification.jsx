import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const navigate = useNavigate();

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current input is empty
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
      setToast({
        show: true,
        message: "Please enter all 4 digits",
        type: "error"
      });
      return;
    }

    setLoading(true);
    try {
      // Add your OTP verification API call here
      // const response = await verifyOTP(otpString);
      
      // Simulated success
      setToast({
        show: true,
        message: "OTP verified successfully!",
        type: "success"
      });
      
      // Wait for toast before navigation
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Verification failed",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">
      <div className="w-full max-w-md relative">
        {/* Decorative Elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        
        {/* Logo/Brand */}
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

        {/* OTP Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* OTP Input Fields */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-[#1E3932] text-white rounded-xl hover:bg-[#198754] focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transform hover:scale-105 transition-all duration-200 flex items-center justify-center group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                {loading ? "Verifying..." : "Verify OTP"}
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center text-white/70 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Registration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;