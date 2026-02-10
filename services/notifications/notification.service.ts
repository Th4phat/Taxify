import { db } from '@/database/db';
import { notificationLogs, appSettings, recurringTransactions, budgets, transactions } from '@/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { NotificationLog, NewNotificationLog, BudgetProgress } from '@/types';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { BudgetService } from '@/services/budget/budget.service';

export interface TaxDeadlineInfo {
  taxYear: number;
  paperFilingDeadline: Date;
  eFilingDeadline: Date;
  daysUntilPaperDeadline: number;
  daysUntilEDeadline: number;
  isOverdue: boolean;
}

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // HH:mm format
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface NotificationPreferences {
  dailyReminder: DailyReminderConfig;
  taxDeadlineReminder: boolean;
  budgetAlerts: boolean;
  recurringReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class NotificationService {
  static async initialize(): Promise<void> {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }
    
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Schedule background tasks
    await this.scheduleBackgroundTasks();
  }
  
  static getTaxDeadlines(taxYear: number, currentDate: Date = new Date()): TaxDeadlineInfo {
    // Thai tax filing deadlines:
    // Paper filing: March 31
    // E-filing: April 8 (typically extended from April 1)
    
    const paperDeadline = new Date(taxYear + 1, 2, 31); // March 31 of following year
    const eDeadline = new Date(taxYear + 1, 3, 8); // April 8 of following year
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilPaper = Math.ceil((paperDeadline.getTime() - currentDate.getTime()) / msPerDay);
    const daysUntilE = Math.ceil((eDeadline.getTime() - currentDate.getTime()) / msPerDay);
    
    return {
      taxYear,
      paperFilingDeadline: paperDeadline,
      eFilingDeadline: eDeadline,
      daysUntilPaperDeadline: daysUntilPaper,
      daysUntilEDeadline: daysUntilE,
      isOverdue: daysUntilE < 0,
    };
  }
  
  static async checkTaxDeadlineAndNotify(taxYear: number): Promise<void> {
    const deadlines = this.getTaxDeadlines(taxYear);
    const settings = await this.getNotificationPreferences();
    
    if (!settings.taxDeadlineReminder) return;
    
    // Check if we already sent a notification today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alreadyNotified = await db.query.notificationLogs.findFirst({
      where: and(
        eq(notificationLogs.type, 'tax_deadline'),
        gte(notificationLogs.createdAt, today)
      ),
    });
    
    if (alreadyNotified) return;
    
    let shouldNotify = false;
    let title = '';
    let body = '';
    let priority: 'high' | 'normal' = 'normal';
    
    if (deadlines.isOverdue) {
      shouldNotify = true;
      title = '⚠️ Tax Filing Overdue!';
      body = `Your tax filing for year ${taxYear} is overdue. File immediately to minimize penalties.`;
      priority = 'high';
    } else if (deadlines.daysUntilEDeadline === 1) {
      shouldNotify = true;
      title = '📅 Last Day for E-Filing!';
      body = `Tomorrow is the deadline for e-filing your ${taxYear} tax return. Don't forget!`;
      priority = 'high';
    } else if (deadlines.daysUntilEDeadline === 7) {
      shouldNotify = true;
      title = '⏰ Tax Deadline in 1 Week';
      body = `E-filing deadline is in 7 days (${deadlines.eFilingDeadline.toLocaleDateString()}). Prepare your documents!`;
    } else if (deadlines.daysUntilEDeadline === 30) {
      shouldNotify = true;
      title = '📊 Tax Season Reminder';
      body = `Tax filing starts soon. Start organizing your documents for year ${taxYear}.`;
    }
    
    if (shouldNotify) {
      await this.sendNotification({
        type: 'tax_deadline',
        title,
        body,
        priority,
        data: { taxYear, deadlines },
      });
    }
  }
  
  static async scheduleDailyReminder(config: DailyReminderConfig): Promise<void> {
    if (!config.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    
    // Cancel existing daily reminders
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const dailyReminders = existing.filter(n => n.content.data?.type === 'daily_reminder');
    for (const reminder of dailyReminders) {
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
    }
    
    // Parse time
    const [hours, minutes] = config.time.split(':').map(Number);
    
    // Schedule for each day of the week
    for (const dayOfWeek of config.daysOfWeek) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📝 Log Your Transactions',
          body: 'Don\'t forget to record today\'s income and expenses!',
          data: { type: 'daily_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dayOfWeek,
          hour: hours,
          minute: minutes,
        },
      });
    }
  }
  
  static async checkBudgetAlerts(): Promise<void> {
    const settings = await this.getNotificationPreferences();
    if (!settings.budgetAlerts) return;
    
    const triggeredAlerts = await BudgetService.checkAndTriggerAlerts();
    
    for (const alert of triggeredAlerts) {
      // Check if we already sent this alert
      const recentAlert = await db.query.notificationLogs.findFirst({
        where: and(
          eq(notificationLogs.type, 'budget_alert'),
          eq(notificationLogs.relatedId, alert.budget.id),
          gte(notificationLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        ),
      });
      
      if (recentAlert) continue;
      
      const categoryName = alert.budget.category?.nameTh || alert.budget.category?.name || 'Overall';
      
      await this.sendNotification({
        type: 'budget_alert',
        title: '💰 Budget Alert',
        body: `${categoryName} budget is at ${alert.percentUsed.toFixed(0)}% (${alert.spent.toLocaleString()} / ${alert.budget.amount.toLocaleString()} THB)`,
        relatedId: alert.budget.id,
        data: { budgetId: alert.budget.id, progress: alert },
      });
    }
  }
  
  static async checkRecurringDue(): Promise<void> {
    const settings = await this.getNotificationPreferences();
    if (!settings.recurringReminders) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find recurring transactions due today or tomorrow
    const dueRecurring = await db.query.recurringTransactions.findMany({
      where: and(
        eq(recurringTransactions.isActive, true),
        gte(recurringTransactions.nextDueDate, today),
        lte(recurringTransactions.nextDueDate, tomorrow)
      ),
    });
    
    for (const recurring of dueRecurring) {
      // Check if already notified
      const existing = await db.query.notificationLogs.findFirst({
        where: and(
          eq(notificationLogs.type, 'recurring_due'),
          eq(notificationLogs.relatedId, recurring.id),
          gte(notificationLogs.createdAt, today)
        ),
      });
      
      if (existing) continue;
      
      const isToday = recurring.nextDueDate.getTime() === today.getTime();
      
      await this.sendNotification({
        type: 'recurring_due',
        title: isToday ? '📌 Payment Due Today' : '📅 Payment Due Tomorrow',
        body: `${recurring.description || 'Recurring transaction'}: ${recurring.amount.toLocaleString()} THB`,
        relatedId: recurring.id,
        data: { recurringId: recurring.id },
      });
    }
  }
  
  static async sendNotification(params: {
    type: 'daily_reminder' | 'tax_deadline' | 'budget_alert' | 'recurring_due' | 'custom';
    title: string;
    body: string;
    priority?: 'high' | 'normal';
    relatedId?: string;
    data?: Record<string, unknown>;
    actionRoute?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    
    // Schedule immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { ...params.data, notificationId: id },
        sound: true,
        priority: params.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : undefined,
      },
      trigger: null, // Immediate
    });
    
    // Log to database
    await db.insert(notificationLogs).values({
      id,
      type: params.type,
      title: params.title,
      body: params.body,
      isRead: false,
      isSent: true,
      sentAt: new Date(),
      relatedId: params.relatedId || null,
      actionRoute: params.actionRoute || null,
      createdAt: new Date(),
    });
    
    return id;
  }
  
  static async getNotificationHistory(
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    const conditions = [];
    
    if (unreadOnly) {
      conditions.push(eq(notificationLogs.isRead, false));
    }
    
    const results = await db.query.notificationLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(notificationLogs.createdAt)],
      limit,
    });
    
    return results;
  }
  
  static async markAsRead(notificationId: string): Promise<void> {
    await db.update(notificationLogs)
      .set({ isRead: true })
      .where(eq(notificationLogs.id, notificationId));
  }
  
  static async markAllAsRead(): Promise<void> {
    await db.update(notificationLogs)
      .set({ isRead: true })
      .where(eq(notificationLogs.isRead, false));
  }
  
  static async deleteNotification(notificationId: string): Promise<void> {
    await db.delete(notificationLogs).where(eq(notificationLogs.id, notificationId));
  }
  
  static async getUnreadCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notificationLogs)
      .where(eq(notificationLogs.isRead, false));
    
    return result[0]?.count || 0;
  }
  
  static async getNotificationPreferences(): Promise<NotificationPreferences> {
    const settings = await db.query.appSettings.findFirst();
    
    if (!settings) {
      return this.getDefaultPreferences();
    }
    
    return {
      dailyReminder: {
        enabled: settings.dailyReminderEnabled,
        time: settings.dailyReminderTime || '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // All days by default
      },
      taxDeadlineReminder: settings.taxDeadlineReminder,
      budgetAlerts: true,
      recurringReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }
  
  static async saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
    await db.update(appSettings)
      .set({
        dailyReminderEnabled: prefs.dailyReminder.enabled,
        dailyReminderTime: prefs.dailyReminder.time,
        taxDeadlineReminder: prefs.taxDeadlineReminder,
      })
      .where(eq(appSettings.id, 'main'));
    
    // Re-schedule daily reminders
    await this.scheduleDailyReminder(prefs.dailyReminder);
  }
  
  private static getDefaultPreferences(): NotificationPreferences {
    return {
      dailyReminder: {
        enabled: false,
        time: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      },
      taxDeadlineReminder: true,
      budgetAlerts: true,
      recurringReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }
  
  private static async scheduleBackgroundTasks(): Promise<void> {
    // Set up a daily check for tax deadlines and recurring transactions
    // This would typically use a background fetch or similar
    // For now, we'll rely on the app foregrounding to trigger checks
  }
  
  static async runDailyChecks(taxYear: number): Promise<void> {
    await this.checkTaxDeadlineAndNotify(taxYear);
    await this.checkBudgetAlerts();
    await this.checkRecurringDue();
  }
  
  static getTaxYearProgress(taxYear: number, currentDate: Date = new Date()): {
    percentComplete: number;
    daysRemaining: number;
    monthsRemaining: number;
    currentQuarter: number;
  } {
    const taxYearStart = new Date(taxYear, 0, 1); // Jan 1
    const taxYearEnd = new Date(taxYear, 11, 31); // Dec 31
    
    const totalDays = (taxYearEnd.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = (currentDate.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    
    const percentComplete = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    const monthsRemaining = Math.ceil(daysRemaining / 30);
    
    // Calculate current quarter (1-4)
    const month = currentDate.getMonth();
    const currentQuarter = Math.floor(month / 3) + 1;
    
    return {
      percentComplete,
      daysRemaining,
      monthsRemaining,
      currentQuarter,
    };
  }
}

export default NotificationService;
