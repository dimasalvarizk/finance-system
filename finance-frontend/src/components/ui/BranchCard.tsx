import React from 'react';

interface BranchCardProps {
  office: string;
  share: string;
  amount: string;
  dotColor: string;
  onClick?: () => void;
}

const BranchCard: React.FC<BranchCardProps> = ({
  office,
  share,
  amount,
  dotColor,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border border-[#e2e8f0] flex items-center justify-between shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300' : ''
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`}></span>
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-[#1e293b] truncate font-sans">
            {office}
          </h4>
          <span className="text-[11px] text-[#94a3b8] font-medium block truncate font-inter">
            {share}
          </span>
        </div>
      </div>
      <span className="text-[14px] font-bold text-[#1e293b] font-roboto ml-2">
        {amount}
      </span>
    </div>
  );
};

export default BranchCard;
