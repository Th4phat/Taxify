import { db } from '@/database/db';
import { budgets, transactions, categories } from '@/database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { Budget, BudgetProgress, NewBudget, Transaction, Category } from '@/types';

export interface BudgetWithCategory extends Budget {
  category: Category | null;
}

export interface CreateBudgetInput {
  name: string;
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  categoryId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  alertAtPercent?: number;
}

export class BudgetService {
  
  static async createBudget(input: CreateBudgetInput): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const periodEnd = input.endDate || this.calculateDefaultEndDate(input.period, input.startDate);
    
    await db.insert(budgets).values({
      id,
      name: input.name,
      amount: input.amount,
      period: input.period,
      categoryId: input.categoryId || null,
      startDate: input.startDate,
      endDate: periodEnd,
      alertAtPercent: input.alertAtPercent ?? 80,
      alertSent: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  }
  
  static async updateBudget(id: string, updates: Partial<NewBudget>): Promise<void> {
    await db.update(budgets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id));
  }
  
  static async deleteBudget(id: string): Promise<void> {
    await db.delete(budgets).where(eq(budgets.id, id));
  }
  
  static async getBudgetById(id: string): Promise<BudgetWithCategory | null> {
    const result = await db.query.budgets.findFirst({
      where: eq(budgets.id, id),
      with: {
        category: true,
      },
    });
    
    return result || null;
  }
  
  static async getAllBudgets(activeOnly: boolean = true): Promise<BudgetWithCategory[]> {
    const query = activeOnly 
      ? eq(budgets.isActive, true)
      : undefined;
    
    const results = await db.query.budgets.findMany({
      where: query,
      with: {
        category: true,
      },
      orderBy: (budgets, { desc }) => [desc(budgets.createdAt)],
    });
    
    return results;
  }
  
