import { GoogleGenAI, Type, FunctionDeclaration, FunctionCallingConfigMode } from '@google/genai';
import { GEMINI_MODELS, getGeminiClient, isGeminiAvailable } from './gemini.client';
import type { 
  ChatMessage, 
  ChatSession, 
  TaxAssistantResponse,
  QueryTransactionsParams,
  CalculateTaxParams,
  GetInsightsParams
} from '@/types/ai';
import { generateUUIDSync } from '@/utils/uuid';
import * as TransactionRepo from '@/database/repositories/transaction.repo';
import * as CategoryRepo from '@/database/repositories/category.repo';
import { calculateTax } from '@/services/tax/calculator';
import { Section40Type } from '@/types';
import { getLocale } from '@/i18n';

function getSystemPrompt(): string {
  const locale = getLocale();
  const languageMap: Record<string, string> = {
    en: 'English',
    th: 'Thai',
  };
  const language = languageMap[locale] || 'English';
  
  return `You are Taxify AI, a helpful Thai personal income tax assistant. You help users understand Thai tax laws, calculate taxes, and optimize their tax situation.

Key capabilities:
1. Answer questions about Thai Revenue Code Section 40 income types
2. Explain tax deductions and allowances (personal, spouse, children, parents, insurance, investments)
3. Calculate estimated taxes based on user data
4. Provide tax optimization suggestions
5. Explain withholding tax (50 Tawi) requirements

Thai Tax Facts (2024):
- Personal allowance: 60,000 THB
- Tax brackets: 0-150K (0%), 150K-300K (5%), 300K-500K (10%), 500K-750K (15%), 750K-1M (20%), 1M-2M (25%), 2M-5M (30%), 5M+ (35%)
- Section 40 types: 1=Salary, 2=Services, 3=Intellectual property, 4=Interest/Dividends, 5=Rental, 6=Professional, 7=Contract work, 8=Business
- Donation deduction: up to 10% of income after allowances
- Insurance limits: Life 100K, Health 25K, Pension 200K, RMF 30% of income (max 500K), SSF 30% of income (max 200K)

Always be concise, accurate, and helpful. If unsure about specific tax laws, acknowledge the uncertainty and suggest consulting a tax professional or the Revenue Department.

IMPORTANT: Respond in ${language} language only.`;
}

const QUERY_TRANSACTIONS_FUNCTION: FunctionDeclaration = {
  name: 'queryTransactions',
  description: 'Query user\'s transactions with filters for date range, category, type, or amount range.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      startDate: {
        type: Type.STRING,
        description: 'Start date in YYYY-MM-DD format. Optional.',
      },
      endDate: {
        type: Type.STRING,
        description: 'End date in YYYY-MM-DD format. Optional.',
      },
      categoryId: {
        type: Type.STRING,
        description: 'Filter by specific category ID. Optional.',
      },
      type: {
        type: Type.STRING,
        enum: ['income', 'expense'],
        description: 'Filter by transaction type. Optional.',
      },
      minAmount: {
        type: Type.NUMBER,
        description: 'Minimum amount filter. Optional.',
      },
      maxAmount: {
        type: Type.NUMBER,
        description: 'Maximum amount filter. Optional.',
      },
    },
  },
};

const GET_INCOME_SUMMARY_FUNCTION: FunctionDeclaration = {
  name: 'getIncomeSummary',
  description: 'Get income summary grouped by Section 40 type for a specific tax year.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      taxYear: {
        type: Type.INTEGER,
        description: 'Tax year (e.g., 2024)',
      },
    },
    required: ['taxYear'],
  },
};

const GET_MONTHLY_SUMMARY_FUNCTION: FunctionDeclaration = {
  name: 'getMonthlySummary',
  description: 'Get monthly income and expense summary for a year.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      year: {
        type: Type.INTEGER,
        description: 'Year (e.g., 2024)',
      },
    },
    required: ['year'],
  },
};

const CALCULATE_TAX_FUNCTION: FunctionDeclaration = {
  name: 'calculateTaxEstimate',
  description: 'Calculate estimated tax for a given tax year based on current data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      taxYear: {
        type: Type.INTEGER,
        description: 'Tax year to calculate (e.g., 2024)',
      },
    },
    required: ['taxYear'],
  },
};

const GET_CATEGORIES_FUNCTION: FunctionDeclaration = {
  name: 'getCategories',
  description: 'Get list of all transaction categories.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const AVAILABLE_FUNCTIONS: FunctionDeclaration[] = [
  QUERY_TRANSACTIONS_FUNCTION,
  GET_INCOME_SUMMARY_FUNCTION,
  GET_MONTHLY_SUMMARY_FUNCTION,
  CALCULATE_TAX_FUNCTION,
  GET_CATEGORIES_FUNCTION,
];

