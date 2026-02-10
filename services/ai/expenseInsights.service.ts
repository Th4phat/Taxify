import { generateStructuredContent, Type, GEMINI_MODELS } from './gemini.client';
import type { 
  ExpenseInsight, 
  SpendingAnalysis, 
  NaturalLanguageQuery,
  QueryResult,
  InsightType 
} from '@/types/ai';
import * as TransactionRepo from '@/database/repositories/transaction.repo';
import type { TransactionType } from '@/types';

const INSIGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { 
            type: Type.STRING,
            enum: ['spending_trend', 'category_anomaly', 'comparison', 'seasonal_pattern', 'budget_alert', 'saving_opportunity', 'tax_relevance'],
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { 
            type: Type.STRING,
            enum: ['info', 'warning', 'positive'],
          },
          relatedCategoryId: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          percentageChange: { type: Type.NUMBER },
          suggestedAction: { type: Type.STRING },
        },
        required: ['type', 'title', 'description', 'severity'],
      },
    },
  },
  required: ['insights'],
};

const QUERY_RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    chartType: { 
      type: Type.STRING,
      enum: ['bar', 'line', 'pie', 'none'],
    },
    chartData: { type: Type.OBJECT },
    keyFigures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.NUMBER },
          unit: { type: Type.STRING },
        },
      },
    },
  },
  required: ['answer'],
};

