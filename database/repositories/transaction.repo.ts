import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db';
import { transactions, categories, type Transaction, type NewTransaction, type Category } from '../schema';
import { generateUUIDSync } from '@/utils/uuid';
import type { TransactionType } from '@/types';

export interface TransactionWithCategory extends Transaction {
  category: Category | null;
}

export interface TransactionSummary {
  income: number;
  expense: number;
}

export interface MonthlySummary {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export async function getAllTransactions(
  limit: number = 100,
  offset: number = 0
): Promise<TransactionWithCategory[]> {
  const results = await db.query.transactions.findMany({
    with: {
      category: true,
    },
    orderBy: desc(transactions.transactionDate),
    limit,
    offset,
  });
  
  return results as unknown as TransactionWithCategory[];
}

export async function getTransactionById(id: string): Promise<TransactionWithCategory | null> {
  const result = await db.query.transactions.findFirst({
    with: {
      category: true,
    },
    where: eq(transactions.id, id),
  });
  
  return result as unknown as TransactionWithCategory | null;
}

export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date,
  type?: TransactionType
): Promise<TransactionWithCategory[]> {
  const conditions = [
    gte(transactions.transactionDate, startDate),
    lte(transactions.transactionDate, endDate),
  ];
  
  if (type) {
    conditions.push(eq(transactions.type, type));
  }
  
  const results = await db.query.transactions.findMany({
    with: {
      category: true,
    },
    where: and(...conditions),
    orderBy: desc(transactions.transactionDate),
  });
  
  return results as unknown as TransactionWithCategory[];
}

export async function getTransactionsByType(
  type: TransactionType,
  limit: number = 100
): Promise<TransactionWithCategory[]> {
  const results = await db.query.transactions.findMany({
    with: {
      category: true,
    },
    where: eq(transactions.type, type),
    orderBy: desc(transactions.transactionDate),
    limit,
  });
  
  return results as unknown as TransactionWithCategory[];
}

export async function getTransactionsByCategory(
  categoryId: string,
  limit: number = 100
): Promise<TransactionWithCategory[]> {
  const results = await db.query.transactions.findMany({
    with: {
      category: true,
    },
    where: eq(transactions.categoryId, categoryId),
    orderBy: desc(transactions.transactionDate),
    limit,
  });
  
  return results as unknown as TransactionWithCategory[];
}

export async function getRecentTransactions(
  limit: number = 5
): Promise<TransactionWithCategory[]> {
  const results = await db.query.transactions.findMany({
    with: {
      category: true,
    },
    orderBy: desc(transactions.transactionDate),
    limit,
  });
  
  return results as unknown as TransactionWithCategory[];
}

export async function getTransactionSummary(
  startDate: Date,
  endDate: Date
): Promise<TransactionSummary> {
  const results = await db.query.transactions.findMany({
    where: and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate)
    ),
  });
  
  return results.reduce<TransactionSummary>(
    (acc, transaction) => ({
      income: acc.income + (transaction.type === 'income' ? transaction.amount : 0),
      expense: acc.expense + (transaction.type === 'expense' ? transaction.amount : 0),
    }),
    { income: 0, expense: 0 }
  );
}

export async function getMonthlySummary(year: number): Promise<MonthlySummary[]> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  const results = await db.query.transactions.findMany({
    where: and(
      gte(transactions.transactionDate, startOfYear),
      lte(transactions.transactionDate, endOfYear)
    ),
  });
  
  // Group by month
  const monthlyData: Record<number, { income: number; expense: number }> = {};
  
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { income: 0, expense: 0 };
  }
  
  for (const transaction of results) {
    const month = transaction.transactionDate.getMonth();
    if (transaction.type === 'income') {
      monthlyData[month].income += transaction.amount;
    } else {
      monthlyData[month].expense += transaction.amount;
    }
  }
  
  return Object.entries(monthlyData).map(([month, data]) => ({
    month: parseInt(month),
    year,
    income: data.income,
    expense: data.expense,
  }));
}

