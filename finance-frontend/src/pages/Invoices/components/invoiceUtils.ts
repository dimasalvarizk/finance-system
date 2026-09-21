import { type Invoice, type InvoiceDetail } from './types';

export const getLocalCompanySettings = () => {
  const saved = localStorage.getItem('finance_company_settings');
  const defaults = {
    companyName: 'PT.ODST AIRLINES INDO',
    phone: '+62 8111 1203 330',
    taxNumber: '0000-0000-0001',
    defaultNotes: "Please ensure the Invoice Number (e.g. AIT-2608-011) is listed as the payment description reference.\nAttach hotel booking confirmation numbers where applicable for ground handling operations.",
    termsAndConditions: "Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.",
    bankName: 'PT Bank Negara Indonesia (Persero) Tbk',
    accountName: 'PT ODST AIRLINES INDO',
    idrAccountNumber: '009821482103',
    usdAccountNumber: '009821482561',
    bankBranchAddress: 'Grha BNI, Jl. Jend. Sudirman Kav. 1, Tanah Abang, Jakarta Pusat',
    cifNumber: '17330896',
    swiftCode: 'BNINIDJA'
  };
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        return {
          companyName: parsed.companyName || defaults.companyName,
          phone: parsed.phone || defaults.phone,
          taxNumber: parsed.taxNumber || defaults.taxNumber,
          defaultNotes: parsed.defaultNotes || defaults.defaultNotes,
          termsAndConditions: parsed.termsAndConditions || defaults.termsAndConditions,
          bankName: parsed.bankName || defaults.bankName,
          accountName: parsed.accountName || defaults.accountName,
          idrAccountNumber: parsed.idrAccountNumber || defaults.idrAccountNumber,
          usdAccountNumber: parsed.usdAccountNumber || defaults.usdAccountNumber,
          bankBranchAddress: parsed.bankBranchAddress || parsed.bank_branch_address || defaults.bankBranchAddress,
          cifNumber: parsed.cifNumber || parsed.cif_number || defaults.cifNumber,
          swiftCode: parsed.swiftCode || parsed.swift_code || defaults.swiftCode,
        };
      }
    } catch (e) {}
  }
  return defaults;
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (price === undefined || price === null || isNaN(price)) return '0';
  const cleanCurrency = String(currency).toUpperCase();
  if (cleanCurrency === 'RP' || cleanCurrency === 'IDR') {
    return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
  } else if (cleanCurrency === 'SAR') {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} SAR`;
  } else {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  }
};

export const convertPrice = (
  price: number,
  from: string,
  to: string,
  rates?: { usdToIdr: number; sarToIdr: number; usdToSar: number }
): number => {
  const f = (from || 'USD').toUpperCase();
  const t = (to || 'USD').toUpperCase();
  if (f === t) return price;

  const safeRates = rates || { usdToIdr: 18025, sarToIdr: 4800, usdToSar: 3.75 };
  const usdToIdr = safeRates.usdToIdr || 18025;
  const sarToIdr = safeRates.sarToIdr || 4800;
  const usdToSar = safeRates.usdToSar || 3.75;

  const isRp = (c: string) => c === 'RP' || c === 'IDR';

  if (f === 'USD' && t === 'SAR') return parseFloat((price * usdToSar).toFixed(2));
  if (f === 'USD' && isRp(t)) return parseFloat((price * usdToIdr).toFixed(2));

  if (f === 'SAR' && t === 'USD') return parseFloat((price / usdToSar).toFixed(2));
  if (f === 'SAR' && isRp(t)) return parseFloat((price * sarToIdr).toFixed(2));

  if (isRp(f) && t === 'USD') return parseFloat((price / usdToIdr).toFixed(2));
  if (isRp(f) && t === 'SAR') return parseFloat((price / sarToIdr).toFixed(2));

  return price;
};

export const splitAddress = (fullAddress?: string): { address: string; cityCountry: string } => {
  if (!fullAddress) {
    return { address: 'N/A', cityCountry: 'N/A' };
  }
  const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { address: 'N/A', cityCountry: 'N/A' };
  }
  if (parts.length === 1) {
    return { address: parts[0], cityCountry: 'N/A' };
  }
  if (parts.length === 2) {
    return { address: parts[0], cityCountry: parts[1] };
  }
  if (parts.length === 3) {
    return { address: parts[0], cityCountry: `${parts[1]}, ${parts[2]}` };
  }
  
  const cityCountryParts = parts.slice(-3);
  const addressParts = parts.slice(0, -3);
  return {
    address: addressParts.join(', '),
    cityCountry: cityCountryParts.join(', ')
  };
};

export const getInvoiceDetails = (invoice: Invoice): InvoiceDetail => {
  const safeInvoice = (invoice || {}) as Invoice;
  const items = safeInvoice.items || [];
  const currency = safeInvoice.currency || 'USD';
  const formattedItems = items.map(item => ({
    description: item?.description || '',
    qty: item?.qty || 0,
    price: formatPrice(item?.price || 0, currency),
    total: formatPrice((item?.qty || 0) * (item?.price || 0), currency),
  }));

  const calculatedSubtotal = items.reduce((acc, item) => acc + ((item?.qty || 0) * (item?.price || 0)), 0);
  const subtotalFormatted = formatPrice(calculatedSubtotal, currency);

  const savedCompStr = localStorage.getItem('finance_companies');
  let localStorageComp = null;
  if (savedCompStr && safeInvoice.company) {
    try {
      const comps = JSON.parse(savedCompStr);
      localStorageComp = comps.find((c: any) => c.name.toLowerCase() === safeInvoice.company.toLowerCase() || c.code.toLowerCase() === safeInvoice.companyCode.toLowerCase());
    } catch (e) { }
  }

  const savedTeamStr = localStorage.getItem('finance_team_members');
  let localStorageCreator = null;
  if (savedTeamStr && safeInvoice.createdBy) {
    try {
      const members = JSON.parse(savedTeamStr);
      const cleanName = (name?: string) => (name || '').toLowerCase().replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
      localStorageCreator = members.find((m: any) => cleanName(m.name) === cleanName(safeInvoice.createdBy));
    } catch (e) { }
  }

  const companySettings = getLocalCompanySettings();

  const cleanAgentName = (agentName?: string) => {
    if (!agentName) return undefined;
    const lower = agentName.toLowerCase();
    if (lower.includes('hasoob')) return 'Hasoob Technology';
    if (lower.includes('odst')) return 'ODST Travel & Tourizm';
    return agentName;
  };

  const fallbackAddress = safeInvoice.custom_address ? splitAddress(safeInvoice.custom_address) : { address: 'N/A', cityCountry: 'N/A' };
  const billToSplit = localStorageComp ? splitAddress(localStorageComp.address) : fallbackAddress;
  const billTo = localStorageComp ? {
    company: localStorageComp.name,
    tax: localStorageComp.taxNumber,
    address: billToSplit.address,
    cityCountry: billToSplit.cityCountry,
    agent: cleanAgentName(safeInvoice.agent || localStorageComp.agent),
  } : {
    company: safeInvoice.custom_company_name || safeInvoice.company || 'N/A',
    tax: safeInvoice.custom_tax_number || 'N/A',
    address: billToSplit.address,
    cityCountry: billToSplit.cityCountry,
    agent: cleanAgentName(safeInvoice.custom_agent || safeInvoice.agent),
  };

  return {
    dueDate: (() => {
      if (safeInvoice.dueDate) {
        if (safeInvoice.dueDate.includes('-')) {
          const parts = safeInvoice.dueDate.split('-');
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
        }
        return safeInvoice.dueDate;
      }
      return 'N/A';
    })(),
    billFrom: localStorageCreator ? {
      name: localStorageCreator.name,
      id: localStorageCreator.employeeId || '260111',
      entity: companySettings.companyName || 'ODST Group',
      phone: companySettings.phone,
      email: localStorageCreator.email || 'info@odst.id',
      tax: companySettings.taxNumber,
    } : {
      name: safeInvoice.createdBy || 'Emad Moustafa',
      id: '260111',
      entity: companySettings.companyName || 'ODST Group',
      phone: companySettings.phone,
      email: 'info@odst.id',
      tax: companySettings.taxNumber,
    },
    billTo,
    items: formattedItems,
    subtotal: subtotalFormatted,
    subtotalAmount: calculatedSubtotal,
    deposit: formatPrice((() => {
      const rawAdv = safeInvoice.advancePayment ?? (safeInvoice as any).advance_payment ?? (safeInvoice as any).deposit ?? 0;
      return typeof rawAdv === 'number' ? rawAdv : (parseFloat(String(rawAdv).replace(/[^0-9.-]/g, '')) || 0);
    })(), currency),
    depositAmount: (() => {
      const rawAdv = safeInvoice.advancePayment ?? (safeInvoice as any).advance_payment ?? (safeInvoice as any).deposit ?? 0;
      return typeof rawAdv === 'number' ? rawAdv : (parseFloat(String(rawAdv).replace(/[^0-9.-]/g, '')) || 0);
    })(),
    hasDeposit: (() => {
      const rawAdv = safeInvoice.advancePayment ?? (safeInvoice as any).advance_payment ?? (safeInvoice as any).deposit ?? 0;
      const num = typeof rawAdv === 'number' ? rawAdv : (parseFloat(String(rawAdv).replace(/[^0-9.-]/g, '')) || 0);
      return num > 0;
    })(),
    tax: formatPrice(calculatedSubtotal * ((safeInvoice.taxRate || 0) / 100), currency),
    total: formatPrice(Math.max(0, (calculatedSubtotal - (() => {
      const rawAdv = safeInvoice.advancePayment ?? (safeInvoice as any).advance_payment ?? (safeInvoice as any).deposit ?? 0;
      return typeof rawAdv === 'number' ? rawAdv : (parseFloat(String(rawAdv).replace(/[^0-9.-]/g, '')) || 0);
    })()) + (calculatedSubtotal * ((safeInvoice.taxRate || 0) / 100))), currency),
    totalAmount: Math.max(0, (calculatedSubtotal - (() => {
      const rawAdv = safeInvoice.advancePayment ?? (safeInvoice as any).advance_payment ?? (safeInvoice as any).deposit ?? 0;
      return typeof rawAdv === 'number' ? rawAdv : (parseFloat(String(rawAdv).replace(/[^0-9.-]/g, '')) || 0);
    })()) + (calculatedSubtotal * ((safeInvoice.taxRate || 0) / 100))),
    usdToIdrRate: safeInvoice.usdToIdrRate || 18025,
    sarToIdrRate: safeInvoice.sarToIdrRate || 4800,
    taxRate: safeInvoice.taxRate || 0,
    currency,
    group_number: safeInvoice.group_number || (safeInvoice as any).groupNumber || null,
    groupNumber: safeInvoice.group_number || (safeInvoice as any).groupNumber || null,
    nationality: safeInvoice.nationality || null
  };
};

export const parseExchangeRate = (val: any, isIdr: boolean = true): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined') return 0;

  str = str.replace(/[^0-9.,-]/g, '').trim();
  if (!str) return 0;

  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts[parts.length - 1].length === 3 && isIdr) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3 && isIdr) {
      str = str.replace(/\./g, '');
    }
  }

  return parseFloat(str) || 0;
};

export const calculateConvertedTotals = (
  amount: number,
  currency: string,
  usdToIdr: number,
  sarToIdr: number,
  usdToSar?: number
) => {
  const normCurr = (currency || 'USD').toUpperCase();
  const isRp = normCurr === 'RP' || normCurr === 'IDR';

  const parsedAmount = typeof amount === 'number' ? amount : (parseFloat(String(amount || '')) || 0);
  if (!parsedAmount || isNaN(parsedAmount)) {
    return { usdVal: 0, sarVal: 0, idrVal: 0, usdTotal: '0', sarTotal: '0', idrTotal: '0' };
  }
  const parsedUsdToIdr = typeof usdToIdr === 'number' ? usdToIdr : (parseFloat(String(usdToIdr || '')) || 18025);
  const parsedSarToIdr = typeof sarToIdr === 'number' ? sarToIdr : (parseFloat(String(sarToIdr || '')) || 4800);
  const parsedUsdToSar = typeof usdToSar === 'number' ? usdToSar : (parseFloat(String(usdToSar || '')) || (parsedUsdToIdr / parsedSarToIdr) || 3.75);

  let usdVal = 0;
  let sarVal = 0;
  let idrVal = 0;

  if (normCurr === 'USD') {
    usdVal = parsedAmount;
    idrVal = parsedAmount * parsedUsdToIdr;
    sarVal = parsedAmount * parsedUsdToSar;
  } else if (normCurr === 'SAR') {
    sarVal = parsedAmount;
    usdVal = parsedAmount / parsedUsdToSar;
    idrVal = parsedAmount * parsedSarToIdr;
  } else if (isRp) {
    idrVal = parsedAmount;
    usdVal = parsedAmount / parsedUsdToIdr;
    sarVal = parsedAmount / parsedSarToIdr;
  }

  return {
    usdVal,
    sarVal,
    idrVal,
    idrTotal: `Rp ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(idrVal)}`,
    sarTotal: `SAR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sarVal)}`,
    usdTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdVal)
  };
};

export const getExchangeRatesToShow = (
  currency: string,
  usdToIdr?: any,
  sarToIdr?: any,
  usdToSar?: any
) => {
  const normCurr = (currency || 'USD').toUpperCase();
  const isRp = normCurr === 'RP' || normCurr === 'IDR';

  const parsedUsdToIdr = typeof usdToIdr === 'number' ? usdToIdr : (parseFloat(String(usdToIdr || '')) || 18025);
  const parsedSarToIdr = typeof sarToIdr === 'number' ? sarToIdr : (parseFloat(String(sarToIdr || '')) || 4800);
  const parsedUsdToSar = typeof usdToSar === 'number' ? usdToSar : (parseFloat(String(usdToSar || '')) || (parsedUsdToIdr / parsedSarToIdr) || 3.75);

  const formatRate = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  };

  if (normCurr === 'SAR') {
    return [
      { text: `1 USD = ${formatRate(parsedUsdToSar)} SAR`, label: 'USD / SAR' },
      { text: `1 SAR = ${formatRate(parsedSarToIdr)} IDR`, label: 'SAR / IDR' }
    ];
  } else if (isRp) {
    return [
      { text: `1 USD = ${formatRate(parsedUsdToIdr)} IDR`, label: 'USD / IDR' },
      { text: `1 SAR = ${formatRate(parsedSarToIdr)} IDR`, label: 'SAR / IDR' }
    ];
  } else {
    return [
      { text: `1 USD = ${formatRate(parsedUsdToIdr)} IDR`, label: 'USD / IDR' },
      { text: `1 USD = ${formatRate(parsedUsdToSar)} SAR`, label: 'USD / SAR' }
    ];
  }
};

export const convertToISODate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

export const compareDates = (dateAStr: string, dateBStr: string): boolean => {
  if (!dateAStr || !dateBStr) return false;

  const parseYMD = (str: string) => {
    const matchYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchYMD) {
      return {
        year: parseInt(matchYMD[1], 10),
        month: parseInt(matchYMD[2], 10) - 1,
        day: parseInt(matchYMD[3], 10)
      };
    }

    const d = new Date(str);
    if (isNaN(d.getTime())) return null;

    if (str.includes('-') && !str.includes('T') && !str.includes(' ')) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        day: d.getUTCDate()
      };
    }
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  };

  const a = parseYMD(dateAStr);
  const b = parseYMD(dateBStr);

  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
};
