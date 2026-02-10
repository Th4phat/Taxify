import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameTh: text('name_th'),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  
  // Tax relevance
  defaultSection40: integer('default_section_40'), // For auto-categorization
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  
  displayOrder: integer('display_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  subCategories: many(subCategories),
}));

export const subCategories = sqliteTable('sub_categories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  nameTh: text('name_th'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const subCategoriesRelations = relations(subCategories, ({ one }) => ({
  category: one(categories, {
    fields: [subCategories.categoryId],
    references: [categories.id],
  }),
}));

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  subCategoryId: text('sub_category_id').references(() => subCategories.id),
  
  // Tax-related fields
  section40Type: integer('section_40_type'), // 1-8 for income types
  isTaxDeductible: integer('is_tax_deductible', { mode: 'boolean' }).default(false),
  deductibleAmount: real('deductible_amount'),
  
  // Receipt/OCR
  receiptImageUri: text('receipt_image_uri'),
  ocrRawText: text('ocr_raw_text'),
  ocrConfidence: real('ocr_confidence'),
  
  // Metadata
  description: text('description'),
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  
  // Withholding Tax (Thai 50 Tawi tracking)
  withholdingTax: real('withholding_tax').default(0),
  withholdingTaxRate: real('withholding_tax_rate'),
  hasWithholdingCertificate: integer('has_withholding_certificate', { mode: 'boolean' }).default(false),
  
  // Sync status (for future cloud sync)
  syncStatus: text('sync_status', { 
    enum: ['pending', 'synced', 'failed'] 
  }).default('pending'),
}, (table) => ({
  dateIdx: index('transaction_date_idx').on(table.transactionDate),
  typeIdx: index('transaction_type_idx').on(table.type),
  categoryIdx: index('transaction_category_idx').on(table.categoryId),
  section40Idx: index('transaction_section40_idx').on(table.section40Type),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  subCategory: one(subCategories, {
    fields: [transactions.subCategoryId],
    references: [subCategories.id],
  }),
}));

export const taxProfiles = sqliteTable('tax_profiles', {
  id: text('id').primaryKey(),
  
  // Personal info (encrypted at application level if needed)
  fullName: text('full_name'),
  taxId: text('tax_id'),
  
  // Tax year settings
  taxYear: integer('tax_year').notNull(),
  
  // Income sources flags
  hasSection40_1: integer('has_section_40_1', { mode: 'boolean' }).default(false),
  hasSection40_2: integer('has_section_40_2', { mode: 'boolean' }).default(false),
  hasSection40_3: integer('has_section_40_3', { mode: 'boolean' }).default(false),
  hasSection40_4: integer('has_section_40_4', { mode: 'boolean' }).default(false),
  hasSection40_5: integer('has_section_40_5', { mode: 'boolean' }).default(false),
  hasSection40_6: integer('has_section_40_6', { mode: 'boolean' }).default(false),
  hasSection40_7: integer('has_section_40_7', { mode: 'boolean' }).default(false),
  hasSection40_8: integer('has_section_40_8', { mode: 'boolean' }).default(false),
  
  // Deductions & Allowances
  personalAllowance: real('personal_allowance').default(60000),
  spouseAllowance: real('spouse_allowance').default(0),
  childAllowance: real('child_allowance').default(0),
  parentAllowance: real('parent_allowance').default(0),
  disabilityAllowance: real('disability_allowance').default(0),
  
  // Insurance & Investments
  lifeInsurance: real('life_insurance').default(0),
  healthInsurance: real('health_insurance').default(0),
  pensionInsurance: real('pension_insurance').default(0),
  rmf: real('rmf').default(0),
  ssf: real('ssf').default(0),
  
  // Other deductions
  socialSecurity: real('social_security').default(0),
  homeLoanInterest: real('home_loan_interest').default(0),
  donation: real('donation').default(0),
  
  // Calculated fields (cached)
  estimatedTax: real('estimated_tax'),
  lastCalculatedAt: integer('last_calculated_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  yearIdx: index('tax_profile_year_idx').on(table.taxYear),
}));

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('main'),
  
  // Security
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).default(false),
  encryptionKeyId: text('encryption_key_id'),
  
  // Preferences
  language: text('language', { enum: ['th', 'en'] }).default('th'),
  currency: text('currency').default('THB'),
  dateFormat: text('date_format').default('DD/MM/YYYY'),
  
  // Theme
  themeMode: text('theme_mode', { enum: ['light', 'dark', 'system'] }).default('system'),
  
  // Notifications
  dailyReminderEnabled: integer('daily_reminder_enabled', { mode: 'boolean' }).default(false),
  dailyReminderTime: text('dailyReminderTime').default('20:00'),
  taxDeadlineReminder: integer('tax_deadline_reminder', { mode: 'boolean' }).default(true),
  
  // Tax settings
  defaultTaxYear: integer('default_tax_year'),
});

