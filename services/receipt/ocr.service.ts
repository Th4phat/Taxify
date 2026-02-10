import MlkitOcr, { type OcrResult, type OcrBlock } from 'rn-mlkit-ocr';

export type { OcrResult, OcrBlock };

export interface ParsedReceipt {
  merchantName: string | null;
  totalAmount: number | null;
  date: Date | null;
  items: ReceiptItem[];
  confidence: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

export async function performOCR(
  imageUri: string, 
  language: 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean' = 'latin'
): Promise<OcrResult> {
  try {
    const result = await MlkitOcr.recognizeText(imageUri, language);
    return result;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image. Please try again.');
  }
}

export async function getAvailableOCRLanguages(): Promise<string[]> {
  try {
    const languages = await MlkitOcr.getAvailableLanguages();
    return languages;
  } catch (error) {
    console.error('Error getting available languages:', error);
    return ['latin']; // Default fallback
  }
}

export function parseReceiptText(ocrResult: OcrResult): ParsedReceipt {
  const lines = ocrResult.text.split('\n');
  
  const merchantName = extractMerchantName(lines);
  
  const totalAmount = extractTotalAmount(lines);
  
  const date = extractDate(lines);
  
  const items = extractItems(lines);
  
  const confidence = calculateParseConfidence({
    merchantName,
    totalAmount,
    date,
    items,
  });
  
  return {
    merchantName,
    totalAmount,
    date,
    items,
    confidence,
  };
}

function extractMerchantName(lines: string[]): string | null {
  // Look for the first non-empty line that's not a common receipt header
  const skipPatterns = [
    /tax invoice/i,
    /ใบเสร็จ/i,
    /receipt/i,
    /vat/i,
    /tel/i,
    /phone/i,
    /www\./i,
    /http/i,
    /tax id/i,
    /taxi/i,
  ];
  
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && 
        trimmed.length < 50 && 
        !skipPatterns.some((p) => p.test(trimmed))) {
      return trimmed;
    }
  }
  
  return null;
}

function extractTotalAmount(lines: string[]): number | null {
  // Common patterns for total in receipts
  const totalPatterns = [
    /total[\s:]*([\d,]+\.?\d*)/i,
    /amount[\s:]*([\d,]+\.?\d*)/i,
    /amount\s+due[\s:]*([\d,]+\.?\d*)/i,
    /grand\s+total[\s:]*([\d,]+\.?\d*)/i,
    /net\s+total[\s:]*([\d,]+\.?\d*)/i,
    /total\s+due[\s:]*([\d,]+\.?\d*)/i,
    /รวม[\s:]*([\d,]+\.?\d*)/i,
    /ยอดรวม[\s:]*([\d,]+\.?\d*)/i,
    /จำนวนเงิน[\s:]*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s*(?:thb|฿|บาท|baht)/i,
  ];
  
  // Search from bottom up (total is usually at the end)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0 && amount < 10000000) {
          return amount;
        }
      }
    }
  }
  
  // Fallback: look for the largest number that could be a total
  let largestAmount = 0;
  for (const line of lines) {
    const numbers = line.match(/([\d,]+\.?\d*)/g);
    if (numbers) {
      for (const num of numbers) {
        const amount = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(amount) && amount > largestAmount && amount < 1000000) {
          largestAmount = amount;
        }
      }
    }
  }
  
  return largestAmount > 0 ? largestAmount : null;
}

function extractDate(lines: string[]): Date | null {
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    // YYYY/MM/DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // Thai date format
    /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})/i,
    // English date format
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
  ];
  
  const thaiMonths: Record<string, number> = {
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
    'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
    'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
  };
  
  const engMonths: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
  };
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        if (pattern.source.includes('ม\.ค\.')) {
          // Thai date
          const day = parseInt(match[1]);
          const month = thaiMonths[match[2].toLowerCase()];
          let year = parseInt(match[3]);
          if (year < 100) year += 2500; // Buddhist to Gregorian
          if (year > 2400) year -= 543;
          return new Date(year, month, day);
        } else if (pattern.source.includes('Jan')) {
          // English date
          const day = parseInt(match[1]);
          const month = engMonths[match[2].toLowerCase().substring(0, 3)];
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          return new Date(year, month, day);
        } else if (match[1].length === 4) {
          // YYYY/MM/DD format
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const day = parseInt(match[3]);
          return new Date(year, month, day);
        } else {
          // DD/MM/YYYY format
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          return new Date(year, month, day);
        }
      }
    }
  }
  
  return null;
}

function extractItems(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  
  // Simple pattern matching for items
  // Format: Item Name Qty x Price Total
  const itemPattern = /^(.+?)\s+(\d+)\s*x?\s*([\d,.]+)\s+([\d,.]+)$/;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      const name = match[1].trim();
      const quantity = parseInt(match[2]);
      const unitPrice = parseFloat(match[3].replace(/,/g, ''));
      const totalPrice = parseFloat(match[4].replace(/,/g, ''));
      
      if (name && !isNaN(totalPrice) && name.length > 2) {
        items.push({
          name,
          quantity: isNaN(quantity) ? 1 : quantity,
          unitPrice: isNaN(unitPrice) ? null : unitPrice,
          totalPrice,
        });
      }
    }
  }
  
  return items;
}

function calculateParseConfidence(parsed: Omit<ParsedReceipt, 'confidence'>): number {
  let score = 0;
  let factors = 0;
  
  if (parsed.merchantName) {
    score += 0.3;
    factors++;
  }
  
  if (parsed.totalAmount && parsed.totalAmount > 0) {
    score += 0.4;
    factors++;
  }
  
  if (parsed.date) {
    score += 0.2;
    factors++;
  }
  
  if (parsed.items.length > 0) {
    score += 0.1;
    factors++;
  }
  
  return factors > 0 ? score : 0;
}

export async function isOCRSupported(): Promise<boolean> {
  try {
    const languages = await getAvailableOCRLanguages();
    return languages.length > 0;
  } catch {
    return false;
  }
}
