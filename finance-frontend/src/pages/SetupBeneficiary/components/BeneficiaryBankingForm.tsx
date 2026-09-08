import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, CheckCircle2, AlertTriangle, ChevronDown, RefreshCw, ShieldCheck } from 'lucide-react';
import { SUPPORTED_BANKS, BANK_CONFIGS } from '../constants';
import type { BeneficiaryAccountData } from '../types';
import { inquireBankAccount } from '../../../services/expenseService';

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

  const currentBankConfig = BANK_CONFIGS[formData.bankName] || BANK_CONFIGS['Bank Danamon'];

  const [isInquiring, setIsInquiring] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<{
    success: boolean;
    registeredName?: string;
    clearingNetwork?: string;
    message?: string;
  } | null>(null);

  // Validate IBAN: Saudi IBAN has 24 chars (excluding spaces)
  const cleanIban = (formData.iban || '').replace(/\s+/g, '');
  const isIbanValid = !currentBankConfig.isIbanRequired || cleanIban.length === 24;

  const cleanAcc = (formData.accountNumber || '').trim().replace(/\D/g, '');
  const isAccountLengthValid =
    cleanAcc.length >= currentBankConfig.accountLengthMin &&
    cleanAcc.length <= currentBankConfig.accountLengthMax;

  const handleBankChange = (newBank: string) => {
    const config = BANK_CONFIGS[newBank] || BANK_CONFIGS['Bank Danamon'];
    setFormData((prev) => ({
      ...prev,
      bankName: newBank,
      targetCurrency: config.currency,
      swiftCode: config.swiftCode,
      bankBranch: config.bankBranch,
      iban: config.isIbanRequired ? prev.iban || 'SA80 4000 0000 1234 5678' : ''
    }));
    setInquiryResult(null);
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, iban: val }));
  };

  const handleSwiftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, swiftCode: e.target.value.toUpperCase() }));
  };

  const handleInquireAccount = async () => {
    if (!formData.accountNumber || cleanAcc.length < 8) return;

    setIsInquiring(true);
    setInquiryResult(null);

    try {
      const res = await inquireBankAccount({
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountHolderName: formData.accountHolderName
      });

      if (res.success && res.data) {
        setInquiryResult({
          success: true,
          registeredName: res.data.accountHolderName,
          clearingNetwork: res.data.clearingNetwork,
          message: res.message
        });
        if (res.data.accountHolderName) {
          setFormData((prev) => ({
            ...prev,
            accountHolderName: res.data.accountHolderName
          }));
        }
      }
    } catch (err: any) {
      const is404 = err?.response?.status === 404;
      setInquiryResult({
        success: false,
        message: is404
          ? t('setupBeneficiary.accountNotFound', {
              account: formData.accountNumber,
              bank: formData.bankName
            })
          : err?.response?.data?.message || t('setupBeneficiary.accountInquiryFailed')
      });
    } finally {
      setIsInquiring(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 sm:p-9 space-y-6 w-full"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
            {t('setupBeneficiary.title')}
          </h2>
          <p className="text-[12px] text-slate-400 font-medium">
            {currentBankConfig.country === 'Indonesia'
              ? t('setupBeneficiary.clearingDomestic')
              : t('setupBeneficiary.clearingInternational')}
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
            currentBankConfig.country === 'Indonesia'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {currentBankConfig.country}
        </span>
      </div>

      {/* Row 1: Bank Name & Target Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.bankName')}
          </label>
          <div className="relative">
            <select
              value={formData.bankName}
              onChange={(e) => handleBankChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer pr-10"
              required
            >
              {SUPPORTED_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.targetCurrency')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.targetCurrency || currentBankConfig.currency}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 focus:outline-none cursor-not-allowed pr-10"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: Account Holder Full Name */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.accountHolder')}
          </label>
          {inquiryResult?.success && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('setupBeneficiary.accountVerifiedOfficial', { network: 'SNAP BI' })}</span>
            </span>
          )}
        </div>
        <input
          type="text"
          value={formData.accountHolderName}
          onChange={(e) => setFormData((prev) => ({ ...prev, accountHolderName: e.target.value }))}
          placeholder="e.g. Dimas Alva Rizki"
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
          required
        />
        <p className="text-[11px] text-slate-400 font-medium pt-0.5">
          {t('setupBeneficiary.accountHolderNote')}
        </p>
      </div>

      {/* Row 3: Account Number & Live Inquiry Button */}
      <div className="space-y-2">
        <label className="text-[12.5px] font-bold text-slate-800 block">
          {t('setupBeneficiary.accountNumber')}
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, accountNumber: val }));
                setInquiryResult(null);
              }}
              placeholder={t('setupBeneficiary.accountNumberPlaceholder', {
                bank: formData.bankName,
                min: currentBankConfig.accountLengthMin,
                max: currentBankConfig.accountLengthMax
              })}
              className={`w-full px-4 py-2.5 bg-white rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none transition-all ${
                inquiryResult?.success
                  ? 'border-2 border-emerald-500 bg-emerald-50/20'
                  : isAccountLengthValid
                  ? 'border border-blue-400 focus:ring-1 focus:ring-blue-500'
                  : 'border border-slate-200 focus:border-blue-500'
              }`}
              required
            />
          </div>

          <button
            type="button"
            onClick={handleInquireAccount}
            disabled={isInquiring || cleanAcc.length < 8}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isInquiring ? 'animate-spin' : ''}`} />
            <span>{isInquiring ? t('setupBeneficiary.checkingAccount') : t('setupBeneficiary.checkAccount')}</span>
          </button>
        </div>

        {/* Live Validation & Inquiry Response Status */}
        {inquiryResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
              inquiryResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {inquiryResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold">
                {inquiryResult.success
                  ? t('setupBeneficiary.accountNameMatched', { name: inquiryResult.registeredName })
                  : inquiryResult.message}
              </p>
              {inquiryResult.success && inquiryResult.clearingNetwork && (
                <p className="text-[11px] text-emerald-600">
                  {inquiryResult.clearingNetwork} • {t('setupBeneficiary.accountStatusActive')}
                </p>
              )}
            </div>
          </div>
        )}

        {!inquiryResult && isAccountLengthValid && (
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 pt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {t('setupBeneficiary.formatValid', {
                min: currentBankConfig.accountLengthMin,
                max: currentBankConfig.accountLengthMax
              })}
            </span>
          </div>
        )}
      </div>

      {/* Row 4: IBAN (Conditional / Optional for Indonesia) */}
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-bold text-slate-800">
          {currentBankConfig.isIbanRequired
            ? t('setupBeneficiary.ibanRequired')
            : t('setupBeneficiary.ibanOptional')}
        </label>
        <input
          type="text"
          value={formData.iban || ''}
          onChange={handleIbanChange}
          placeholder={
            currentBankConfig.isIbanRequired
              ? 'SA80 4000 0000 1234 5678'
              : t('setupBeneficiary.ibanOptionalPlaceholder')
          }
          className={`w-full px-4 py-2.5 bg-white rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none transition-all ${
            !currentBankConfig.isIbanRequired
              ? 'border border-slate-200 focus:border-blue-500'
              : isIbanValid
              ? 'border-2 border-emerald-500 focus:border-emerald-600'
              : 'border-2 border-rose-400 focus:border-rose-500'
          }`}
          required={currentBankConfig.isIbanRequired}
        />
        {currentBankConfig.isIbanRequired && (
          <div className="pt-0.5">
            {isIbanValid ? (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('setupBeneficiary.ibanValid')}</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('setupBeneficiary.ibanInvalid')}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Row 5: SWIFT / BIC Code & Bank Branch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.swift')}
          </label>
          <input
            type="text"
            value={formData.swiftCode || currentBankConfig.swiftCode}
            onChange={handleSwiftChange}
            placeholder={currentBankConfig.swiftCode}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.branchLocation')}
          </label>
          <input
            type="text"
            value={formData.bankBranch || currentBankConfig.bankBranch}
            onChange={(e) => setFormData((prev) => ({ ...prev, bankBranch: e.target.value }))}
            placeholder={currentBankConfig.bankBranch}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
            required
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[12.5px] transition-all cursor-pointer"
        >
          {t('common.cancel')}
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !isIbanValid || !isAccountLengthValid}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12.5px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('common.loading')}</span>
            </>
          ) : (
            <span>{t('setupBeneficiary.saveAccount')}</span>
          )}
        </button>
      </div>
    </form>
  );
};


