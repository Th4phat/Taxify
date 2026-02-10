export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subCategoryId: string | null;
  section40Type: Section40Type | null;
  isTaxDeductible: boolean;
  deductibleAmount: number | null;
  receiptImageUri: string | null;
  ocrRawText: string | null;
  ocrConfidence: number | null;
  description: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface NewTransaction {
  id?: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subCategoryId?: string | null;
  section40Type?: Section40Type | null;
  isTaxDeductible?: boolean;
  deductibleAmount?: number | null;
  receiptImageUri?: string | null;
  ocrRawText?: string | null;
  ocrConfidence?: number | null;
  description?: string | null;
  transactionDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

export interface Category {
  id: string;
  name: string;
  nameTh: string | null;
  type: TransactionType;
  icon: string;
  color: string;
  defaultSection40: Section40Type | null;
  isSystem: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  nameTh: string | null;
  isActive: boolean;
}

export enum Section40Type {
  SALARY = 1,
  SERVICE = 2,
  INTELLECTUAL = 3,
  PASSIVE = 4,
  RENTAL = 5,
  PROFESSIONAL = 6,
  CONTRACT = 7,
  BUSINESS = 8,
}

export interface ExpenseDeduction {
  type: 'percentage' | 'actual' | 'fixed';
  percentage?: number;
  maxAmount?: number;
  actualAmount?: number;
}

export interface Section40Rule {
  name: string;
  nameTh: string;
  defaultExpenseDeduction: ExpenseDeduction;
  canChooseActualExpense: boolean;
  specialRules?: string;
}

export interface TaxBracket {
  minIncome: number;
  maxIncome: number;
  rate: number;
  baseTax: number;
}

export interface TaxDeductions {
  personalAllowance: number;
  spouseAllowance: number;
  childAllowance: number;
  parentAllowance: number;
  disabilityAllowance: number;
  lifeInsurance: number;
  healthInsurance: number;
  pensionInsurance: number;
  rmf: number;
  ssf: number;
  socialSecurity: number;
  homeLoanInterest: number;
  donation: number;
}

export interface TaxIncome {
  section40Type: Section40Type;
  amount: number;
  expenseDeduction: 'standard' | 'actual';
  actualExpenses?: number;
}

export interface TaxCalculationInput {
  taxYear: number;
  incomes: TaxIncome[];
  deductions: TaxDeductions;
  withholdingTaxCredit?: number;
}

export interface TaxCalculationResult {
  incomeBySection40: Record<Section40Type, number>;
  totalGrossIncome: number;
  totalExpenseDeduction: number;
  netIncome: number;
  totalAllowances: number;
  totalInvestments: number;
  taxableIncome: number;
  taxByProgressiveMethod: number;
  taxByAlternativeMethod: number;
  finalTaxDue: number;
  effectiveTaxRate: number;
  withholdingTaxCredit: number;
  taxPayableOrRefund: number;
}

export interface PenaltyCalculation {
  originalTax: number;
  surcharge: number;
  penalty: number;
  criminalFine: number;
  totalDue: number;
}

export interface PenaltyScenario {
  type: 'late_filing' | 'non_filing' | 'inaccurate_filing' | 'voluntary_disclosure';
  monthsLate: number;
  isVoluntary: boolean;
  paymentTimelineDays: number;
}

export interface TaxProfile {
  id: string;
  fullName: string | null;
  taxId: string | null;
  taxYear: number;
  hasSection40_1: boolean;
  hasSection40_2: boolean;
  hasSection40_3: boolean;
  hasSection40_4: boolean;
  hasSection40_5: boolean;
  hasSection40_6: boolean;
  hasSection40_7: boolean;
  hasSection40_8: boolean;
  personalAllowance: number;
  spouseAllowance: number;
  childAllowance: number;
  parentAllowance: number;
  disabilityAllowance: number;
  lifeInsurance: number;
  healthInsurance: number;
  pensionInsurance: number;
  rmf: number;
  ssf: number;
  socialSecurity: number;
  homeLoanInterest: number;
  donation: number;
  estimatedTax: number | null;
  lastCalculatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'th' | 'en';

export interface AppSettings {
  id: string;
  isEncrypted: boolean;
  encryptionKeyId: string | null;
  language: Language;
  currency: string;
  dateFormat: string;
  themeMode: ThemeMode;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  taxDeadlineReminder: boolean;
  defaultTaxYear: number | null;
}

export interface ReceiptCache {
  id: string;
  imageUri: string;
  processedText: string | null;
  merchantName: string | null;
  totalAmount: number | null;
  transactionDate: Date | null;
  confidence: number | null;
  isProcessed: boolean;
  createdAt: Date;
}

export type BudgetPeriod = 'monthly' | 'yearly' | 'custom';

export interface Budget {
  id: string;
  categoryId: string | null;
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date | null;
  alertAtPercent: number;
  alertSent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  alertTriggered: boolean;
}

export type TaxDocumentType = 
  | 'withholding_certificate' 
  | 'donation_receipt' 
  | 'insurance_certificate' 
  | 'investment_statement' 
  | 'other';

export interface TaxDocument {
  id: string;
  name: string;
  documentType: TaxDocumentType;
  fileUri: string;
  thumbnailUri: string | null;
  taxYear: number;
  amount: number | null;
  description: string | null;
  tags: string[];
  issueDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 
  | 'daily_reminder' 
  | 'tax_deadline' 
  | 'budget_alert' 
  | 'recurring_due' 
  | 'custom';

export interface NotificationLog {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  isSent: boolean;
  sentAt: Date | null;
  relatedId: string | null;
  actionRoute: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  ytdIncome: number;
  ytdExpense: number;
  estimatedTax: number;
  taxProgress: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: Date;
  income: number;
  expense: number;
}

export * from './ai';
