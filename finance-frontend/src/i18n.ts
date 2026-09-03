import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import id from './locales/id/translation.json';
import ar from './locales/ar/translation.json';

const savedLang = localStorage.getItem('app_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
      ar: { translation: ar }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values safely
    }
  });

// Always enforce LTR layout globally across all languages as mandated by the PRD
document.documentElement.dir = 'ltr';
document.documentElement.lang = savedLang;

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app_language', lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = 'ltr'; // Retain strict LTR orientation
});

/**
 * Returns BCP-47 language tag for internationalization APIs
 */
export const getLocaleTag = (lang?: string): string => {
  const code = lang || i18n.language || 'en';
  if (code.startsWith('id')) return 'id-ID';
  if (code.startsWith('ar')) return 'ar-SA';
  return 'en-US';
};

/**
 * Formats a monetary number into a localized currency string
 * e.g., $1,000.50 (EN) vs Rp 1.000,50 (ID)
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  lang?: string,
  fractionDigits: number = 0
): string => {
  try {
    const validCurrency = (currency || 'USD').toUpperCase();
    // For USD, always use standard '$' symbol without 'US' prefix (e.g. $53.33, $3,073.33)
    if (validCurrency === 'USD' || validCurrency === '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits > 0 ? fractionDigits : 2
      }).format(amount || 0);
    }
    const locale = getLocaleTag(lang);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: validCurrency === 'RP' ? 'IDR' : validCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits > 0 ? fractionDigits : 2
    }).format(amount || 0);
  } catch (err) {
    return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

/**
 * Formats a raw number with localized thousands & decimal separators
 * e.g., 1,000.50 (EN) vs 1.000,50 (ID)
 */
export const formatNumber = (
  value: number,
  lang?: string,
  fractionDigits: number = 0
): string => {
  try {
    const locale = getLocaleTag(lang);
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value || 0);
  } catch (err) {
    return (value || 0).toLocaleString();
  }
};

/**
 * Formats a date according to the active user locale
 */
export const formatLocalizedDate = (
  dateInput: string | Date,
  lang?: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    if (!dateInput) return '-';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const locale = getLocaleTag(lang);
    return new Intl.DateTimeFormat(locale, options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch (err) {
    return String(dateInput);
  }
};

export default i18n;