const activeSessions = new Map<string, ChatSession>();

export function createChatSession(title: string = 'New Chat'): ChatSession {
  const session: ChatSession = {
    id: generateUUIDSync(),
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  activeSessions.set(session.id, session);
  return session;
}

export function getChatSession(sessionId: string): ChatSession | undefined {
  return activeSessions.get(sessionId);
}

export function deleteChatSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

export function getAllSessions(): ChatSession[] {
  return Array.from(activeSessions.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export async function sendMessage(
  sessionId: string,
  message: string
): Promise<TaxAssistantResponse> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return {
      message: 'Chat session not found. Please start a new chat.',
      confidence: 0,
    };
  }

  if (!isGeminiAvailable()) {
    return {
      message: 'AI service is not available. Please check your API key configuration.',
      confidence: 0,
    };
  }

  try {
    // Add user message
    const userMessage: ChatMessage = {
      id: generateUUIDSync(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);
    session.updatedAt = new Date();

    // Build conversation history
    const history = buildConversationHistory(session);
    const systemPrompt = getSystemPrompt();
    
    // Call Gemini with function calling
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: `${systemPrompt}\n\n${history}\n\nUser: ${message}`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        tools: [{ functionDeclarations: AVAILABLE_FUNCTIONS }],
      },
    });

    // Handle function calls
    let finalResponse = response.text || '';
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionResults = await executeFunctionCalls(response.functionCalls.map(fc => ({
        name: fc.name || '',
        args: fc.args,
      })));
      
      // Send function results back to AI
      const followUpPrompt = `${systemPrompt}\n\n${history}\n\nUser: ${message}\n\nFunction results:\n${JSON.stringify(functionResults, null, 2)}\n\nPlease provide a natural response based on these results.`;
      
      const followUpResponse = await client.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: followUpPrompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });
      
      finalResponse = followUpResponse.text || '';
      
      // Add function call info to user message
      userMessage.functionCalls = response.functionCalls.map(fc => ({
        name: fc.name || '',
        args: fc.args as Record<string, unknown>,
        result: functionResults.find(r => r.name === fc.name)?.result,
      })).filter(fc => fc.name !== '');
    }

    // Add AI response
    const aiMessage: ChatMessage = {
      id: generateUUIDSync(),
      role: 'model',
      content: finalResponse,
      timestamp: new Date(),
    };
    session.messages.push(aiMessage);
    session.updatedAt = new Date();

    return {
      message: finalResponse,
      confidence: 0.9,
      suggestedActions: extractSuggestedActions(finalResponse),
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      message: 'Sorry, I encountered an error. Please try again.',
      confidence: 0,
      isError: true,
    };
  }
}

