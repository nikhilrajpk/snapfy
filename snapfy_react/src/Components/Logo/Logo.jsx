import React from 'react';

const Logo = () => {
  return (
    <div className="mb-3 text-center relative">
      <div className="relative inline-block">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1E3932] to-[#198754] font-['Orbitron'] transform hover:scale-105 transition-transform duration-200 cursor-default">
          SNAPFY
        </h1>
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#198754] rounded-full blur-xl opacity-50 animate-pulse"></div>
      </div>
    </div>
  );
};

export default Logo;