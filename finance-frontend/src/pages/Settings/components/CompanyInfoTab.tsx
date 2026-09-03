import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getCompanySetting, updateCompanySetting } from '../../../services/settingService';
import { useTranslation } from 'react-i18next';

const CompanyInfoTab: React.FC = () => {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  
  // Bank Info States
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [idrAccountNumber, setIdrAccountNumber] = useState('');
  const [usdAccountNumber, setUsdAccountNumber] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);

  // Saving states
  const [savingCompanyName, setSavingCompanyName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Feedback states
  const [companyNameFeedback, setCompanyNameFeedback] = useState<string | null>(null);
  const [phoneFeedback, setPhoneFeedback] = useState<string | null>(null);
  const [taxFeedback, setTaxFeedback] = useState<string | null>(null);
  const [notesFeedback, setNotesFeedback] = useState<string | null>(null);
  const [termsFeedback, setTermsFeedback] = useState<string | null>(null);
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const data = await getCompanySetting();
        if (data) {
          setCompanyName(data.companyName || '');
          setPhone(data.phone || '');
          setTaxNumber(data.taxNumber || '');
          setDefaultNotes(data.defaultNotes || '');
          setTermsAndConditions(data.termsAndConditions || '');
          setBankName(data.bankName || '');
          setAccountName(data.accountName || '');
          setIdrAccountNumber(data.idrAccountNumber || '');
          setUsdAccountNumber(data.usdAccountNumber || '');
        }
      } catch (err) {
        console.error('Failed to load company settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanySettings();
  }, []);

  const syncLocalStorage = async () => {
    try {
      const latest = await getCompanySetting();
      if (latest) {
        localStorage.setItem('finance_company_settings', JSON.stringify(latest));
      }
    } catch (err) {
      console.error('Failed to sync company settings to localStorage:', err);
    }
  };

  const handleSaveCompanyName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompanyName(true);
    try {
      await updateCompanySetting({ companyName });
      await syncLocalStorage();
      setCompanyNameFeedback('Company identity saved successfully!');
      setTimeout(() => setCompanyNameFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save company name setting:', err);
      alert('Failed to save company name settings');
    } finally {
      setSavingCompanyName(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      await updateCompanySetting({ phone });
      await syncLocalStorage();
      setPhoneFeedback('Contact information saved successfully!');

      setTimeout(() => setPhoneFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save phone setting:', err);
      alert('Failed to save contact settings');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTax(true);
    try {
      await updateCompanySetting({ taxNumber });
      await syncLocalStorage();
      setTaxFeedback('Tax information saved successfully!');
      setTimeout(() => setTaxFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save tax setting:', err);
      alert('Failed to save tax settings');
    } finally {
      setSavingTax(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      await updateCompanySetting({ 
        bankName, 
        accountName, 
        idrAccountNumber, 
        usdAccountNumber 
      });
      await syncLocalStorage();
      setBankFeedback('Bank information saved successfully!');
      setTimeout(() => setBankFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save bank settings:', err);
      alert('Failed to save bank settings');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotes(true);
    try {
      await updateCompanySetting({ defaultNotes });
      await syncLocalStorage();
      setNotesFeedback('Default notes saved successfully!');
      setTimeout(() => setNotesFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save notes setting:', err);
      alert('Failed to save default notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTerms(true);
    try {
      await updateCompanySetting({ termsAndConditions });
      await syncLocalStorage();
      setTermsFeedback('Terms and conditions saved successfully!');
      setTimeout(() => setTermsFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save terms setting:', err);
      alert('Failed to save terms and conditions');
    } finally {
      setSavingTerms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">

      {/* 0. Company Identity Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.companyIdentity')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.companyIdentitySubtitle')}
          </p>
        </div>
        <form onSubmit={handleSaveCompanyName} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('companies.companyName') || 'Nama Perusahaan'}</label>
            <input
              type="text"
              placeholder="e.g. ODST Group"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingCompanyName}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingCompanyName ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingCompanyName ? '...' : t('common.save')}
            </button>
            {companyNameFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {companyNameFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 1. Contact Information Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.contactInfo')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.contactInfoSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSavePhone} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.phone')}</label>
            <input
              type="text"
              placeholder="+62 000-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingPhone}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingPhone ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingPhone ? '...' : t('common.save')}
            </button>
            {phoneFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {phoneFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2. Tax Information Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.taxInfo')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.taxInfoSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSaveTax} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.taxNumber')}</label>
            <input
              type="text"
              placeholder="Enter your tax identification number"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingTax}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingTax ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingTax ? '...' : t('common.save')}
            </button>
            {taxFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {taxFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2.5 Bank Info Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4 text-left">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.bankInfo')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.bankAccountSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSaveBank} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.bankName')}</label>
              <input
                type="text"
                placeholder="Enter your bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.accountHolderName')}</label>
              <input
                type="text"
                placeholder="Enter account holder name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.idrAccountNumber')}</label>
              <input
                type="text"
                placeholder="Enter IDR account number"
                value={idrAccountNumber}
                onChange={(e) => setIdrAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.usdAccountNumber')}</label>
              <input
                type="text"
                placeholder="Enter USD account number"
                value={usdAccountNumber}
                onChange={(e) => setUsdAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingBank}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingBank ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingBank ? '...' : t('common.save')}
            </button>
            {bankFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {bankFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 3. Notes Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.defaultNotes')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.defaultNotesSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">{t('settings.defaultNotes')}</label>
            <textarea
              rows={3}
              placeholder="Enter default notes for confirmations..."
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc] resize-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingNotes}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingNotes ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingNotes ? '...' : t('common.save')}
            </button>
            {notesFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {notesFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 4. Terms & Conditions Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('settings.termsAndConditions')}</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            {t('settings.termsAndConditionsSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSaveTerms} className="space-y-4">
          <div className="space-y-1.5">
            <textarea
              rows={5}
              placeholder="Enter your default terms and conditions..."
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13.5px] text-[#0c0d0f] font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all font-sans bg-[#f8fafc] resize-y"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingTerms}
              className={`px-6 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter cursor-pointer ${savingTerms ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {savingTerms ? '...' : t('common.save')}
            </button>
            {termsFeedback && (
              <span className="flex items-center gap-1 text-[#10b981] text-[12.5px] font-semibold font-sans animate-fade-in">
                <Check className="w-4 h-4 stroke-[2.5px]" />
                {termsFeedback}
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default CompanyInfoTab;
