import { db } from '@/database/db';
import { transactions, categories } from '@/database/schema';
import { eq, and, or, like, gte, lte, desc, sql } from 'drizzle-orm';
import type { Transaction, Category, TransactionType } from '@/types';

export interface SearchFilters {
  query?: string; // Text search query
  type?: TransactionType | 'all';
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  hasReceipt?: boolean;
  isTaxDeductible?: boolean;
}

export interface SearchResult {
  transactions: Array<Transaction & { category: Category | null }>;
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
}

export interface SearchSuggestion {
  type: 'category' | 'merchant' | 'amount';
  value: string;
  count: number;
}

export async function searchTransactions(
  filters: SearchFilters,
  limit: number = 100,
  offset: number = 0
): Promise<SearchResult> {
  const conditions = [];
  
  if (filters.query && filters.query.trim()) {
    const searchTerm = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        like(transactions.description, searchTerm),
        like(categories.name, searchTerm),
        like(categories.nameTh, searchTerm)
      )
    );
  }
  
  if (filters.type && filters.type !== 'all') {
    conditions.push(eq(transactions.type, filters.type));
  }
  
  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  
  if (filters.startDate) {
    conditions.push(gte(transactions.transactionDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(transactions.transactionDate, filters.endDate));
  }
  
  if (filters.minAmount !== undefined) {
    conditions.push(gte(transactions.amount, filters.minAmount));
  }
  if (filters.maxAmount !== undefined) {
    conditions.push(lte(transactions.amount, filters.maxAmount));
  }
  
  if (filters.hasReceipt !== undefined) {
    if (filters.hasReceipt) {
      conditions.push(sql`${transactions.receiptImageUri} IS NOT NULL`);
    } else {
      conditions.push(sql`${transactions.receiptImageUri} IS NULL`);
    }
  }
  
  if (filters.isTaxDeductible !== undefined) {
    conditions.push(eq(transactions.isTaxDeductible, filters.isTaxDeductible));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause);
  
  const totalCount = countResult[0]?.count || 0;
  
  const results = await db.query.transactions.findMany({
    where: whereClause,
    with: {
      category: true,
    },
    orderBy: [desc(transactions.transactionDate)],
    limit,
    offset,
  });
  
  const totalIncome = results
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = results
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return {
    transactions: results,
    totalCount,
    totalIncome,
    totalExpense,
  };
}

export async function quickSearch(
  query: string,
  limit: number = 20
): Promise<Array<Transaction & { category: Category | null }>> {
  if (!query.trim()) {
    return [];
  }
  
  const searchTerm = `%${query.trim()}%`;
  
  return db.query.transactions.findMany({
    where: or(
      like(transactions.description, searchTerm),
      like(categories.name, searchTerm),
      like(categories.nameTh, searchTerm)
    ),
    with: {
      category: true,
    },
    orderBy: [desc(transactions.transactionDate)],
    limit,
  });
}

export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<SearchSuggestion[]> {
  if (!query.trim() || query.length < 2) {
    return [];
  }
  
  const searchTerm = `%${query}%`;
  const suggestions: SearchSuggestion[] = [];
  
  const categoryResults = await db
    .select({
      name: categories.name,
      nameTh: categories.nameTh,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(or(
      like(categories.name, searchTerm),
      like(categories.nameTh, searchTerm)
    ))
    .groupBy(categories.id)
    .limit(limit);
  
  categoryResults.forEach(cat => {
    suggestions.push({
      type: 'category',
      value: cat.nameTh || cat.name,
      count: cat.count,
    });
  });
  
  const descResults = await db
    .select({
      description: transactions.description,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(
      like(transactions.description, searchTerm),
      sql`${transactions.description} IS NOT NULL`
    ))
    .groupBy(transactions.description)
    .limit(limit);
  
  descResults.forEach(desc => {
    if (desc.description) {
      suggestions.push({
        type: 'merchant',
        value: desc.description,
        count: desc.count,
      });
    }
  });
  
  return suggestions.slice(0, limit);
}

export async function getRecentSearches(): Promise<string[]> {
  // Implementation would use AsyncStorage
  // For now, return empty array
  return [];
}

export async function saveRecentSearch(query: string): Promise<void> {
  // Implementation would use AsyncStorage
  // Keep last 10 searches
}

export async function clearRecentSearches(): Promise<void> {
  // Implementation would use AsyncStorage
}

export async function findMissingReceipts(
  startDate: Date,
  endDate: Date,
  minAmount: number = 1000
): Promise<Array<Transaction & { category: Category | null }>> {
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.type, 'expense'),
      gte(transactions.amount, minAmount),
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      sql`${transactions.receiptImageUri} IS NULL`
    ),
    with: {
      category: true,
    },
    orderBy: [desc(transactions.amount)],
  });
}

export async function findTaxDeductibleTransactions(
  startDate: Date,
  endDate: Date
): Promise<Array<Transaction & { category: Category | null }>> {
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.type, 'expense'),
      eq(transactions.isTaxDeductible, true),
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate)
    ),
    with: {
      category: true,
    },
    orderBy: [desc(transactions.amount)],
  });
}

export function getFilterSummary(filters: SearchFilters): string {
  const parts: string[] = [];
  
  if (filters.query) {
    parts.push(`"${filters.query}"`);
  }
  
  if (filters.type && filters.type !== 'all') {
    parts.push(filters.type === 'income' ? 'Income' : 'Expense');
  }
  
  if (filters.startDate && filters.endDate) {
    parts.push(`${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`);
  }
  
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const min = filters.minAmount !== undefined ? `฿${filters.minAmount}` : '฿0';
    const max = filters.maxAmount !== undefined ? `฿${filters.maxAmount}` : '∞';
    parts.push(`${min} - ${max}`);
  }
  
  if (filters.hasReceipt !== undefined) {
    parts.push(filters.hasReceipt ? 'With receipt' : 'Without receipt');
  }
  
  return parts.join(' • ') || 'All transactions';
}

export default {
  searchTransactions,
  quickSearch,
  getSearchSuggestions,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  findMissingReceipts,
  findTaxDeductibleTransactions,
  getFilterSummary,
};
