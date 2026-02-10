import { 
  generateStructuredContent, 
  Type, 
  GEMINI_MODELS 
} from './gemini.client';
import type { 
  CategorySuggestion, 
  AutoCategorizationResult,
  MerchantPattern 
} from '@/types/ai';
import type { Category, TransactionType } from '@/types';
import * as CategoryRepo from '@/database/repositories/category.repo';
import * as TransactionRepo from '@/database/repositories/transaction.repo';

const CATEGORIZATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    primarySuggestion: {
      type: Type.OBJECT,
      properties: {
        categoryId: { type: Type.STRING },
        categoryName: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        reason: { type: Type.STRING },
      },
      required: ['categoryId', 'categoryName', 'confidence', 'reason'],
    },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          categoryId: { type: Type.STRING },
          categoryName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ['categoryId', 'categoryName', 'confidence', 'reason'],
      },
    },
  },
  required: ['primarySuggestion', 'alternatives'],
};

interface CategorizationInput {
  description: string;
  amount: number;
  type: TransactionType;
  merchantName?: string;
  existingCategories: Category[];
  userHistory?: MerchantPattern[];
}

function buildCategorizationPrompt(input: CategorizationInput): string {
  const { description, amount, type, merchantName, existingCategories, userHistory } = input;
  
  const categoryList = existingCategories
    .filter(c => c.type === type)
    .map(c => `- ${c.name} (ID: ${c.id})`)
    .join('\n');

  const historyContext = userHistory && userHistory.length > 0
    ? `\nUser's historical patterns for similar transactions:\n${userHistory
        .slice(0, 5)
        .map(h => `- ${h.merchantName}: usually categorized as ID ${h.suggestedCategoryId}, avg amount ${h.avgAmount} THB`)
        .join('\n')}`
    : '';

  return `You are a smart expense categorization assistant for a Thai personal finance app.

Task: Suggest the most appropriate category for this transaction.

Transaction Details:
- Description: "${description}"
- Amount: ${amount} THB
- Type: ${type}${merchantName ? `\n- Merchant: ${merchantName}` : ''}
${historyContext}

Available Categories:
${categoryList}

Instructions:
1. Analyze the transaction description and amount to determine the best category
2. Consider Thai context (e.g., "7-Eleven" = convenience store, "PTT" = gas station)
3. Return your suggestion with confidence level (0.0-1.0)
4. Provide 2-3 alternative suggestions with lower confidence
5. Include a brief reason for your primary suggestion

Respond in JSON format matching the schema provided.`;
}

