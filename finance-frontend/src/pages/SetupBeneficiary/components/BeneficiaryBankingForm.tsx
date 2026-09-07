import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { SUPPORTED_BANKS } from '../constants';
import type { BeneficiaryAccountData } from '../types';

interface BeneficiaryBankingFormProps {
  formData: BeneficiaryAccountData;
  setFormData: React.Dispatch<React.SetStateAction<BeneficiaryAccountData>>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const BeneficiaryBankingForm: React.FC<BeneficiaryBankingFormProps> = ({
  formData,
  setFormData,
  isSubmitting,
  onCancel,
  onSubmit
}) => {
  const { t } = useTranslation();

  // Validate IBAN: Saudi IBAN has 24 chars (excluding spaces)
  const cleanIban = formData.iban.replace(/\s+/g, '');
  const isIbanValid = cleanIban.length === 24;
  const isAccountValid = formData.accountNumber.trim().length >= 10;

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, iban: val }));
  };

  const handleSwiftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, swiftCode: e.target.value.toUpperCase() }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 sm:p-9 space-y-6 max-w-[820px] w-full mx-auto"
    >
      <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
        {t('setupBeneficiary.title') || 'Beneficiary Banking Form'}
      </h2>

      {/* Row 1: Bank Name & Target Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.bankName') || 'Bank Name'}
          </label>
          <div className="relative">
            <select
              value={formData.bankName}
              onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer pr-10"
              required
            >
              {SUPPORTED_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.currency') || 'Target Currency'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.targetCurrency}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-400 focus:outline-none cursor-not-allowed pr-10"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: Account Holder Full Name */}
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-bold text-slate-800">
          {t('setupBeneficiary.accountHolder') || 'Account Holder Full Name'}
        </label>
        <input
          type="text"
          value={formData.accountHolderName}
          onChange={(e) => setFormData((prev) => ({ ...prev, accountHolderName: e.target.value }))}
          placeholder="e.g. Emad Moustafa"
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
          required
        />
        <p className="text-[11px] text-slate-400 font-medium pt-0.5">
          Must match the legal registration on the national ID registry.
        </p>
      </div>

      {/* Row 3: Account Number & IBAN with active validation status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Account Number */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.accountNumber') || 'Account Number'}
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
            className={`w-full px-4 py-2.5 bg-white rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none transition-all ${
              isAccountValid
                ? 'border-2 border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                : 'border border-slate-200 focus:border-blue-500'
            }`}
            required
          />
          {isAccountValid ? (
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Format checked & valid</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Enter full account digits</p>
          )}
        </div>

        {/* IBAN */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.iban') || 'IBAN (International Bank Account Number)'}
          </label>
          <input
            type="text"
            value={formData.iban}
            onChange={handleIbanChange}
            className={`w-full px-4 py-2.5 bg-white rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none transition-all ${
              isIbanValid
                ? 'border-2 border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                : 'border-2 border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            }`}
            required
          />
          {isIbanValid ? (
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>IBAN verified & 24 characters</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-rose-600 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>IBAN must contain exactly 24 characters</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: SWIFT / BIC Code & Bank Branch / Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.swift') || 'SWIFT / BIC Code'}
          </label>
          <input
            type="text"
            value={formData.swiftCode}
            onChange={handleSwiftChange}
            placeholder="e.g. DNMNSARIXXX"
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('common.branch') || 'Bank Branch / Location'}
          </label>
          <input
            type="text"
            value={formData.bankBranch}
            onChange={(e) => setFormData((prev) => ({ ...prev, bankBranch: e.target.value }))}
            placeholder="e.g. Olaya Main Office, Riyadh"
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
            required
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[12.5px] transition-all cursor-pointer"
        >
          {t('common.cancel') || 'Cancel Setup'}
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12.5px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (t('common.loading') || 'Verifying Account...') : (t('setupBeneficiary.saveAccount') || 'Save & Verify Account Details')}
        </button>
      </div>
    </form>
  );
};

