import { GoogleGenAI, Type } from '@google/genai';
import { File } from 'expo-file-system';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GeminiReceiptData {
  merchantName: string;
  totalAmount: number;
  taxAmount: number | null;
  date: string; // ISO date string
  time: string | null;
  items: ReceiptItem[];
  category: string; // Suggested category name
  categoryConfidence: number; // 0-1 confidence score
  paymentMethod: string | null;
  receiptNumber: string | null;
  confidence: number; // Overall confidence 0-1
  rawText: string; // Extracted text for reference
}

const RECEIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    merchantName: {
      type: Type.STRING,
      description: 'The name of the store or merchant from the receipt',
    },
    totalAmount: {
      type: Type.NUMBER,
      description: 'The total amount paid in the receipt (numeric value only, no currency symbol)',
    },
    taxAmount: {
      type: Type.NUMBER,
      description: 'Tax/VAT amount if shown on receipt (numeric value only)',
      nullable: true,
    },
    date: {
      type: Type.STRING,
      description: 'The date of the transaction in ISO 8601 format (YYYY-MM-DD)',
    },
    time: {
      type: Type.STRING,
      description: 'The time of the transaction in 24-hour format (HH:MM) if available',
      nullable: true,
    },
    items: {
      type: Type.ARRAY,
      description: 'List of items purchased',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Name of the item/product',
          },
          quantity: {
            type: Type.NUMBER,
            description: 'Quantity purchased (default 1 if not specified)',
          },
          unitPrice: {
            type: Type.NUMBER,
            description: 'Price per unit (numeric value only)',
          },
          totalPrice: {
            type: Type.NUMBER,
            description: 'Total price for this line item (quantity × unitPrice)',
          },
        },
        required: ['name', 'quantity', 'unitPrice', 'totalPrice'],
      },
    },
    category: {
      type: Type.STRING,
      description: 'Suggested expense category based on merchant and items. Choose from: Food & Dining, Transportation, Shopping, Entertainment, Healthcare, Education, Utilities, Groceries, Coffee, Fast Food, Restaurant, Gas, Parking, Electronics, Clothing, Pharmacy, Sports, Travel, Other',
    },
    categoryConfidence: {
      type: Type.NUMBER,
      description: 'Confidence score (0.0 to 1.0) for the category suggestion',
    },
    paymentMethod: {
      type: Type.STRING,
      description: 'Payment method used (e.g., Cash, Credit Card, Debit Card, Mobile Payment)',
      nullable: true,
    },
    receiptNumber: {
      type: Type.STRING,
      description: 'Receipt or invoice number if available',
      nullable: true,
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Overall confidence score (0.0 to 1.0) for the entire extraction',
    },
    rawText: {
      type: Type.STRING,
      description: 'Raw text extracted from the receipt for reference',
    },
  },
  required: [
    'merchantName',
    'totalAmount',
    'date',
    'items',
    'category',
    'categoryConfidence',
    'confidence',
    'rawText',
  ],
};

const AVAILABLE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Utilities',
  'Groceries',
  'Coffee',
  'Fast Food',
  'Restaurant',
  'Gas',
  'Parking',
  'Electronics',
  'Clothing',
  'Pharmacy',
  'Sports',
  'Travel',
  'Other',
];

async function imageUriToBase64(uri: string): Promise<string> {
  // Handle both file:// and content:// URIs
  const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  
  // Use the new File class from expo-file-system
  const file = new File(cleanUri);
  
  // Get base64 content
  const base64 = await file.base64();
  
  return base64;
}

function getMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

export async function parseReceiptWithGemini(
  imageUri: string
): Promise<GeminiReceiptData> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your environment.'
    );
  }

  try {
    // Convert image to base64 using new File API
    const base64Image = await imageUriToBase64(imageUri);
    const mimeType = getMimeType(imageUri);

    // Create the prompt
    const prompt = `Analyze this receipt image and extract all relevant information.

Please identify:
1. Store/Merchant name
2. Total amount paid
3. Tax/VAT amount (if shown)
4. Date of transaction (convert to ISO format)
5. Time (if available)
6. List of all items with quantities and prices
7. Best matching category from: ${AVAILABLE_CATEGORIES.join(', ')}
8. Payment method (if shown)
9. Receipt number (if available)

For Thai receipts:
- Thai dates (Buddhist calendar) should be converted to Gregorian calendar
- Thai numerals should be converted to Arabic numerals
- Common Thai merchants: 7-Eleven, Tesco Lotus, Big C, Family Mart, etc.

Return the data in the structured format provided.`;

    // Call Gemini API with structured output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RECEIPT_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error('No response from Gemini API');
    }

    // Parse the structured response
    const parsedData: GeminiReceiptData = JSON.parse(response.text);

    // Validate and clean the data
    return validateAndCleanData(parsedData);
  } catch (error) {
    console.error('Gemini receipt parsing error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to parse receipt with AI'
    );
  }
}