export async function generateSpendingInsights(
  startDate: Date,
  endDate: Date
): Promise<ExpenseInsight[]> {
  try {
    // Gather spending data
    const [transactions, categorySpending, dailySpending] = await Promise.all([
      TransactionRepo.getTransactionsByDateRange(startDate, endDate, 'expense'),
      TransactionRepo.getSpendingByCategory(startDate, endDate),
      TransactionRepo.getDailySpending(startDate, endDate),
    ]);

    if (transactions.length === 0) {
      return [];
    }

    // Get comparison data (previous period)
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(endDate.getTime() - periodLength);
    
    const previousTransactions = await TransactionRepo.getTransactionsByDateRange(
      previousStart,
      previousEnd,
      'expense'
    );

    // Build data summary for AI
    const dataSummary = {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totalSpending: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      averageTransactionAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
      topCategories: categorySpending.slice(0, 5).map(c => ({
        name: c.categoryName,
        amount: c.total,
        percentage: 0, // Will be calculated
      })),
      previousPeriod: {
        totalSpending: previousTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: previousTransactions.length,
      },
    };

    // Calculate percentages
    const total = dataSummary.totalSpending;
    dataSummary.topCategories.forEach(c => {
      c.percentage = total > 0 ? Math.round((c.amount / total) * 100) : 0;
    });

    // Calculate change from previous period
    const changePercent = dataSummary.previousPeriod.totalSpending > 0
      ? ((dataSummary.totalSpending - dataSummary.previousPeriod.totalSpending) / dataSummary.previousPeriod.totalSpending) * 100
      : 0;

    const prompt = `You are a financial insights AI. Analyze this spending data and generate 3-5 meaningful insights.

Spending Data Summary:
${JSON.stringify(dataSummary, null, 2)}

Period-over-period change: ${changePercent.toFixed(1)}%

Generate insights that:
1. Identify spending trends (increases/decreases)
2. Highlight category anomalies or unusual patterns
3. Point out potential savings opportunities
4. Note tax-relevant observations (deductible expenses, business expenses)
5. Provide actionable suggestions

Available insight types: spending_trend, category_anomaly, comparison, seasonal_pattern, budget_alert, saving_opportunity, tax_relevance

Severity levels:
- info: neutral observations
- warning: concerning patterns or overspending
- positive: good financial behavior

Respond with ONLY a JSON object matching this exact structure:
{
  "insights": [
    {
      "type": "spending_trend|category_anomaly|comparison|seasonal_pattern|budget_alert|saving_opportunity|tax_relevance",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "info|warning|positive",
      "relatedCategoryId": "optional_category_id",
      "amount": 1234.56,
      "percentageChange": 10.5,
      "suggestedAction": "optional action"
    }
  ]
}`;

    const response = await generateStructuredContent<{ insights: ExpenseInsight[] }>(
      prompt,
      INSIGHT_SCHEMA,
      {
        model: GEMINI_MODELS.FLASH,
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    );

    if (response.error || !response.data) {
      console.warn('[ExpenseInsights] AI generation failed, using fallback:', response.error);
      return generateFallbackInsights(dataSummary, changePercent);
    }

    // Add metadata to insights
    return response.data.insights.map(insight => ({
      ...insight,
      id: generateInsightId(),
      generatedAt: new Date(),
    }));
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return [];
  }
}

function generateFallbackInsights(
  dataSummary: {
    totalSpending: number;
    transactionCount: number;
    averageTransactionAmount: number;
    previousPeriod: { totalSpending: number };
  },
  changePercent: number
): ExpenseInsight[] {
  const insights: ExpenseInsight[] = [];
  
  // Spending trend insight
  if (Math.abs(changePercent) > 10) {
    insights.push({
      id: generateInsightId(),
      type: 'spending_trend',
      title: changePercent > 0 ? 'Spending Increased' : 'Spending Decreased',
      description: `Your spending has ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% compared to the previous period.`,
      severity: changePercent > 20 ? 'warning' : 'info',
      percentageChange: changePercent,
      generatedAt: new Date(),
    });
  }
  
  // Transaction frequency insight
  if (dataSummary.transactionCount > 0) {
    insights.push({
      id: generateInsightId(),
      type: 'spending_trend',
      title: 'Spending Overview',
      description: `You made ${dataSummary.transactionCount} transactions with an average of ${dataSummary.averageTransactionAmount.toFixed(0)} THB per transaction.`,
      severity: 'info',
      amount: dataSummary.totalSpending,
      generatedAt: new Date(),
    });
  }
  
  return insights;
}

export async function processNaturalLanguageQuery(
  query: string,
  startDate?: Date,
  endDate?: Date
): Promise<NaturalLanguageQuery> {
  try {
    // Default to current month if no dates provided
    const now = new Date();
    const queryStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const queryEndDate = endDate || now;

    // Get relevant data based on query
    const transactions = await TransactionRepo.getTransactionsByDateRange(
      queryStartDate,
      queryEndDate
    );

    const summary = await TransactionRepo.getTransactionSummary(queryStartDate, queryEndDate);
    const categorySpending = await TransactionRepo.getSpendingByCategory(queryStartDate, queryEndDate);
    const monthlyData = await TransactionRepo.getMonthlySummary(queryStartDate.getFullYear());

    const dataContext = {
      query,
      period: {
        startDate: queryStartDate.toISOString().split('T')[0],
        endDate: queryEndDate.toISOString().split('T')[0],
      },
      summary: {
        totalIncome: summary.income,
        totalExpense: summary.expense,
        net: summary.income - summary.expense,
      },
      topSpendingCategories: categorySpending.slice(0, 5).map(c => ({
        name: c.categoryName,
        amount: c.total,
      })),
      transactionCount: transactions.length,
      monthlyTrend: monthlyData.map(m => ({
        month: m.month + 1,
        income: m.income,
        expense: m.expense,
      })),
    };

    const prompt = `You are a financial AI assistant. Answer the user's question based on the provided data.

User Question: "${query}"

Available Data:
${JSON.stringify(dataContext, null, 2)}

Instructions:
1. Provide a clear, conversational answer
2. Include specific numbers from the data when relevant
3. Suggest a chart type if visualization would help (bar, line, pie, or none)
4. Include key figures as structured data
5. Be concise but informative

If the question cannot be answered with the available data, explain what data would be needed.

Respond with JSON matching the schema.`;

    const response = await generateStructuredContent<QueryResult>(
      prompt,
      QUERY_RESULT_SCHEMA,
      {
        model: GEMINI_MODELS.FLASH,
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    );

    if (response.error || !response.data) {
      return {
        query,
        result: {
          answer: 'Sorry, I could not process your question. Please try rephrasing it.',
          chartType: 'none',
        },
      };
    }

    return {
      query,
      result: response.data,
    };
  } catch (error) {
    console.error('Query processing error:', error);
    return {
      query,
      result: {
        answer: 'Sorry, an error occurred while processing your question.',
        chartType: 'none',
      },
    };
  }
}

export async function detectUnusualTransactions(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  transactionId: string;
  description: string;
  amount: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}>> {
  try {
    const transactions = await TransactionRepo.getTransactionsByDateRange(
      startDate,
      endDate,
      'expense'
    );

    if (transactions.length < 5) {
      return [];
    }

    // Get average spending for comparison
    const amounts = transactions.map(t => t.amount);
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const max = Math.max(...amounts);
    
    // Simple statistical detection first
    const threshold = avg * 3;
    const candidates = transactions
      .filter(t => t.amount > threshold || t.amount > 10000)
      .slice(0, 10);

    if (candidates.length === 0) {
      return [];
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        unusualTransactions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              transactionId: { type: Type.STRING },
              reason: { type: Type.STRING },
              severity: { 
                type: Type.STRING,
                enum: ['low', 'medium', 'high'],
              },
            },
            required: ['transactionId', 'reason', 'severity'],
          },
        },
      },
      required: ['unusualTransactions'],
    };

    const prompt = `Analyze these transactions and identify which ones are unusual or suspicious.

Context:
- Average transaction: ${avg.toFixed(0)} THB
- Highest transaction: ${max.toFixed(0)} THB
- Total transactions: ${transactions.length}

Transactions to analyze:
${JSON.stringify(candidates.map(t => ({
  id: t.id,
  description: t.description || 'No description',
  amount: t.amount,
  category: t.category?.name || 'Unknown',
})), null, 2)}

Identify transactions that are:
1. Significantly higher than typical spending patterns
2. Unusual for their category
3. Potential duplicates or errors
4. Large one-time expenses

Rate severity: low (slightly unusual), medium (notable), high (very suspicious)

Respond with JSON.`;

    const response = await generateStructuredContent<{
      unusualTransactions: Array<{
        transactionId: string;
        reason: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    }>(prompt, schema, {
      model: GEMINI_MODELS.FLASH_LITE,
      temperature: 0.2,
    });

    if (response.error || !response.data) {
      // Fallback to statistical detection
      return candidates
        .filter(t => t.amount > avg * 4)
        .map(t => ({
          transactionId: t.id,
          description: t.description || 'Unknown',
          amount: t.amount,
          reason: `Amount is ${(t.amount / avg).toFixed(1)}x higher than average spending`,
          severity: t.amount > avg * 5 ? 'high' : 'medium' as 'high' | 'medium',
        }));
    }

    // Merge with transaction details
    return response.data.unusualTransactions
      .map(u => {
        const tx = candidates.find(t => t.id === u.transactionId);
        if (!tx) return null;
        return {
          transactionId: tx.id,
          description: tx.description || 'Unknown',
          amount: tx.amount,
          reason: u.reason,
          severity: u.severity,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return [];
  }
}

export async function compareSpendingPeriods(
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): Promise<{
  comparison: string;
  keyDifferences: Array<{ category: string; change: number; changePercent: number }>;
  analysis: string;
}> {
  try {
    const [period1Data, period2Data] = await Promise.all([
      TransactionRepo.getTransactionSummary(period1Start, period1End),
      TransactionRepo.getTransactionSummary(period2Start, period2End),
    ]);

    const [period1Categories, period2Categories] = await Promise.all([
      TransactionRepo.getSpendingByCategory(period1Start, period1End),
      TransactionRepo.getSpendingByCategory(period2Start, period2End),
    ]);

    const data = {
      period1: {
        label: `${period1Start.toLocaleDateString()} - ${period1End.toLocaleDateString()}`,
        income: period1Data.income,
        expense: period1Data.expense,
      },
      period2: {
        label: `${period2Start.toLocaleDateString()} - ${period2End.toLocaleDateString()}`,
        income: period2Data.income,
        expense: period2Data.expense,
      },
      categoryComparison: period1Categories.map(c1 => {
        const c2 = period2Categories.find(c => c.categoryId === c1.categoryId);
        return {
          category: c1.categoryName,
          period1Amount: c1.total,
          period2Amount: c2?.total || 0,
          change: (c2?.total || 0) - c1.total,
        };
      }),
    };

    const schema = {
      type: Type.OBJECT,
      properties: {
        comparison: { type: Type.STRING },
        keyDifferences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              change: { type: Type.NUMBER },
              changePercent: { type: Type.NUMBER },
            },
          },
        },
        analysis: { type: Type.STRING },
      },
      required: ['comparison', 'keyDifferences', 'analysis'],
    };

    const prompt = `Compare these two spending periods and provide analysis.

Data:
${JSON.stringify(data, null, 2)}

Provide:
1. A brief comparison summary
2. Key differences by category (limit to top 5 changes)
3. Overall analysis and observations

Respond with JSON.`;

    const response = await generateStructuredContent<{
      comparison: string;
      keyDifferences: Array<{ category: string; change: number; changePercent: number }>;
      analysis: string;
    }>(prompt, schema, {
      model: GEMINI_MODELS.FLASH_LITE,
      temperature: 0.3,
    });

    if (response.error || !response.data) {
      // Fallback
      const expenseChange = period2Data.expense - period1Data.expense;
      const changePercent = period1Data.expense > 0 
        ? (expenseChange / period1Data.expense) * 100 
        : 0;
      
      return {
        comparison: `Period 2 spending was ${expenseChange >= 0 ? 'higher' : 'lower'} by ${Math.abs(expenseChange).toFixed(0)} THB (${Math.abs(changePercent).toFixed(1)}%)`,
        keyDifferences: [],
        analysis: 'Basic comparison based on total spending.',
      };
    }

    return response.data;
  } catch (error) {
    console.error('Period comparison error:', error);
    return {
      comparison: 'Unable to generate comparison.',
      keyDifferences: [],
      analysis: 'An error occurred while analyzing the data.',
    };
  }
}

function generateInsightId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
