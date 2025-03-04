import React from 'react';
import gear2 from '../../assets/gear2.gif'

const LoadingSpinners = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-16 p-4"
    // style={{
    //   backgroundImage: `url(${gear2})`,
    //   backgroundSize: 'cover',
    //   backgroundRepeat: 'no-repeat',
    //   backgroundPosition: 'center'
    // }}
    >
      {/* Pulse Ring */}
      {/* <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-100">
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">Simple Spinner</p>
      </div> */}

      {/* Dots Wave */}
      {/* <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          ></div>
        ))}
        <p className="ml-4 text-sm text-gray-600">Bouncing Dots</p>
      </div> */}

      {/* Gradient Ring */}
      {/* <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-spin">
          <div className="absolute top-1 left-1 right-1 bottom-1 bg-gray-50 rounded-full"></div>
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">Gradient Ring</p>
      </div> */}

      {/* Pulse Circle */}
      <div className="relative">
        <div className="w-16 h-16 bg-[#198754] rounded-full animate-pulse"></div>
        <div className="absolute top-0 left-0 w-16 h-16 bg-[#198754] rounded-full animate-ping opacity-75"></div>
        <p className="mt-4 text-sm text-gray-600 text-center">On the way</p>
      </div>

      {/* Progress Bar */}
      {/* <div className="w-64 absolute bottom-16">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#198754] rounded-full w-1/2 animate-[loading_1s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-4 text-md text-gray-900 text-center">On The Way</p>
      </div> */}

      <style >{`
        @keyframes loading {
          0% { transform: translateX(-100%) }
          50% { transform: translateX(100%) }
          100% { transform: translateX(-100%) }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinners;