import React from 'react';
import { Clock } from 'lucide-react';

interface QueueCardProps {
  client: string;
  refNo: string;
  amount: string;
  due: string;
  onReview?: () => void;
}

const QueueCard: React.FC<QueueCardProps> = ({
  client,
  refNo,
  amount,
  due,
  onReview,
}) => {
  return (
    <div className="p-4 border border-[#e2e8f0] rounded-xl hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-[14px] font-bold text-[#1e293b] font-sans">
            {client}
          </h4>
          <span className="text-[11px] text-[#94a3b8] font-semibold font-inter">
            {refNo}
          </span>
        </div>
        <span className="text-[14px] font-bold text-[#1e293b] font-roboto">
          {amount}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-[#64748b]">
          <Clock className="w-4 h-4 text-[#94a3b8]" />
          <span className="text-[12px] font-medium font-sans">
            {due}
          </span>
        </div>
        <button
          onClick={onReview}
          className="px-4 py-1.5 bg-[#2563eb] text-white text-[12px] font-bold rounded-lg hover:bg-[#1d4ed8] active:scale-95 transition-all"
        >
          Review
        </button>
      </div>
    </div>
  );
};

export default QueueCard;
