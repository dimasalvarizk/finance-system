/**
 * Multi-language number-to-words converter for official financial documents.
 * Supports: English (en), Indonesian (id), and Arabic (ar).
 */

// ==========================================
// 1. ENGLISH TAFQEET / WORDS
// ==========================================
const EN_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const EN_TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const EN_SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertEnLessThanThousand(num: number): string {
  if (num === 0) return '';
  let result = '';
  if (num >= 100) {
    result += EN_ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    result += EN_TENS[Math.floor(num / 10)];
    if (num % 10 > 0) result += '-' + EN_ONES[num % 10];
    result += ' ';
  } else if (num > 0) {
    result += EN_ONES[num] + ' ';
  }
  return result.trim();
}

export function numberToEnglishWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToEnglishWords(Math.abs(num));
  const integerPart = Math.floor(num);
  if (integerPart === 0) return 'Zero';

  let words = '';
  let scaleIndex = 0;
  let remaining = integerPart;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk !== 0) {
      const chunkWords = convertEnLessThanThousand(chunk);
      const scale = EN_SCALES[scaleIndex];
      words = chunkWords + (scale ? ' ' + scale : '') + (words ? ' ' + words : '');
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }
  return words.trim();
}

// ==========================================
// 2. INDONESIAN TAFQEET / TERBILANG
// ==========================================
const ID_ONES = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

export function numberToIndonesianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Nol';
  num = Math.floor(Math.abs(num));

  if (num < 12) {
    return ID_ONES[num];
  } else if (num < 20) {
    return numberToIndonesianWords(num - 10) + ' Belas';
  } else if (num < 100) {
    return numberToIndonesianWords(Math.floor(num / 10)) + ' Puluh' + (num % 10 > 0 ? ' ' + numberToIndonesianWords(num % 10) : '');
  } else if (num < 200) {
    return 'Seratus' + (num - 100 > 0 ? ' ' + numberToIndonesianWords(num - 100) : '');
  } else if (num < 1000) {
    return numberToIndonesianWords(Math.floor(num / 100)) + ' Ratus' + (num % 100 > 0 ? ' ' + numberToIndonesianWords(num % 100) : '');
  } else if (num < 2000) {
    return 'Seribu' + (num - 1000 > 0 ? ' ' + numberToIndonesianWords(num - 1000) : '');
  } else if (num < 1000000) {
    return numberToIndonesianWords(Math.floor(num / 1000)) + ' Ribu' + (num % 1000 > 0 ? ' ' + numberToIndonesianWords(num % 1000) : '');
  } else if (num < 1000000000) {
    return numberToIndonesianWords(Math.floor(num / 1000000)) + ' Juta' + (num % 1000000 > 0 ? ' ' + numberToIndonesianWords(num % 1000000) : '');
  } else if (num < 1000000000000) {
    return numberToIndonesianWords(Math.floor(num / 1000000000)) + ' Miliar' + (num % 1000000000 > 0 ? ' ' + numberToIndonesianWords(num % 1000000000) : '');
  } else {
    return numberToIndonesianWords(Math.floor(num / 1000000000000)) + ' Triliun' + (num % 1000000000000 > 0 ? ' ' + numberToIndonesianWords(num % 1000000000000) : '');
  }
}

// ==========================================
// 3. ARABIC TAFQEET / تفقيط الأرقام
// ==========================================
const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر'];
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const AR_HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertArLessThanThousand(num: number): string {
  if (num === 0) return '';
  let parts: string[] = [];

  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundred > 0) {
    parts.push(AR_HUNDREDS[hundred]);
  }

  if (remainder > 0) {
    if (remainder <= 12) {
      parts.push(AR_ONES[remainder]);
    } else if (remainder < 20) {
      parts.push(AR_ONES[remainder % 10] + ' عشر');
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      if (one > 0) {
        parts.push(AR_ONES[one] + ' و' + AR_TENS[ten]);
      } else {
        parts.push(AR_TENS[ten]);
      }
    }
  }

  return parts.join(' و');
}

