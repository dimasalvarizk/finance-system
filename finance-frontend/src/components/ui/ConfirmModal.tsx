import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0f172a]/30 backdrop-blur-[4px] transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100/80 p-6 flex flex-col items-center text-center z-10 transform scale-100 transition-all duration-300 font-sans">
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-all border-none bg-transparent cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon based on Type */}
        <div className="mt-2">
          {type === 'danger' && (
            <div className="p-3.5 bg-rose-50 text-rose-500 rounded-full">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
          )}
          {type === 'warning' && (
            <div className="p-3.5 bg-amber-50 text-amber-500 rounded-full">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
          {type === 'info' && (
            <div className="p-3.5 bg-blue-50 text-blue-500 rounded-full">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-black text-slate-800 tracking-tight mt-4">
          {title}
        </h3>

        {/* Message */}
        <p className="text-[12px] text-slate-400 font-semibold mt-2 leading-relaxed max-w-[280px]">
          {message}
        </p>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <button
            onClick={onClose}
            className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all border-none cursor-pointer text-xs font-sans"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`py-2.5 text-white font-bold rounded-xl transition-all shadow-md border-none cursor-pointer text-xs font-sans ${
              type === 'danger' 
                ? 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-rose-500/10' 
                : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-amber-500/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
