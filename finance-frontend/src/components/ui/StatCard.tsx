import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  badgeText: string;
  badgeColorClass: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  badgeText,
  badgeColorClass,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] flex flex-col justify-between shadow-sm animate-pulse select-none min-h-[125px]">
        <div className="flex justify-between items-start">
          <div className="h-3.5 bg-slate-200 rounded w-28"></div>
          <div className="h-4 bg-slate-100 rounded-full w-16"></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-7 bg-slate-200 rounded w-24"></div>
          <div className="h-3 bg-slate-100 rounded w-36"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start">
        <span className="text-[12px] text-[#64748b] font-semibold font-inter">
          {title}
        </span>
        {badgeText && (
          <span className={`px-2 py-0.5 font-bold text-[11px] rounded-full font-inter ${badgeColorClass}`}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="mt-4">
        <span className="text-[28px] font-bold text-[#0c0d0f] font-roboto">
          {value}
        </span>
        <p className="text-[12px] text-[#94a3b8] font-medium mt-1 font-sans">
          {subtext}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
