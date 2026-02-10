const DEFAULT_CURRENCY_SYMBOL = '฿';
const DEFAULT_LOCALE = 'th-TH';

interface FormatCurrencyOptions {
  currencySymbol?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currencySymbol = DEFAULT_CURRENCY_SYMBOL,
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);

  return `${formattedNumber} ${currencySymbol}`;
}

export function formatCurrencyCompact(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  } = options;

  const absAmount = Math.abs(amount);
  
  if (absAmount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ${currencySymbol}`;
  }
  if (absAmount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K ${currencySymbol}`;
  }
  
  return formatCurrency(amount, options);
}

export function formatNumber(
  value: number,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTHS_TH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAYS_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export function formatDate(date: Date | number, format: string = 'dd/MM/yyyy'): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd MMM yyyy':
      return `${day} ${MONTHS_SHORT[d.getMonth()]} ${year}`;
    case 'MMMM yyyy':
      return `${MONTHS[d.getMonth()]} ${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateTime(date: Date | number): string {
  const d = new Date(date);
  return formatDate(d, 'dd/MM/yyyy') + ' ' + formatTime(d);
}

export function formatTime(date: Date | number): string {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatRelativeTime(date: Date | number): string {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  return formatDate(date);
}

export function formatMonthYear(date: Date | number): string {
  return formatDate(date, 'MMMM yyyy');
}

export function formatDateFull(date: Date | number, locale: string = 'en'): string {
  const d = new Date(date);
  const day = d.getDate();
  const year = d.getFullYear();
  
  if (locale === 'th') {
    const month = MONTHS_TH[d.getMonth()];
    return `${day} ${month} ${year}`;
  }
  
  const month = MONTHS[d.getMonth()];
  return `${day} ${month} ${year}`;
}

export function formatPercentage(
  value: number,
  options: { decimals?: number; includeSign?: boolean } = {}
): string {
  const { decimals = 1, includeSign = false } = options;
  
  const formatted = (value * 100).toFixed(decimals);
  const sign = includeSign && value > 0 ? '+' : '';
  
  return `${sign}${formatted}%`;
}

export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/[^\d.-]/g, '')
    .replace(/,/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}