export async function suggestCategory(
  description: string,
  amount: number,
  type: TransactionType,
  merchantName?: string
): Promise<AutoCategorizationResult> {
  try {
    // Fetch available categories
    const categories = (await CategoryRepo.getAllCategories()).map(c => ({
      ...c,
      isSystem: c.isSystem ?? false,
      displayOrder: c.displayOrder ?? 0,
      isActive: c.isActive ?? true,
    }));
    
    // Fetch user's historical patterns for this merchant
    const userHistory = merchantName 
      ? await getMerchantPatterns(merchantName, type)
      : [];

    const input: CategorizationInput = {
      description,
      amount,
      type,
      merchantName,
      existingCategories: categories,
      userHistory,
    };

    const prompt = buildCategorizationPrompt(input);
    
    const response = await generateStructuredContent<{
      primarySuggestion: CategorySuggestion;
      alternatives: CategorySuggestion[];
    }>(prompt, CATEGORIZATION_SCHEMA, {
      model: GEMINI_MODELS.FLASH_LITE,
      temperature: 0.1,
      maxOutputTokens: 1024,
    });

    if (response.error || !response.data) {
      return {
        suggestion: null,
        alternatives: [],
        error: response.error || 'Failed to get suggestions',
      };
    }

    // Validate that suggested category exists
    const validCategories = new Set(categories.map(c => c.id));
    const primary = response.data.primarySuggestion;
    
    if (!validCategories.has(primary.categoryId)) {
      // Try to find a match by name
      const matchByName = categories.find(
        c => c.name.toLowerCase() === primary.categoryName.toLowerCase()
      );
      if (matchByName) {
        primary.categoryId = matchByName.id;
      } else {
        return {
          suggestion: null,
          alternatives: [],
          error: 'AI suggested invalid category',
        };
      }
    }

    // Filter valid alternatives
    const validAlternatives = response.data.alternatives
      .filter(alt => validCategories.has(alt.categoryId))
      .slice(0, 3);

    return {
      suggestion: primary,
      alternatives: validAlternatives,
    };
  } catch (error) {
    console.error('Auto-categorization error:', error);
    return {
      suggestion: null,
      alternatives: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getMerchantPatterns(
  merchantName: string,
  type: TransactionType
): Promise<MerchantPattern[]> {
  try {
    // Get all transactions of this type from the last year
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const transactions = await TransactionRepo.getTransactionsByDateRange(
      startDate,
      endDate,
      type
    );

    // Group by merchant-like patterns in description
    const patterns = new Map<string, { categoryId: string; count: number; totalAmount: number }[]>();
    
    for (const tx of transactions) {
      if (!tx.description) continue;
      
      const desc = tx.description.toLowerCase();
      const merchant = merchantName.toLowerCase();
      
      // Check if description contains merchant name
      if (desc.includes(merchant) || merchant.includes(desc.split(' ')[0])) {
        const key = desc.split(' ')[0];
        const existing = patterns.get(key) || [];
        const catEntry = existing.find(e => e.categoryId === tx.categoryId);
        
        if (catEntry) {
          catEntry.count++;
          catEntry.totalAmount += tx.amount;
        } else {
          existing.push({
            categoryId: tx.categoryId,
            count: 1,
            totalAmount: tx.amount,
          });
        }
        
        patterns.set(key, existing);
      }
    }

    // Convert to MerchantPattern array
    const result: MerchantPattern[] = [];
    for (const [merchantKey, entries] of patterns.entries()) {
      const topEntry = entries.sort((a, b) => b.count - a.count)[0];
      if (topEntry && topEntry.count >= 2) {
        result.push({
          merchantName: merchantKey,
          suggestedCategoryId: topEntry.categoryId,
          frequency: topEntry.count,
          avgAmount: topEntry.totalAmount / topEntry.count,
        });
      }
    }

    return result.sort((a, b) => b.frequency - a.frequency);
  } catch (error) {
    console.error('Error getting merchant patterns:', error);
    return [];
  }
}

export async function batchSuggestCategories(
  items: Array<{
    description: string;
    amount: number;
    type: TransactionType;
    merchantName?: string;
  }>
): Promise<AutoCategorizationResult[]> {
  // Process in parallel with rate limiting
  const results: AutoCategorizationResult[] = [];
  
  for (const item of items) {
    const result = await suggestCategory(
      item.description,
      item.amount,
      item.type,
      item.merchantName
    );
    results.push(result);
    
    // Small delay to avoid rate limiting
    if (items.length > 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export function quickCategorize(description: string, type: TransactionType): string | null {
  const desc = description.toLowerCase();
  
  // Common Thai merchant patterns
  const patterns: Array<{ pattern: RegExp; categoryHint: string }> = [
    { pattern: /7-eleven|7 eleven|seven eleven|เซเว่น/, categoryHint: 'Convenience Store' },
    { pattern: /ptt|esso|shell|bhp|ปตท/, categoryHint: 'Fuel' },
    { pattern: / Tesco | Lotus |โลตัส|เทสโก้/, categoryHint: 'Groceries' },
    { pattern: /grab|foodpanda|lineman|get|แกร็บ|ฟู้ดแพนด้า/, categoryHint: 'Food Delivery' },
    { pattern: /shopee|lazada|amazon|ช้อปปี้|ลาซาด้า/, categoryHint: 'Shopping' },
    { pattern: /netflix|spotify|youtube|disney|hbo|เน็ตฟลิกซ์/, categoryHint: 'Subscriptions' },
    { pattern: /bts|mrt|arl|taxi|grab bike|รถไฟฟ้า|แท็กซี่/, categoryHint: 'Transportation' },
    { pattern: /true|ais|dtac|ทรู|เอไอเอส|ดีแทค/, categoryHint: 'Mobile Phone' },
    { pattern: /airasia|thaiairways|nokair|บินไทย|แอร์เอเชีย/, categoryHint: 'Travel' },
    { pattern: /starbucks|amazon|cafe|coffee|กาแฟ|คาเฟ่/, categoryHint: 'Coffee' },
    { pattern: /mc Donald|kfc|burger|pizza hut|swensen|mk|ฟาสต์ฟู้ด/, categoryHint: 'Dining' },
  ];
  
  for (const { pattern, categoryHint } of patterns) {
    if (pattern.test(desc)) {
      return categoryHint;
    }
  }
  
  return null;
}
