import { eq, and, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { recurringTransactions, categories, type RecurringTransaction, type NewRecurringTransaction, type Category } from '../schema';
import { generateUUIDSync } from '@/utils/uuid';
import type { TransactionType } from '@/types';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransactionWithCategory extends RecurringTransaction {
  category: Category | null;
}

export async function getAllRecurringTransactions(
  includeInactive: boolean = false
): Promise<RecurringTransactionWithCategory[]> {
  const conditions = includeInactive ? [] : [eq(recurringTransactions.isActive, true)];
  
  const results = await db.query.recurringTransactions.findMany({
    with: {
      category: true,
    },
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(recurringTransactions.createdAt),
  });
  
  return results as unknown as RecurringTransactionWithCategory[];
}

export async function getRecurringTransactionById(id: string): Promise<RecurringTransactionWithCategory | null> {
  const result = await db.query.recurringTransactions.findFirst({
    with: {
      category: true,
    },
    where: eq(recurringTransactions.id, id),
  });
  
  return result as unknown as RecurringTransactionWithCategory | null;
}

export async function getRecurringTransactionsByType(
  type: TransactionType
): Promise<RecurringTransactionWithCategory[]> {
  const results = await db.query.recurringTransactions.findMany({
    with: {
      category: true,
    },
    where: and(
      eq(recurringTransactions.type, type),
      eq(recurringTransactions.isActive, true)
    ),
    orderBy: desc(recurringTransactions.createdAt),
  });
  
  return results as unknown as RecurringTransactionWithCategory[];
}

export async function getDueRecurringTransactions(
  asOfDate: Date = new Date()
): Promise<RecurringTransactionWithCategory[]> {
  const results = await db.query.recurringTransactions.findMany({
    with: {
      category: true,
    },
    where: and(
      eq(recurringTransactions.isActive, true),
      lte(recurringTransactions.nextDueDate, asOfDate)
    ),
    orderBy: recurringTransactions.nextDueDate,
  });
  
  return results as unknown as RecurringTransactionWithCategory[];
}

export async function createRecurringTransaction(
  data: Omit<NewRecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateUUIDSync();
  const now = new Date();
  
  await db.insert(recurringTransactions).values({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  
  return id;
}

export async function updateRecurringTransaction(
  id: string,
  data: Partial<Omit<NewRecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db
    .update(recurringTransactions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(recurringTransactions.id, id));
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
}

export async function toggleRecurringTransactionActive(id: string, isActive: boolean): Promise<void> {
  await db
    .update(recurringTransactions)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(recurringTransactions.id, id));
}

export function calculateNextDueDate(
  currentDate: Date,
  frequency: RecurringFrequency
): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}

/**
 * Update the next due date after generating a transaction
 */
export async function updateNextDueDate(
  id: string,
  lastGeneratedDate: Date
): Promise<void> {
  const recurringTx = await getRecurringTransactionById(id);
  if (!recurringTx) return;
  
  const nextDueDate = calculateNextDueDate(lastGeneratedDate, recurringTx.frequency);
  
  await db
    .update(recurringTransactions)
    .set({
      lastGeneratedDate,
      nextDueDate,
      updatedAt: new Date(),
    })
    .where(eq(recurringTransactions.id, id));
}

export async function getRecurringTransactionCount(
  type?: TransactionType
): Promise<number> {
  const conditions = [eq(recurringTransactions.isActive, true)];
  
  if (type) {
    conditions.push(eq(recurringTransactions.type, type));
  }
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(recurringTransactions)
    .where(and(...conditions));
  
  return result[0]?.count || 0;
}

export async function getMonthlyRecurringTotal(
  type: TransactionType
): Promise<number> {
  const activeRecurring = await getRecurringTransactionsByType(type);
  
  return activeRecurring.reduce((total, tx) => {
    // Calculate monthly equivalent based on frequency
    let monthlyAmount = 0;
    switch (tx.frequency) {
      case 'daily':
        monthlyAmount = tx.amount * 30; // Approximate
        break;
      case 'weekly':
        monthlyAmount = tx.amount * 4.33; // Average weeks per month
        break;
      case 'monthly':
        monthlyAmount = tx.amount;
        break;
      case 'yearly':
        monthlyAmount = tx.amount / 12;
        break;
    }
    return total + monthlyAmount;
  }, 0);
}
