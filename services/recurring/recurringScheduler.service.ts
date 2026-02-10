import {
  getDueRecurringTransactions,
  updateNextDueDate,
  type RecurringTransactionWithCategory,
  toggleRecurringTransactionActive,
} from '@/database/repositories/recurringTransaction.repo';
import { createTransaction } from '@/database/repositories/transaction.repo';
import type { NewTransaction } from '@/database/schema';

export interface GeneratedTransaction {
  recurringId: string;
  transactionId: string;
  description: string;
  amount: number;
  generatedDate: Date;
}

export interface SchedulerResult {
  generated: GeneratedTransaction[];
  errors: string[];
  skipped: number;
}

export async function processDueRecurringTransactions(
  asOfDate: Date = new Date()
): Promise<SchedulerResult> {
  const result: SchedulerResult = {
    generated: [],
    errors: [],
    skipped: 0,
  };

  try {
    // Get all recurring transactions that are due
    const dueTransactions = await getDueRecurringTransactions(asOfDate);

    for (const recurringTx of dueTransactions) {
      try {
        // Check if we've passed the end date
        if (recurringTx.endDate && asOfDate > recurringTx.endDate) {
          // Deactivate this recurring transaction
          await toggleRecurringTransactionActive(recurringTx.id, false);
          result.skipped++;
          continue;
        }

        // Generate the transaction
        const transactionId = await generateTransactionFromRecurring(recurringTx);

        // Update the next due date
        await updateNextDueDate(recurringTx.id, asOfDate);

        result.generated.push({
          recurringId: recurringTx.id,
          transactionId,
          description: recurringTx.description || recurringTx.category?.name || 'Recurring Transaction',
          amount: recurringTx.amount,
          generatedDate: asOfDate,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to process recurring transaction ${recurringTx.id}: ${errorMessage}`);
        console.error('Error processing recurring transaction:', recurringTx.id, error);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Failed to fetch due transactions: ${errorMessage}`);
    console.error('Error in processDueRecurringTransactions:', error);
  }

  return result;
}

async function generateTransactionFromRecurring(
  recurringTx: RecurringTransactionWithCategory
): Promise<string> {
  const transactionData: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
    amount: recurringTx.amount,
    type: recurringTx.type,
    categoryId: recurringTx.categoryId,
    subCategoryId: recurringTx.subCategoryId,
    description: `${recurringTx.description || 'Recurring'}`,
    transactionDate: new Date(),
    isTaxDeductible: recurringTx.isTaxDeductible,
    deductibleAmount: recurringTx.deductibleAmount,
    section40Type: recurringTx.section40Type,
    receiptImageUri: null,
    ocrRawText: null,
    ocrConfidence: null,
    syncStatus: 'pending',
  };

  return await createTransaction(transactionData);
}

export async function previewUpcomingRecurringTransactions(
  daysAhead: number = 7
): Promise<Array<{
  recurringId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  dueDate: Date;
  categoryName: string | null;
}>> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const dueTransactions = await getDueRecurringTransactions(futureDate);

  return dueTransactions.map((tx) => ({
    recurringId: tx.id,
    description: tx.description || tx.category?.name || 'Recurring Transaction',
    amount: tx.amount,
    type: tx.type,
    dueDate: tx.nextDueDate,
    categoryName: tx.category?.name || null,
  }));
}

export async function manuallyGenerateRecurringTransaction(
  recurringId: string
): Promise<string | null> {
  try {
    const { getRecurringTransactionById } = await import('@/database/repositories/recurringTransaction.repo');
    const recurringTx = await getRecurringTransactionById(recurringId);

    if (!recurringTx || !recurringTx.isActive) {
      throw new Error('Recurring transaction not found or inactive');
    }

    const transactionId = await generateTransactionFromRecurring(recurringTx);
    await updateNextDueDate(recurringId, new Date());

    return transactionId;
  } catch (error) {
    console.error('Error manually generating recurring transaction:', error);
    return null;
  }
}

export async function getRecurringSummary(): Promise<{
  activeCount: number;
  totalMonthlyIncome: number;
  totalMonthlyExpense: number;
  upcomingCount: number;
}> {
  const {
    getRecurringTransactionCount,
    getMonthlyRecurringTotal,
  } = await import('@/database/repositories/recurringTransaction.repo');

  const [activeCount, totalMonthlyIncome, totalMonthlyExpense, upcoming] = await Promise.all([
    getRecurringTransactionCount(),
    getMonthlyRecurringTotal('income'),
    getMonthlyRecurringTotal('expense'),
    previewUpcomingRecurringTransactions(30),
  ]);

  return {
    activeCount,
    totalMonthlyIncome,
    totalMonthlyExpense,
    upcomingCount: upcoming.length,
  };
}