export function numberToArabicWords(num: number): string {
  if (isNaN(num) || num === 0) return 'صفر';
  num = Math.floor(Math.abs(num));

  if (num === 0) return 'صفر';

  const thousands = Math.floor((num % 1000000) / 1000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const billions = Math.floor(num / 1000000000);
  const remainder = num % 1000;

  let parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(convertArLessThanThousand(billions) + ' مليارات');
    else parts.push(convertArLessThanThousand(billions) + ' مليار');
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertArLessThanThousand(millions) + ' ملايين');
    else parts.push(convertArLessThanThousand(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertArLessThanThousand(thousands) + ' آلاف');
    else parts.push(convertArLessThanThousand(thousands) + ' ألف');
  }

  if (remainder > 0) {
    parts.push(convertArLessThanThousand(remainder));
  }

  return parts.filter(Boolean).join(' و');
}

// ==========================================
// 4. MAIN CURRENCY AMOUNT CONVERTER (3 LANGUAGES)
// ==========================================
export interface CurrencyNames {
  en: { mainSingular: string; mainPlural: string; subSingular: string; subPlural: string };
  id: { main: string; sub: string };
  ar: { main: string; sub: string };
}

const CURRENCIES: Record<string, CurrencyNames> = {
  SAR: {
    en: { mainSingular: 'Saudi Riyal', mainPlural: 'Saudi Riyals', subSingular: 'Halala', subPlural: 'Halalas' },
    id: { main: 'Riyal Saudi', sub: 'Halala' },
    ar: { main: 'ريال سعودي', sub: 'هللة' }
  },
  USD: {
    en: { mainSingular: 'US Dollar', mainPlural: 'US Dollars', subSingular: 'Cent', subPlural: 'Cents' },
    id: { main: 'Dolar AS', sub: 'Sen' },
    ar: { main: 'دولار أمريكي', sub: 'سنت' }
  },
  IDR: {
    en: { mainSingular: 'Indonesian Rupiah', mainPlural: 'Indonesian Rupiah', subSingular: 'Sen', subPlural: 'Sen' },
    id: { main: 'Rupiah', sub: 'Sen' },
    ar: { main: 'روبية إندونيسية', sub: 'سين' }
  },
  RP: {
    en: { mainSingular: 'Indonesian Rupiah', mainPlural: 'Indonesian Rupiah', subSingular: 'Sen', subPlural: 'Sen' },
    id: { main: 'Rupiah', sub: 'Sen' },
    ar: { main: 'روبية إندونيسية', sub: 'سين' }
  }
};

export function amountToLocalizedWords(amount: number, currencyCode: string = 'SAR', lang: string = 'en'): string {
  const code = (currencyCode || 'SAR').toUpperCase().trim();
  const curr = CURRENCIES[code] || CURRENCIES.SAR;
  const num = Math.abs(parseFloat(String(amount)) || 0);
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const cleanLang = (lang || 'en').toLowerCase().slice(0, 2);

  if (cleanLang === 'ar') {
    const intWords = numberToArabicWords(intPart);
    if (decPart === 0) {
      return `فقط ${intWords} ${curr.ar.main} لا غير`;
    }
    const decWords = numberToArabicWords(decPart);
    return `فقط ${intWords} ${curr.ar.main} و ${decWords} ${curr.ar.sub} لا غير`;
  }

  if (cleanLang === 'id') {
    const intWords = numberToIndonesianWords(intPart);
    if (decPart === 0) {
      return `${intWords} ${curr.id.main} Saja`;
    }
    const decWords = numberToIndonesianWords(decPart);
    return `${intWords} ${curr.id.main} dan ${decWords} ${curr.id.sub} Saja`;
  }

  // Default: English
  const intWords = numberToEnglishWords(intPart);
  const mainUnit = intPart === 1 ? curr.en.mainSingular : curr.en.mainPlural;
  if (decPart === 0) {
    return `${intWords} ${mainUnit} Only`;
  }
  const decWords = numberToEnglishWords(decPart);
  const subUnit = decPart === 1 ? curr.en.subSingular : curr.en.subPlural;
  return `${intWords} ${mainUnit} and ${decWords} ${subUnit} Only`;
}

export default amountToLocalizedWords;
