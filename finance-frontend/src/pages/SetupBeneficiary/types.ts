export interface BeneficiaryAccountData {
  id?: string;
  employeeId?: string;
  bankName: string;
  targetCurrency: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  bankBranch: string;
  isVerified?: boolean;
}

export interface VerificationSuccessState {
  isOpen: boolean;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string;
}
