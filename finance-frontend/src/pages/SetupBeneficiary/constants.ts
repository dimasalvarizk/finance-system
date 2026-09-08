import type { BeneficiaryAccountData } from './types';

export interface BankConfig {
  name: string;
  country: 'Indonesia' | 'Saudi Arabia';
  currency: string;
  currencyCode: 'IDR' | 'SAR';
  swiftCode: string;
  bankBranch: string;
  accountLengthMin: number;
  accountLengthMax: number;
  isIbanRequired: boolean;
  bankCode: string;
}

export const BANK_CONFIGS: Record<string, BankConfig> = {
  'Bank Danamon': {
    name: 'Bank Danamon',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'BDINIDJA',
    bankBranch: 'Cabang Graha Al Badegel / Jakarta Sudirman',
    accountLengthMin: 10,
    accountLengthMax: 12,
    isIbanRequired: false,
    bankCode: '011'
  },
  'Bank Central Asia (BCA)': {
    name: 'Bank Central Asia (BCA)',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'CENAIDJA',
    bankBranch: 'KCU Sudirman, Jakarta',
    accountLengthMin: 10,
    accountLengthMax: 10,
    isIbanRequired: false,
    bankCode: '014'
  },
  'Bank Mandiri': {
    name: 'Bank Mandiri',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'BMRIIDJA',
    bankBranch: 'Plaza Mandiri, Jakarta',
    accountLengthMin: 13,
    accountLengthMax: 13,
    isIbanRequired: false,
    bankCode: '008'
  },
  'Bank Negara Indonesia (BNI)': {
    name: 'Bank Negara Indonesia (BNI)',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'BNINIDJA',
    bankBranch: 'Grha BNI, Jakarta',
    accountLengthMin: 10,
    accountLengthMax: 10,
    isIbanRequired: false,
    bankCode: '009'
  },
  'Bank Rakyat Indonesia (BRI)': {
    name: 'Bank Rakyat Indonesia (BRI)',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'BRINIDJA',
    bankBranch: 'Gedung BRI, Jakarta',
    accountLengthMin: 15,
    accountLengthMax: 15,
    isIbanRequired: false,
    bankCode: '002'
  },
  'Bank Syariah Indonesia (BSI)': {
    name: 'Bank Syariah Indonesia (BSI)',
    country: 'Indonesia',
    currency: 'Indonesian Rupiah (IDR / RP)',
    currencyCode: 'IDR',
    swiftCode: 'BSMDIDJA',
    bankBranch: 'The Tower, Jakarta',
    accountLengthMin: 10,
    accountLengthMax: 10,
    isIbanRequired: false,
    bankCode: '451'
  },
  'Al Rajhi Bank': {
    name: 'Al Rajhi Bank',
    country: 'Saudi Arabia',
    currency: 'Saudi Riyal (SAR)',
    currencyCode: 'SAR',
    swiftCode: 'RJHIISRI',
    bankBranch: 'Olaya Main Office, Riyadh',
    accountLengthMin: 15,
    accountLengthMax: 24,
    isIbanRequired: true,
    bankCode: '80'
  },
  'Saudi National Bank (SNB)': {
    name: 'Saudi National Bank (SNB)',
    country: 'Saudi Arabia',
    currency: 'Saudi Riyal (SAR)',
    currencyCode: 'SAR',
    swiftCode: 'NCBKISRI',
    bankBranch: 'King Abdulaziz Rd, Jeddah',
    accountLengthMin: 15,
    accountLengthMax: 24,
    isIbanRequired: true,
    bankCode: '10'
  },
  'Riyad Bank': {
    name: 'Riyad Bank',
    country: 'Saudi Arabia',
    currency: 'Saudi Riyal (SAR)',
    currencyCode: 'SAR',
    swiftCode: 'RIBLISRI',
    bankBranch: 'Al Shuhada District, Riyadh',
    accountLengthMin: 15,
    accountLengthMax: 24,
    isIbanRequired: true,
    bankCode: '20'
  },
  'Alinma Bank': {
    name: 'Alinma Bank',
    country: 'Saudi Arabia',
    currency: 'Saudi Riyal (SAR)',
    currencyCode: 'SAR',
    swiftCode: 'INMAISRI',
    bankBranch: 'Al Anoud Tower, Riyadh',
    accountLengthMin: 15,
    accountLengthMax: 24,
    isIbanRequired: true,
    bankCode: '05'
  }
};

export const SUPPORTED_BANKS = Object.keys(BANK_CONFIGS);

export const DEFAULT_BENEFICIARY_DATA: BeneficiaryAccountData = {
  bankName: 'Bank Danamon',
  targetCurrency: 'Indonesian Rupiah (IDR / RP)',
  accountHolderName: 'Dimas Alva Rizki',
  accountNumber: '003601928471',
  iban: '',
  swiftCode: 'BDINIDJA',
  bankBranch: 'Cabang Graha Al Badegel / Jakarta Sudirman',
  isVerified: false
};

