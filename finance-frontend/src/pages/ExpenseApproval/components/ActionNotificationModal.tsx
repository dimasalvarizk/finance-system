import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActionNotificationState } from '../types';

interface ActionNotificationModalProps {
  data: ActionNotificationState | null;
  onClose: () => void;
}

export const ActionNotificationModal: React.FC<ActionNotificationModalProps> = ({
  data,
  onClose
}) => {
  if (!data || !data.isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0c0d0f]/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 animate-scale-in transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ring-8 ${
            data.type === 'approve'
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-50/50'
              : data.type === 'reject'
              ? 'bg-red-50 text-red-600 ring-red-50/50'
              : 'bg-amber-50 text-amber-600 ring-amber-50/50'
          }`}
        >
          {data.type === 'approve' ? (
            <CheckCircle2 className="w-7 h-7" />
          ) : (
            <AlertCircle className="w-7 h-7" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-[18px] font-bold text-slate-900">
            {data.title}
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            {data.message}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