export const receiptCache = sqliteTable('receipt_cache', {
  id: text('id').primaryKey(),
  imageUri: text('image_uri').notNull(),
  processedText: text('processed_text'),
  merchantName: text('merchant_name'),
  totalAmount: real('total_amount'),
  transactionDate: integer('transaction_date', { mode: 'timestamp' }),
  confidence: real('confidence'),
  isProcessed: integer('is_processed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  subCategoryId: text('sub_category_id').references(() => subCategories.id),
  
  // Recurrence settings
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }), // Optional end date
  nextDueDate: integer('next_due_date', { mode: 'timestamp' }).notNull(),
  
  // Tax-related fields
  section40Type: integer('section_40_type'),
  isTaxDeductible: integer('is_tax_deductible', { mode: 'boolean' }).default(false),
  deductibleAmount: real('deductible_amount'),
  
  // Metadata
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastGeneratedDate: integer('last_generated_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nextDueIdx: index('recurring_next_due_idx').on(table.nextDueDate),
  activeIdx: index('recurring_active_idx').on(table.isActive),
  categoryIdx: index('recurring_category_idx').on(table.categoryId),
}));

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  subCategory: one(subCategories, {
    fields: [recurringTransactions.subCategoryId],
    references: [subCategories.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type SubCategory = typeof subCategories.$inferSelect;
export type NewSubCategory = typeof subCategories.$inferInsert;
export type TaxProfile = typeof taxProfiles.$inferSelect;
export type NewTaxProfile = typeof taxProfiles.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
export type ReceiptCache = typeof receiptCache.$inferSelect;
export type NewReceiptCache = typeof receiptCache.$inferInsert;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),
  
  // Budget scope: null categoryId = overall budget
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  
  // Period settings
  period: text('period', { enum: ['monthly', 'yearly', 'custom'] }).notNull().default('monthly'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  
  // Alerts
  alertAtPercent: integer('alert_at_percent').default(80), // Alert at 80% by default
  alertSent: integer('alert_sent', { mode: 'boolean' }).default(false),
  
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  categoryIdx: index('budget_category_idx').on(table.categoryId),
  activeIdx: index('budget_active_idx').on(table.isActive),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const taxDocuments = sqliteTable('tax_documents', {
  id: text('id').primaryKey(),
  
  // Document info
  name: text('name').notNull(),
  documentType: text('document_type', { 
    enum: ['withholding_certificate', 'donation_receipt', 'insurance_certificate', 'investment_statement', 'other'] 
  }).notNull(),
  
  // File storage
  fileUri: text('file_uri').notNull(),
  thumbnailUri: text('thumbnail_uri'),
  
  // Tax year and amount
  taxYear: integer('tax_year').notNull(),
  amount: real('amount'), // Document value (donation, insurance premium, etc.)
  
  // Metadata
  description: text('description'),
  tags: text('tags'), // JSON array of tags
  
  // Expiry/Validity tracking
  issueDate: integer('issue_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  yearIdx: index('tax_doc_year_idx').on(table.taxYear),
  typeIdx: index('tax_doc_type_idx').on(table.documentType),
}));

export const notificationLogs = sqliteTable('notification_logs', {
  id: text('id').primaryKey(),
  
  // Notification details
  type: text('type', { 
    enum: ['daily_reminder', 'tax_deadline', 'budget_alert', 'recurring_due', 'custom'] 
  }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  
  // Status
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isSent: integer('is_sent', { mode: 'boolean' }).default(false),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  
  // Related data
  relatedId: text('related_id'), // Budget ID, transaction ID, etc.
  actionRoute: text('action_route'), // Deep link route
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  typeIdx: index('notification_type_idx').on(table.type),
  readIdx: index('notification_read_idx').on(table.isRead),
}));

export const taxOptimizationSnapshots = sqliteTable('tax_optimization_snapshots', {
  id: text('id').primaryKey(),
  taxYear: integer('tax_year').notNull(),
  
  // Current status
  currentTaxableIncome: real('current_taxable_income').notNull(),
  currentTaxAmount: real('current_tax_amount').notNull(),
  effectiveTaxRate: real('effective_tax_rate').notNull(),
  
  // Bracket info
  currentBracketIndex: integer('current_bracket_index').notNull(),
  nextBracketThreshold: real('next_bracket_threshold'),
  amountToNextBracket: real('amount_to_next_bracket'),
  
  // Optimization suggestions (JSON)
  suggestions: text('suggestions').notNull(), // JSON array of TaxOptimizationSuggestion
  
  // Potential savings
  potentialSavings: real('potential_savings').default(0),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  yearIdx: index('tax_opt_year_idx').on(table.taxYear),
}));

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type TaxDocument = typeof taxDocuments.$inferSelect;
export type NewTaxDocument = typeof taxDocuments.$inferInsert;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
export type TaxOptimizationSnapshot = typeof taxOptimizationSnapshots.$inferSelect;
export type NewTaxOptimizationSnapshot = typeof taxOptimizationSnapshots.$inferInsert;
