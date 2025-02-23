import React from 'react';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import Error404 from '../assets/404error.png'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Error Image */}
        <img 
          src={Error404}
          alt="404 Error Illustration"
          className="mx-auto mb-8 rounded-lg shadow-lg"
        />
        
        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 text-lg mb-8">
          Oops! The page you&apos;re looking for seems to have vanished into the digital void.
        </p>
        
        {/* Back to Home Button */}
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-[#1E3932] rounded-lg hover:bg-[#198754] transition-colors duration-200"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>
      
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 mask-fade-out pointer-events-none" 
           style={{
             backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`,
             backgroundSize: '40px 40px',
             maskImage: 'linear-gradient(to bottom, transparent, black, transparent)'
           }}>
      </div>
    </div>
  );
};

export default NotFoundPage;