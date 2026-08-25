import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getCompanySetting, updateCompanySetting } from '../../../services/settingService';

const CompanyInfoTab: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);

  // Saving states
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);

  // Feedback states
  const [phoneFeedback, setPhoneFeedback] = useState<string | null>(null);
  const [taxFeedback, setTaxFeedback] = useState<string | null>(null);
  const [notesFeedback, setNotesFeedback] = useState<string | null>(null);
  const [termsFeedback, setTermsFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const data = await getCompanySetting();
        if (data) {
          setPhone(data.phone || '');
          setTaxNumber(data.taxNumber || '');
          setDefaultNotes(data.defaultNotes || '');
          setTermsAndConditions(data.termsAndConditions || '');
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
    <div className="space-y-6 max-w-4xl">

      {/* 1. Contact Information Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Contact Information</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            Update your company's phone number and contact details
          </p>
        </div>
        <form onSubmit={handleSavePhone} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">Phone Number</label>
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
              {savingPhone ? 'Saving...' : 'Save'}
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
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Tax Information</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            Set your company tax identification number for invoices
          </p>
        </div>
        <form onSubmit={handleSaveTax} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">Tax Number</label>
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
              {savingTax ? 'Saving...' : 'Save'}
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

      {/* 3. Notes Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Notes</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            Add default notes that will appear on your invoices
          </p>
        </div>
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155] font-sans">Default Notes</label>
            <textarea
              rows={3}
              placeholder="Enter default notes for invoices..."
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
              {savingNotes ? 'Saving...' : 'Save'}
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
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Terms & Conditions</h3>
          <p className="text-[12.5px] text-[#64748b] font-medium font-sans">
            Define the default terms and conditions included on invoices
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
              {savingTerms ? 'Saving...' : 'Save'}
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
