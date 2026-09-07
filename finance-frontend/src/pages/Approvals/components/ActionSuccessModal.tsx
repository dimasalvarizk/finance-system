import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ActionSuccessPayload } from '../types';

interface ActionSuccessModalProps {
  data: ActionSuccessPayload | null;
  onClose: () => void;
}

export const ActionSuccessModal: React.FC<ActionSuccessModalProps> = ({
  data,
  onClose
}) => {
  if (!data || !data.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-scale-up font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-slate-900">{data.title}</h3>
          <p className="text-[12.5px] text-slate-500 leading-relaxed">{data.message}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[12.5px] transition-all cursor-pointer"
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
};
