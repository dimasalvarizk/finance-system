/**
 * Converts numeric amounts into formal English words.
 * Standard International financial format.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertLessThanThousand(num) {
  if (num === 0) return '';
  
  let result = '';
  
  if (num >= 100) {
    result += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  if (num >= 20) {
    result += TENS[Math.floor(num / 10)];
    if (num % 10 > 0) {
      result += '-' + ONES[num % 10];
    }
    result += ' ';
  } else if (num > 0) {
    result += ONES[num] + ' ';
  }
  
  return result.trim();
}

export function numberToEnglishWords(num) {
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
      const chunkWords = convertLessThanThousand(chunk);
      const scale = SCALES[scaleIndex];
      words = chunkWords + (scale ? ' ' + scale : '') + (words ? ' ' + words : '');
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  return words.trim();
}

const CURRENCY_CONFIGS = {
  USD: {
    nameSingular: 'United States Dollar',
    namePlural: 'United States Dollars',
    fractionalSingular: 'Cent',
    fractionalPlural: 'Cents'
  },
  SAR: {
    nameSingular: 'Saudi Riyal',
    namePlural: 'Saudi Riyals',
    fractionalSingular: 'Halala',
    fractionalPlural: 'Halalas'
  },
  IDR: {
    nameSingular: 'Indonesian Rupiah',
    namePlural: 'Indonesian Rupiah',
    fractionalSingular: 'Sen',
    fractionalPlural: 'Sen'
  },
  EUR: {
    nameSingular: 'Euro',
    namePlural: 'Euros',
    fractionalSingular: 'Cent',
    fractionalPlural: 'Cents'
  },
  GBP: {
    nameSingular: 'British Pound',
    namePlural: 'British Pounds',
    fractionalSingular: 'Penny',
    fractionalPlural: 'Pence'
  }
};

export function amountToEnglishWords(amount, currencyCode = 'SAR') {
  const code = (currencyCode || 'SAR').toUpperCase().trim();
  const config = CURRENCY_CONFIGS[code] || {
    nameSingular: code,
    namePlural: code,
    fractionalSingular: 'Cent',
    fractionalPlural: 'Cents'
  };

  const num = Math.abs(parseFloat(String(amount)) || 0);
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const integerWords = numberToEnglishWords(integerPart);
  const mainCurrencyUnit = integerPart === 1 ? config.nameSingular : config.namePlural;

  if (decimalPart === 0) {
    return `${integerWords} ${mainCurrencyUnit} Only`;
  }

  const decimalWords = numberToEnglishWords(decimalPart);
  const fractionalUnit = decimalPart === 1 ? config.fractionalSingular : config.fractionalPlural;

  return `${integerWords} ${mainCurrencyUnit} and ${decimalWords} ${fractionalUnit} Only`;
}

export default amountToEnglishWords;