function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Handle ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Create date in local timezone (month is 0-indexed in JS)
  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Validate the date
  if (isNaN(localDate.getTime())) {
    return new Date();
  }
  
  return localDate;
}

function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateAndCleanData(data: GeminiReceiptData): GeminiReceiptData {
  // Ensure totalAmount is positive
  const totalAmount = Math.abs(data.totalAmount) || 0;

  // Ensure taxAmount is positive or null
  const taxAmount = data.taxAmount ? Math.abs(data.taxAmount) : null;

  // Validate and parse date (handle timezone properly)
  let dateStr = data.date;
  let parsedDate: Date;
  try {
    parsedDate = parseLocalDate(dateStr);
    // Validate it's a reasonable date (not in the future, not too old)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    if (parsedDate > now || parsedDate < oneYearAgo) {
      // Date seems invalid, use today
      parsedDate = new Date();
    }
  } catch {
    parsedDate = new Date();
  }
  
  // Store as ISO string for consistency
  const date = formatDateToISO(parsedDate);

  // Clean items
  const items = (data.items || []).map((item) => ({
    name: item.name?.trim() || 'Unknown Item',
    quantity: Math.abs(item.quantity) || 1,
    unitPrice: Math.abs(item.unitPrice) || 0,
    totalPrice: Math.abs(item.totalPrice) || 0,
  }));

  // Ensure confidence values are between 0 and 1
  const confidence = Math.max(0, Math.min(1, data.confidence || 0));
  const categoryConfidence = Math.max(0, Math.min(1, data.categoryConfidence || 0));

  return {
    merchantName: data.merchantName?.trim() || 'Unknown Merchant',
    totalAmount,
    taxAmount,
    date,
    time: data.time || null,
    items,
    category: data.category || 'Other',
    categoryConfidence,
    paymentMethod: data.paymentMethod || null,
    receiptNumber: data.receiptNumber || null,
    confidence,
    rawText: data.rawText || '',
  };
}

export function mapToAppCategory(
  geminiCategory: string,
  appCategories: { id: string; name: string; nameTh?: string | null }[]
): string | null {
  const normalizedGeminiCategory = geminiCategory.toLowerCase().trim();

  // Try exact match first
  const exactMatch = appCategories.find(
    (cat) =>
      cat.name.toLowerCase() === normalizedGeminiCategory ||
      cat.nameTh?.toLowerCase() === normalizedGeminiCategory
  );
  if (exactMatch) return exactMatch.id;

  // Try partial match
  const partialMatch = appCategories.find((cat) => {
    const catName = cat.name.toLowerCase();
    const catNameTh = cat.nameTh?.toLowerCase() || '';
    return (
      normalizedGeminiCategory.includes(catName) ||
      catName.includes(normalizedGeminiCategory) ||
      normalizedGeminiCategory.includes(catNameTh) ||
      catNameTh.includes(normalizedGeminiCategory)
    );
  });
  if (partialMatch) return partialMatch.id;

  // Category mapping fallback
  const categoryMapping: Record<string, string[]> = {
    'food & dining': ['food', 'dining', 'restaurant', 'meal'],
    'groceries': ['grocery', 'supermarket', 'market', 'fresh'],
    'coffee': ['coffee', 'cafe', 'starbucks', 'amazon'],
    'fast food': ['fast food', 'burger', 'pizza', 'kfc', 'mcdonalds'],
    transportation: ['transport', 'taxi', 'grab', 'bolt', 'train', 'bts', 'mrt'],
    gas: ['gas', 'fuel', 'petrol', 'esso', 'ptt', 'shell'],
    parking: ['parking', 'park'],
    shopping: ['shopping', 'retail', 'mall', 'store'],
    electronics: ['electronics', 'phone', 'computer', 'gadget'],
    clothing: ['clothing', 'clothes', 'fashion', 'apparel'],
    entertainment: ['entertainment', 'movie', 'cinema', 'game', 'ticket'],
    healthcare: ['health', 'medical', 'hospital', 'clinic', 'doctor'],
    pharmacy: ['pharmacy', 'drug', 'medicine', 'boots', 'watsons'],
    education: ['education', 'school', 'book', 'course', 'learning'],
    utilities: ['utility', 'bill', 'electric', 'water', 'internet'],
    sports: ['sport', 'gym', 'fitness', 'exercise'],
    travel: ['travel', 'hotel', 'flight', 'accommodation'],
  };

  for (const [mappedCategory, keywords] of Object.entries(categoryMapping)) {
    if (
      keywords.some(
        (keyword) =>
          normalizedGeminiCategory.includes(keyword) ||
          keyword.includes(normalizedGeminiCategory)
      )
    ) {
      const matchedCategory = appCategories.find(
        (cat) =>
          cat.name.toLowerCase().includes(mappedCategory) ||
          mappedCategory.includes(cat.name.toLowerCase())
      );
      if (matchedCategory) return matchedCategory.id;
    }
  }

  // Return null if no match found (caller should use default)
  return null;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
