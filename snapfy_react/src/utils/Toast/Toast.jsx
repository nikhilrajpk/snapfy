import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { hideToast } from '../../redux/slices/toastSlice';
import { useDispatch } from 'react-redux';

const Toast = ({ message, type = "success", duration = 3000 }) => {
  const dispatch = useDispatch()
    
  const [show, setShow] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      dispatch(hideToast())
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, dispatch]);

  if (!show) return null;

  const configs = {
    success: {
      borderColor: 'border-green-500',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    },
    error: {
      borderColor: 'border-red-500',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
    },
    info: {
      borderColor: 'border-blue-500',
      icon: <AlertCircle className="w-5 h-5 text-blue-500" />,
    },
    warning: {
      borderColor: 'border-orange-500',
      icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
    }
  };

  return (

    <div 
      className="fixed top-4 right-4 z-[9999] transition-all duration-300 ease-in-out transform translate-y-0 opacity-100"
      style={{
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div 
        className={`
          bg-white rounded-lg shadow-lg 
          border-l-4 ${configs[type].borderColor}
          flex items-center gap-3 p-4 min-w-[300px]
        `}
      >
        {configs[type].icon}
        <p className="text-gray-700 text-sm font-medium">{message}</p>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(Toast);