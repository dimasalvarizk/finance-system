import type { BeneficiaryAccountData } from './types';

export const SUPPORTED_BANKS = [
  'Danamon',
  'Al Rajhi Bank',
  'Saudi National Bank (SNB)',
  'Riyad Bank',
  'Bank Mandiri',
  'Bank Central Asia (BCA)',
  'Bank Negara Indonesia (BNI)',
  'Banque Saudi Fransi',
  'Arab National Bank (ANB)',
  'Alinma Bank'
];

export const DEFAULT_BENEFICIARY_DATA: BeneficiaryAccountData = {
  bankName: 'Danamon',
  targetCurrency: 'Saudi Riyal (SAR)',
  accountHolderName: 'Emad Moustafa',
  accountNumber: '0000000000000000',
  iban: 'SA80 4000 0000 1234 5678',
  swiftCode: 'DNMNSARIXXX',
  bankBranch: 'Olaya Main Office, Riyadh',
  isVerified: false
};