  static async getBudgetProgress(budgetId: string): Promise<BudgetProgress | null> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) return null;
    
    const spent = await this.calculateBudgetSpending(budget);
    const remaining = budget.amount - spent;
    const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    return {
      budget,
      spent,
      remaining,
      percentUsed,
      isOverBudget: spent > budget.amount,
      alertTriggered: percentUsed >= budget.alertAtPercent && !budget.alertSent,
    };
  }
  
  static async getAllBudgetsProgress(): Promise<BudgetProgress[]> {
    const allBudgets = await this.getAllBudgets(true);
    
    const progresses = await Promise.all(
      allBudgets.map(async (budget) => {
        const spent = await this.calculateBudgetSpending(budget);
        const remaining = budget.amount - spent;
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        
        return {
          budget,
          spent,
          remaining,
          percentUsed,
          isOverBudget: spent > budget.amount,
          alertTriggered: percentUsed >= budget.alertAtPercent && !budget.alertSent,
        };
      })
    );
    
    return progresses.sort((a, b) => b.percentUsed - a.percentUsed);
  }
  
  static async calculateBudgetSpending(budget: BudgetWithCategory): Promise<number> {
    const { startDate, endDate, categoryId } = budget;
    
    // Build query conditions
    const conditions = [
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate || new Date()),
      eq(transactions.type, 'expense'),
    ];
    
    // If category-specific budget, filter by category
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(...conditions));
    
    return result[0]?.total || 0;
  }
  
  static async checkAndTriggerAlerts(): Promise<BudgetProgress[]> {
    const allProgress = await this.getAllBudgetsProgress();
    const alertsToTrigger: BudgetProgress[] = [];
    
    for (const progress of allProgress) {
      if (progress.alertTriggered) {
        alertsToTrigger.push(progress);
        
        // Mark alert as sent
        await db.update(budgets)
          .set({ alertSent: true })
          .where(eq(budgets.id, progress.budget.id));
      }
      
      // Reset alert if spending dropped below threshold
      if (progress.percentUsed < progress.budget.alertAtPercent && progress.budget.alertSent) {
        await db.update(budgets)
          .set({ alertSent: false })
          .where(eq(budgets.id, progress.budget.id));
      }
    }
    
    return alertsToTrigger;
  }
  
  static async resetAlertSent(budgetId: string): Promise<void> {
    await db.update(budgets)
      .set({ alertSent: false })
      .where(eq(budgets.id, budgetId));
  }
  
  static async getBudgetVsActual(
    budgetId: string,
    groupBy: 'day' | 'week' | 'month' = 'week'
  ): Promise<Array<{ period: string; budgeted: number; actual: number }>> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) return [];
    
    // Calculate daily budget allocation
    const daysInPeriod = Math.ceil(
      ((budget.endDate?.getTime() || new Date().getTime()) - budget.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyBudget = budget.amount / Math.max(daysInPeriod, 1);
    
    // Get actual spending by period
    const spendingData = await this.getSpendingByPeriod(
      budget.startDate,
      budget.endDate || new Date(),
      budget.categoryId,
      groupBy
    );
    
    // Combine budgeted vs actual
    return spendingData.map((period) => ({
      period: period.label,
      budgeted: dailyBudget * period.days,
      actual: period.amount,
    }));
  }
  
  static async getSpendingByPeriod(
    startDate: Date,
    endDate: Date,
    categoryId: string | null,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<Array<{ label: string; amount: number; days: number }>> {
    // Build base conditions
    const conditions = [
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      eq(transactions.type, 'expense'),
    ];
    
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    
    // Get all transactions in range
    const txns = await db.query.transactions.findMany({
      where: and(...conditions),
      orderBy: (transactions, { asc }) => [asc(transactions.transactionDate)],
    });
    
    // Group by period
    const grouped = new Map<string, { amount: number; days: number }>();
    
    for (const txn of txns) {
      const date = new Date(txn.transactionDate);
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      const existing = grouped.get(key) || { amount: 0, days: groupBy === 'day' ? 1 : (groupBy === 'week' ? 7 : 30) };
      existing.amount += txn.amount;
      grouped.set(key, existing);
    }
    
    return Array.from(grouped.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  
  private static calculateDefaultEndDate(
    period: 'monthly' | 'yearly' | 'custom',
    startDate: Date
  ): Date {
    const end = new Date(startDate);
    
    switch (period) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'custom':
        // Default to 1 month for custom
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        break;
    }
    
    return end;
  }
  
  static async rolloverBudget(budgetId: string, newStartDate: Date): Promise<string | null> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget || budget.period === 'custom') return null;
    
    // Calculate new end date
    const newEndDate = this.calculateDefaultEndDate(budget.period, newStartDate);
    
    // Create new budget based on existing
    return this.createBudget({
      name: budget.name,
      amount: budget.amount,
      period: budget.period,
      categoryId: budget.categoryId,
      startDate: newStartDate,
      endDate: newEndDate,
      alertAtPercent: budget.alertAtPercent,
    });
  }
  
  static async getBudgetRecommendations(): Promise<Array<{
    categoryId: string;
    categoryName: string;
    recommendedAmount: number;
    averageSpending: number;
  }>> {
    // Get average spending by category for last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const spendingByCategory = await db
      .select({
        categoryId: transactions.categoryId,
        total: sql<number>`SUM(${transactions.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(and(
        gte(transactions.transactionDate, threeMonthsAgo),
        eq(transactions.type, 'expense')
      ))
      .groupBy(transactions.categoryId);
    
    const recommendations = [];
    
    for (const item of spendingByCategory) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, item.categoryId),
      });
      
      if (category) {
        const monthlyAverage = item.total / 3;
        recommendations.push({
          categoryId: item.categoryId,
          categoryName: category.nameTh || category.name,
          recommendedAmount: Math.ceil(monthlyAverage * 1.1), // 10% buffer
          averageSpending: monthlyAverage,
        });
      }
    }
    
    return recommendations.sort((a, b) => b.averageSpending - a.averageSpending);
  }
}

export default BudgetService;
