export type ExecutionStep = 'review' | 'tunnel' | 'dispatched';

export interface AuditTrailLogItem {
  id: string;
  stepNumber: number;
  title: string;
  timestamp: string;
  detail: string;
  status: 'completed' | 'active' | 'pending';
  dotColor: 'gray' | 'green' | 'blue';
  actor: string;
  actorRole: string;
  actorDepartment?: string;
  authMethod: string;
  ipAddress: string;
  location: string;
  signatureHash: string;
  notes: string;
  policyCheckPassed: boolean;
  policyCheckDetails?: string;
}

export interface PaymentExecutionData {
  claimReference: string;
  invoiceVendor: string;
  invoiceVatId: string;
  amount: number;
  currency: string;
  debitBank: string;
  debitAccountMasked: string;
  creditEmployee: string;
  creditBank: string;
  creditAccount: string;
  settlementRoute: string;
  estimatedSpeed: string;
  otpCode: string;
  chiefAccountantName?: string;
  chiefAccountantRole?: string;
  controllerName?: string;
  controllerRole?: string;
  transactionTraceId: string;
  acknowledgementCode: string;
  transferTimestamp: string;
  settledFromAccount: string;
  settledToAccount: string;
  auditLogs: AuditTrailLogItem[];
}
