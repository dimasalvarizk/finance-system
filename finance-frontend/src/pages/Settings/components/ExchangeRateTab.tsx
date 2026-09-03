import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getExchangeRates, updateExchangeRates, getExchangeRatesHistory } from '../../../services/settingService';
import { useTranslation } from 'react-i18next';
import { formatLocalizedDate } from '../../../i18n';

interface ExchangeRates {
  usdToIdr: string;
  sarToIdr: string;
  usdToSar: string;
}

const DEFAULT_RATES: ExchangeRates = {
  usdToIdr: '18025',
  sarToIdr: '4800',
  usdToSar: '3.75'
};

const ExchangeRateTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [history, setHistory] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRatesData = async () => {
    setLoading(true);
    try {
      const data = await getExchangeRates();
      if (data) {
        setRates(data);
      }
    } catch (err) {
      console.error('Failed to load exchange rates from setting-service:', err);
    }

    try {
      const historyData = await getExchangeRatesHistory();
      setHistory(historyData || []);
    } catch (err) {
      console.error('Failed to load exchange rates history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatesData();
  }, []);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateExchangeRates(rates);
      setFeedback('Exchange rates saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
      await fetchRatesData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save exchange rates');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left w-full font-sans">

      {/* Title Header */}
      <div className="space-y-1">
        <h2 className="text-[18px] font-bold text-[#0c0d0f] font-sans">{t('settings.dailyExchangeRate')}</h2>
        <p className="text-[11px] text-[#64748b] font-normal font-sans">{t('settings.exchangeRateSubtitle')}</p>
      </div>

      {feedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* CARD 1: TODAY'S EXCHANGE RATE */}
      <form onSubmit={handleSaveRates} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">

          {/* Card Header */}
          <div className="px-6 pb-4 flex justify-between items-center">
            <div className="flex items-center space-x-1.5">
              <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">{t('settings.todayExchangeRate')}</h3>
              <span className="text-[12px] text-[#94a3b8] font-medium font-sans">({formatLocalizedDate(new Date(), i18n.language)})</span>
            </div>
            <span className="bg-[#ecfdf5] text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded-md">
              {t('settings.updated')}
            </span>
          </div>

          {/* Horizontal Divider Line */}
          <div className="h-px bg-[#e2e8f0] w-full" />

          {/* Form input list */}
          <div className="p-6 space-y-5">
            {/* USD -> IDR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-shrink-0 flex items-center space-x-4 w-[360px]">
                {/* Source USD */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/us.png" alt="US" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">USD</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">US Dollar</span>
                  </div>
                </div>
                
                {/* Arrow symbol */}
                <span className="text-slate-400 font-bold text-lg">→</span>

                {/* Target IDR */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/id.png" alt="ID" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">IDR</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">Indonesian Rupiah</span>
                  </div>
                </div>
              </div>

              {/* Input wrapper with suffix */}
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={rates.usdToIdr}
                  onChange={(e) => setRates({ ...rates, usdToIdr: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b] font-sans">
                  IDR
                </span>
              </div>
            </div>

            {/* SAR -> IDR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-shrink-0 flex items-center space-x-4 w-[360px]">
                {/* Source SAR */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/sa.png" alt="SA" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">SAR</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">Saudi Riyal</span>
                  </div>
                </div>
                
                {/* Arrow symbol */}
                <span className="text-slate-400 font-bold text-lg">→</span>

                {/* Target IDR */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/id.png" alt="ID" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">IDR</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">Indonesian Rupiah</span>
                  </div>
                </div>
              </div>

              {/* Input wrapper with suffix */}
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={rates.sarToIdr}
                  onChange={(e) => setRates({ ...rates, sarToIdr: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b] font-sans">
                  IDR
                </span>
              </div>
            </div>

            {/* USD -> SAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-shrink-0 flex items-center space-x-4 w-[360px]">
                {/* Source USD */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/us.png" alt="US" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">USD</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">US Dollar</span>
                  </div>
                </div>
                
                {/* Arrow symbol */}
                <span className="text-slate-400 font-bold text-lg">→</span>

                {/* Target SAR */}
                <div className="flex items-center space-x-2.5">
                  <img src="https://flagcdn.com/w40/sa.png" alt="SA" className="w-6 h-4.5 rounded-sm object-cover shadow-sm border border-slate-100" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0c0d0f] text-[14px] leading-tight">SAR</span>
                    <span className="text-[10px] text-[#94a3b8] font-normal leading-tight">Saudi Riyal</span>
                  </div>
                </div>
              </div>

              {/* Input wrapper with suffix */}
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={rates.usdToSar}
                  onChange={(e) => setRates({ ...rates, usdToSar: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b] font-sans">
                  SAR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons footer */}
        <div className="flex justify-end space-x-3 pt-1">
          <button
            type="button"
            className="px-6 py-2.5 bg-white border border-[#e2e8f0] text-[#475569] hover:bg-slate-50 font-bold text-[13px] rounded-xl transition-all cursor-pointer font-sans"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
          >
            {t('settings.saveRates')}
          </button>
        </div>
      </form>

      {/* CARD 2: RATE HISTORY */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col mt-4">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">{t('settings.rateHistory')}</h3>
        </div>

        {/* Horizontal Divider Line */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('common.date')}</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">USD → IDR</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">SAR → IDR</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">USD → SAR</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('common.updatedBy')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] font-medium text-[#475569]">
              {loading ? (
                Array.from({ length: 3 }).map((_, loadIdx) => (
                  <tr key={`skeleton-rate-${loadIdx}`} className="animate-pulse">
                    <td className="px-6 py-3.5"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-3.5"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-3.5"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-3.5"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-3.5"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                  </tr>
                ))
              ) : history.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold text-[#0c0d0f]">{row.date}</td>
                  <td className="px-6 py-3.5">{row.usdIdr}</td>
                  <td className="px-6 py-3.5">{row.sarIdr}</td>
                  <td className="px-6 py-3.5">{row.usdSar}</td>
                  <td className="px-6 py-3.5 text-[#94a3b8] font-normal">{row.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ExchangeRateTab;
