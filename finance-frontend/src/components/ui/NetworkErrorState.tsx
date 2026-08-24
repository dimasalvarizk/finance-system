import React from 'react';
import { AlertCircle } from 'lucide-react';

interface NetworkErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in font-sans">
      {/* Icon with circular background */}
      <div className="w-16 h-16 bg-[#fffbeb] text-[#d97706] rounded-full flex items-center justify-center mb-5 border border-[#fef3c7] shadow-sm animate-pulse">
        <AlertCircle className="w-7 h-7" />
      </div>

      {/* Title */}
      <h3 className="text-[18px] font-extrabold text-[#0c0d0f] mb-2 font-sans tracking-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[13px] text-[#64748b] font-medium max-w-sm leading-relaxed mb-6 font-sans">
        {message}
      </p>

      {/* Try Again Button */}
      <button
        type="button"
        onClick={onRetry}
        className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-bold rounded-lg shadow-sm transition-all duration-200 font-inter cursor-pointer hover:shadow"
      >
        Try Again
      </button>
    </div>
  );
};

export default NetworkErrorState;