export async function getCategorySummary(
  startDate: Date,
  endDate: Date,
  type: TransactionType
): Promise<{ categoryId: string; total: number }[]> {
  const results = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, type),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.categoryId);
  
  return results.map((r) => ({
    categoryId: r.categoryId,
    total: r.total || 0,
  }));
}

export async function createTransaction(
  data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateUUIDSync();
  const now = new Date();
  
  await db.insert(transactions).values({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  
  return id;
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db
    .update(transactions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id));
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function createManyTransactions(
  items: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]> {
  const now = new Date();
  const ids: string[] = [];
  
  const values = items.map((item) => {
    const id = generateUUIDSync();
    ids.push(id);
    return {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };
  });
  
  await db.insert(transactions).values(values);
  
  return ids;
}

export async function deleteAllTransactions(): Promise<void> {
  await db.delete(transactions);
}

export async function getTransactionCount(type?: TransactionType): Promise<number> {
  const conditions = type ? [eq(transactions.type, type)] : [];
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result[0]?.count || 0;
}

export async function getAverageTransactionAmount(type: TransactionType): Promise<number> {
  const result = await db
    .select({ average: sql<number>`AVG(${transactions.amount})` })
    .from(transactions)
    .where(eq(transactions.type, type));
  
  return result[0]?.average || 0;
}

export async function getIncomeBySection40Type(
  year: number
): Promise<Record<number, number>> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  const results = await db
    .select({
      section40Type: transactions.section40Type,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'income'),
        gte(transactions.transactionDate, startOfYear),
        lte(transactions.transactionDate, endOfYear)
      )
    )
    .groupBy(transactions.section40Type);
  
  const incomeByType: Record<number, number> = {};
  
  for (const result of results) {
    if (result.section40Type !== null) {
      incomeByType[result.section40Type] = result.total || 0;
    }
  }
  
  return incomeByType;
}

export async function getDeductibleExpenses(
  year: number
): Promise<number> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  const result = await db
    .select({
      total: sql<number>`SUM(${transactions.deductibleAmount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'expense'),
        eq(transactions.isTaxDeductible, true),
        gte(transactions.transactionDate, startOfYear),
        lte(transactions.transactionDate, endOfYear)
      )
    );
  
  return result[0]?.total || 0;
}

export interface DailySpending {
  date: Date;
  amount: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryNameTh: string | null;
  color: string;
  icon: string;
  total: number;
}

/**
 * Get daily spending for a date range (for heatmap/chart)
 */
export async function getDailySpending(
  startDate: Date,
  endDate: Date
): Promise<DailySpending[]> {
  const results = await db.query.transactions.findMany({
    where: and(
      eq(transactions.type, 'expense'),
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate)
    ),
    orderBy: asc(transactions.transactionDate),
  });
  
  // Group by date
  const dailyMap = new Map<string, number>();
  
  for (const transaction of results) {
    const dateKey = transaction.transactionDate.toISOString().split('T')[0];
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + transaction.amount);
  }
  
  return Array.from(dailyMap.entries())
    .map(([dateStr, amount]) => ({
      date: new Date(dateStr),
      amount,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get spending by category with full category details
 */
export async function getSpendingByCategory(
  startDate: Date,
  endDate: Date
): Promise<CategorySpending[]> {
  const results = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'expense'),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.categoryId);
  
  // Get category details
  const categoryIds = results.map(r => r.categoryId);
  
  if (categoryIds.length === 0) {
    return [];
  }
  
  const categoryDetails = await db.query.categories.findMany({
    where: sql`${categories.id} IN ${categoryIds}`,
  });
  
  const categoryMap = new Map(categoryDetails.map(c => [c.id, c]));
  
  return results
    .map((r) => {
      const cat = categoryMap.get(r.categoryId);
      return {
        categoryId: r.categoryId,
        categoryName: cat?.name || 'Unknown',
        categoryNameTh: cat?.nameTh || null,
        color: cat?.color || '#999999',
        icon: cat?.icon || 'help-circle',
        total: r.total || 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}
