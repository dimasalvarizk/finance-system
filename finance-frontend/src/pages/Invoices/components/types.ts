export interface Invoice {
  invoiceNo: string;
  company: string;
  companyCode: string;
  referenceNo: string;
  serialNo: string;
  amount: string;
  date: string;
  status: string;
  requestStatus?: string | null;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  dueDate?: string;
  advancePayment?: number;
  remainingBalance?: number;
  totalPaid?: number;
  totalInstallments?: number;
  items?: {
    description: string;
    qty: number;
    price: number;
  }[];
  createdBy?: string;
  branch?: string;
  taxRate?: number;
  paymentAttachment?: string;
  agent?: string;
  currency?: string;
  company_id?: string | null;
  custom_company_name?: string | null;
  custom_company_email?: string | null;
  custom_agent?: string | null;
  custom_address?: string | null;
  custom_tax_number?: string | null;
  group_number?: string | null;
  groupNumber?: string | null;
  nationality?: string | null;
}

export interface InvoiceDetail {
  dueDate: string;
  group_number?: string | null;
  groupNumber?: string | null;
  nationality?: string | null;
  billFrom: {
    name: string;
    id: string;
    entity: string;
    phone: string;
    email: string;
    tax: string;
  };
  billTo: {
    company: string;
    tax: string;
    address: string;
    cityCountry: string;
    agent?: string;
  };
  items: {
    description: string;
    qty: number;
    price: string;
    total: string;
  }[];
  subtotal: string;
  subtotalAmount?: number;
  deposit?: string;
  depositAmount?: number;
  hasDeposit?: boolean;
  tax: string;
  total: string;
  totalAmount: number;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  taxRate?: number;
  currency?: string;
}

export interface CompanyOption {
  id?: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  agent?: string;
  creditBalance?: number;
}

export interface InvoiceItemForm {
  description: string;
  qty: number;
  price: number;
}