function buildConversationHistory(session: ChatSession): string {
  // Get last 10 messages for context
  const recentMessages = session.messages.slice(-10);
  
  return recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

async function executeFunctionCalls(
  functionCalls: Array<{ name: string; args: unknown }>
): Promise<Array<{ name: string; result: unknown }>> {
  const results: Array<{ name: string; result: unknown }> = [];
  
  for (const call of functionCalls) {
    try {
      const result = await executeFunction(call.name, call.args as Record<string, unknown>);
      results.push({ name: call.name, result });
    } catch (error) {
      results.push({
        name: call.name,
        result: { error: error instanceof Error ? error.message : 'Execution failed' },
      });
    }
  }
  
  return results;
}

async function executeFunction(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'queryTransactions': {
      const params = args as QueryTransactionsParams;
      const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = params.endDate ? new Date(params.endDate) : new Date();
      
      const transactions = await TransactionRepo.getTransactionsByDateRange(
        startDate,
        endDate,
        params.type
      );
      
      let filtered = transactions;
      
      if (params.categoryId) {
        filtered = filtered.filter(t => t.categoryId === params.categoryId);
      }
      
      if (params.minAmount !== undefined) {
        filtered = filtered.filter(t => t.amount >= (params.minAmount || 0));
      }
      
      if (params.maxAmount !== undefined) {
        filtered = filtered.filter(t => t.amount <= (params.maxAmount || Infinity));
      }
      
      return {
        count: filtered.length,
        totalAmount: filtered.reduce((sum, t) => sum + t.amount, 0),
        transactions: filtered.slice(0, 50).map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.transactionDate.toISOString(),
          categoryId: t.categoryId,
        })),
      };
    }
    
    case 'getIncomeSummary': {
      const { taxYear } = args as { taxYear: number };
      const incomeByType = await TransactionRepo.getIncomeBySection40Type(taxYear);
      
      const section40Names: Record<number, string> = {
        [Section40Type.SALARY]: 'Salary (40(1))',
        [Section40Type.SERVICE]: 'Services (40(2))',
        [Section40Type.INTELLECTUAL]: 'Intellectual Property (40(3))',
        [Section40Type.PASSIVE]: 'Interest/Dividends (40(4))',
        [Section40Type.RENTAL]: 'Rental (40(5))',
        [Section40Type.PROFESSIONAL]: 'Professional (40(6))',
        [Section40Type.CONTRACT]: 'Contract Work (40(7))',
        [Section40Type.BUSINESS]: 'Business (40(8))',
      };
      
      return {
        taxYear,
        totalIncome: Object.values(incomeByType).reduce((sum, val) => sum + val, 0),
        breakdown: Object.entries(incomeByType).map(([type, amount]) => ({
          section40Type: parseInt(type),
          name: section40Names[parseInt(type)] || `Type ${type}`,
          amount,
        })),
      };
    }
    
    case 'getMonthlySummary': {
      const { year } = args as { year: number };
      const summary = await TransactionRepo.getMonthlySummary(year);
      
      return {
        year,
        monthlyData: summary.map(s => ({
          month: s.month + 1,
          income: s.income,
          expense: s.expense,
          balance: s.income - s.expense,
        })),
        yearlyTotal: {
          income: summary.reduce((sum, s) => sum + s.income, 0),
          expense: summary.reduce((sum, s) => sum + s.expense, 0),
        },
      };
    }
    
    case 'calculateTaxEstimate': {
      const { taxYear } = args as { taxYear: number };
      const incomeByType = await TransactionRepo.getIncomeBySection40Type(taxYear);
      
      // Build tax calculation input
      const incomes = Object.entries(incomeByType)
        .filter(([, amount]) => amount > 0)
        .map(([type, amount]) => ({
          section40Type: parseInt(type) as Section40Type,
          amount,
          expenseDeduction: 'standard' as const,
        }));
      
      if (incomes.length === 0) {
        return { error: 'No income data found for the specified year' };
      }
      
      // Default deductions (user should customize these)
      const result = calculateTax({
        taxYear,
        incomes,
        deductions: {
          personalAllowance: 60000,
          spouseAllowance: 0,
          childAllowance: 0,
          parentAllowance: 0,
          disabilityAllowance: 0,
          lifeInsurance: 0,
          healthInsurance: 0,
          pensionInsurance: 0,
          rmf: 0,
          ssf: 0,
          socialSecurity: 0,
          homeLoanInterest: 0,
          donation: 0,
        },
      });
      
      return {
        taxYear,
        totalIncome: result.totalGrossIncome,
        taxableIncome: result.taxableIncome,
        estimatedTax: result.finalTaxDue,
        effectiveTaxRate: result.effectiveTaxRate,
        method: result.taxByAlternativeMethod > result.taxByProgressiveMethod ? 'Alternative' : 'Progressive',
      };
    }
    
    case 'getCategories': {
      const categories = await CategoryRepo.getAllCategories();
      return {
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          nameTh: c.nameTh,
          type: c.type,
          icon: c.icon,
        })),
      };
    }
    
    default:
      return { error: `Unknown function: ${name}` };
  }
}

function extractSuggestedActions(response: string): Array<{ type: 'navigate' | 'show_calculation' | 'explain' | 'suggest_deduction'; label: string }> {
  const actions: Array<{ type: 'navigate' | 'show_calculation' | 'explain' | 'suggest_deduction'; label: string }> = [];
  
  // Check for common patterns and suggest actions
  if (response.toLowerCase().includes('deduction') || response.toLowerCase().includes('allowance')) {
    actions.push({ type: 'navigate', label: 'View Deductions' });
  }
  
  if (response.toLowerCase().includes('transaction') || response.toLowerCase().includes('expense')) {
    actions.push({ type: 'navigate', label: 'View Transactions' });
  }
  
  if (response.toLowerCase().includes('tax') && response.toLowerCase().includes('calculate')) {
    actions.push({ type: 'show_calculation', label: 'View Tax Calculation' });
  }
  
  return actions;
}

export async function generateChatTitle(message: string): Promise<string> {
  try {
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH_LITE,
      contents: `Generate a short title (max 4 words) for a chat that starts with this message: "${message}"\n\nTitle:`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 20,
      },
    });
    
    return response.text?.trim() || 'Tax Discussion';
  } catch {
    return 'Tax Discussion';
  }
}
