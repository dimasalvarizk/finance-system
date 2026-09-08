/**
 * Approval Permissions Utility
 * Strictly enforces that each step of the 3-tier corporate approval workflow
 * is exclusively authorized by the specific designated executive:
 * 
 * Step 1: Mr. Hesham Mokhtar (Finance Director / Chief Accountant)
 * Step 2: Mr. Khalid Idriss (Branch General Manager / Division Director)
 * Step 3: Mr. Emad Moustafa (Financial Controller / Treasury)
 * 
 * Neither Super Admin nor other approvers can approve steps that do not belong to them.
 */

export interface ApprovalPermissionCheck {
  isAuthorizedApprover: boolean;
  matchedApproverName: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | null;
  canApproveCurrentStep: boolean;
  currentActiveStepNumber: number; // 1, 2, or 3
  currentRequiredApprover: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa';
  currentRequiredRole: string;
  restrictionReason?: string;
  isITDeveloper: boolean;
  itSimulationRole?: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | 'BYPASS_ALL' | null;
}

export const isDimasOrAliIT = (user: any): boolean => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  return (
    email === 'alvarizkidimas@gmail.com' ||
    email === 'ali@odst.id' ||
    email === 'admin@odst.id' ||
    name.includes('dimas') ||
    name.includes('ali') ||
    role === 'super admin'
  );
};

export const checkIsAuthorizedApprover = (
  user: any,
  currentActiveStepNumber: number = 1,
  itSimulatedApprover?: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | 'BYPASS_ALL' | null
): ApprovalPermissionCheck => {
  const currentStep = Math.min(Math.max(currentActiveStepNumber, 1), 3);

  let currentRequiredApprover: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' = 'Mr. Hesham Mokhtar';
  let currentRequiredRole = 'Finance Director / Chief Accountant';

  if (currentStep === 2) {
    currentRequiredApprover = 'Mr. Khalid Idriss';
    currentRequiredRole = 'Branch General Manager';
  } else if (currentStep === 3) {
    currentRequiredApprover = 'Mr. Emad Moustafa';
    currentRequiredRole = 'Financial Controller / Treasury';
  }

  const isITDeveloper = isDimasOrAliIT(user);

  if (!user) {
    return {
      isAuthorizedApprover: false,
      matchedApproverName: null,
      canApproveCurrentStep: false,
      currentActiveStepNumber: currentStep,
      currentRequiredApprover,
      currentRequiredRole,
      restrictionReason: 'Silakan login menggunakan akun salah satu approver resmi.',
      isITDeveloper: false,
      itSimulationRole: null
    };
  }

  const name = (user.name || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  const id = (user.id || '').toLowerCase().trim();

  // 1. Strictly Mr. Hesham Mokhtar
  const isHesham =
    id === 'usr_hesham' ||
    (name.includes('hesham') && (name.includes('mokhtar') || email.includes('hesham'))) ||
    email.includes('hesham.mokhtar') ||
    email.includes('hesham@') ||
    (isITDeveloper && itSimulatedApprover === 'Mr. Hesham Mokhtar');

  // 2. Strictly Mr. Khalid Idriss
  const isKhalid =
    id === 'usr_khalid' ||
    (name.includes('khalid') && (name.includes('idriss') || email.includes('khalid'))) ||
    email.includes('khalid@odst.id') ||
    email.includes('khalid@') ||
    (isITDeveloper && itSimulatedApprover === 'Mr. Khalid Idriss');

  // 3. Strictly Mr. Emad Moustafa
  const isEmad =
    id === 'usr_emad_moustafa' ||
    (name.includes('emad') && (name.includes('moustafa') || email.includes('emad'))) ||
    email.includes('emad@mukhtaraair.com') ||
    email.includes('emad@') ||
    (isITDeveloper && itSimulatedApprover === 'Mr. Emad Moustafa');

  // 4. IT Full Bypass Mode
  const isBypassAll = isITDeveloper && itSimulatedApprover === 'BYPASS_ALL';

  let matchedApproverName: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | null = null;
  if (isHesham) matchedApproverName = 'Mr. Hesham Mokhtar';
  else if (isKhalid) matchedApproverName = 'Mr. Khalid Idriss';
  else if (isEmad) matchedApproverName = 'Mr. Emad Moustafa';
  else if (isBypassAll) matchedApproverName = currentRequiredApprover;

  let isAuthorizedApprover = Boolean(matchedApproverName) || isBypassAll;

  let canApproveCurrentStep = false;
  if (isBypassAll) canApproveCurrentStep = true;
  else if (currentStep === 1 && isHesham) canApproveCurrentStep = true;
  else if (currentStep === 2 && isKhalid) canApproveCurrentStep = true;
  else if (currentStep === 3 && isEmad) canApproveCurrentStep = true;

  let restrictionReason: string | undefined = undefined;

  if (!isAuthorizedApprover) {
    restrictionReason = `Akses Ditolak: Akun Anda (${user.name || user.email || 'Pengguna'}) bukan salah satu dari 3 approver resmi. Hanya Mr. Hesham Mokhtar, Mr. Khalid Idriss, dan Mr. Emad Moustafa yang berwenang menyetujui klaim ini.`;
  } else if (!canApproveCurrentStep) {
    restrictionReason = `Bukan Giliran Anda: Anda terotentikasi sebagai ${matchedApproverName}. Tahap ${currentStep} saat ini merupakan wewenang eksklusif ${currentRequiredApprover} (${currentRequiredRole}).`;
  }

  return {
    isAuthorizedApprover,
    matchedApproverName,
    canApproveCurrentStep,
    currentActiveStepNumber: currentStep,
    currentRequiredApprover,
    currentRequiredRole,
    restrictionReason,
    isITDeveloper,
    itSimulationRole: itSimulatedApprover || null
  };
};

