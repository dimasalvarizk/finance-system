import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditTrailLogItem } from '../types';
import { AuditStepDetailModal } from './AuditStepDetailModal';

interface ComplianceAuditTrailCardProps {
  logs: AuditTrailLogItem[];
  claimReference?: string;
}

export const ComplianceAuditTrailCard: React.FC<ComplianceAuditTrailCardProps> = ({ 
  logs,
  claimReference = 'PRJ-RYD-2024'
}) => {
  const { t } = useTranslation();
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 sm:p-8 space-y-6 font-sans">
        {/* Title */}
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
          {t('preExecutionPayment.auditTrail')}
        </h2>

        {/* Chronological Timeline */}
        <div className="space-y-0 pt-1">
          {logs.map((log, index) => {
            const isLast = index === logs.length - 1;
            const isSettlementCompleted = index === 5 || log.title.toLowerCase().includes('settlement completed');

            let dotBg = 'bg-slate-400';
            if (index === 0) dotBg = 'bg-slate-400';
            else if (index === 4) dotBg = 'bg-blue-600';
            else if (isSettlementCompleted) dotBg = 'bg-emerald-500';
            else dotBg = 'bg-emerald-500';

            return (
              <div
                key={log.id || index}
                onClick={() => setSelectedLogIndex(index)}
                className="flex items-start space-x-3.5 group cursor-pointer"
              >
                {/* Left Dot and Connecting Vertical Line */}
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div
                    className={`${
                      isSettlementCompleted ? 'w-4 h-4' : 'w-3 h-3'
                    } rounded-full ${dotBg} transition-transform group-hover:scale-110`}
                  />
                  {!isLast && (
                    <div className="w-[1.5px] h-9 bg-slate-200/90 my-1" />
                  )}
                </div>

                {/* Right Content */}
                <div className={`${isLast ? 'pb-1' : 'pb-2'} space-y-0.5`}>
                  <h4
                    className={`text-[13.5px] leading-tight transition-colors ${
                      isSettlementCompleted
                        ? 'font-extrabold text-emerald-700 group-hover:text-emerald-800'
                        : 'font-bold text-slate-900 group-hover:text-blue-600'
                    }`}
                  >
                    {log.title}
                  </h4>
                  <p className="text-[11.5px] text-slate-400 font-medium">
                    {log.timestamp} • {log.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Detail Inspection Modal */}
      {selectedLogIndex !== null && (
        <AuditStepDetailModal
          logs={logs}
          currentIndex={selectedLogIndex}
          claimReference={claimReference}
          onSelectIndex={(index) => setSelectedLogIndex(index)}
          onClose={() => setSelectedLogIndex(null)}
        />
      )}
    </>
  );
};


