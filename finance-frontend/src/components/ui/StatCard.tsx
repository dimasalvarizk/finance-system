import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  badgeText: string;
  badgeColorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  badgeText,
  badgeColorClass,
}) => {
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
