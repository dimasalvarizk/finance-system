import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'success'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0f172a]/30 backdrop-blur-[4px] transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100/80 p-6 flex flex-col items-center text-center z-10 transform scale-100 transition-all duration-300 font-sans animate-fade-in">
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-all border-none bg-transparent cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon based on Type */}
        <div className="mt-2">
          {type === 'success' && (
            <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-full animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
          {type === 'error' && (
            <div className="p-3.5 bg-rose-50 text-rose-500 rounded-full">
              <XCircle className="w-8 h-8 animate-pulse" />
            </div>
          )}
          {type === 'info' && (
            <div className="p-3.5 bg-blue-50 text-blue-500 rounded-full">
              <Info className="w-8 h-8 animate-pulse" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[17px] font-black text-slate-800 tracking-tight mt-4">
          {title}
        </h3>

        {/* Message */}
        <p className="text-[12.5px] text-slate-500 font-semibold mt-2 leading-relaxed max-w-[280px]">
          {message}
        </p>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/10 border-none cursor-pointer text-xs uppercase tracking-wider"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
