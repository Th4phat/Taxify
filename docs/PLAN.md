# Taxify - Thai Personal Income Tax & Expense Tracker App
## Comprehensive Development Plan

---

## 1. Executive Summary

Taxify is a privacy-focused, local-first mobile application built with Expo and TypeScript that helps Thai residents:
- Track daily income and expenses with categorization
- Scan and parse receipts using OCR
- Calculate Thai Personal Income Tax based on Revenue Code
- Predict tax liability and potential penalties
- Visualize financial health through intuitive dashboards

### Key Differentiators
- **Local-first architecture**: All data stored locally with SQLite
- **Privacy by design**: End-to-end encryption for sensitive financial data
- **Thai tax compliance**: Accurate tax calculation based on Thai Revenue Code
- **Modern UI/UX**: Material You design with react-native-paper
- **Offline capability**: Full functionality without internet

---

## 2. Technical Architecture

### 2.1 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 54 | Cross-platform development |
| **Package Manager** | Bun | Fast dependency management |
| **Language** | TypeScript | Type safety |
| **UI Library** | react-native-paper v5 | Material You components |
| **Navigation** | expo-router | File-based routing |
| **Database** | expo-sqlite (SQLCipher) | Local encrypted storage |
| **ORM** | Drizzle ORM | Type-safe database operations |
| **Charts** | react-native-gifted-charts | Data visualization |
| **Camera** | expo-camera | Receipt scanning |
| **OCR** | expo-mlkit-ocr | Text recognition |
| **Encryption** | expo-secure-store | Key management |
| **State Management** | Zustand | Global state |
| **Animations** | react-native-reanimated | Smooth transitions |

### 2.2 Project Structure

```
taxify/
├── app/                          # Expo Router routes
│   ├── _layout.tsx              # Root layout with providers
│   ├── (app)/                   # Main app routes (authenticated)
│   │   ├── _layout.tsx          # Tab navigation
│   │   ├── dashboard.tsx        # Main dashboard
│   │   ├── transactions/        # Transaction management
│   │   │   ├── index.tsx        # Transaction list
│   │   │   ├── [id].tsx         # Transaction detail
│   │   │   └── new.tsx          # Add new transaction
│   │   ├── scan/                # Receipt scanning
│   │   │   └── index.tsx
│   │   ├── tax/                 # Tax calculation
│   │   │   ├── index.tsx        # Tax dashboard
│   │   │   └── calculator.tsx   # Tax calculator
│   │   └── settings/            # App settings
│   │       └── index.tsx
│   └── (onboarding)/            # Onboarding flows
│
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   │   ├── ThemedView.tsx
│   │   ├── ThemedText.tsx
│   │   ├── Card.tsx
│   │   └── Chart.tsx
│   ├── forms/                   # Form components
│   │   ├── TransactionForm.tsx
│   │   └── CategoryPicker.tsx
│   ├── charts/                  # Chart components
│   │   ├── ExpenseChart.tsx
│   │   ├── IncomeChart.tsx
│   │   └── TaxProjection.tsx
│   └── receipt/                 # Receipt scanning
│       ├── CameraView.tsx
│       └── OCRProcessor.tsx
│
├── database/                     # Database layer
│   ├── schema.ts                # Drizzle schema
│   ├── migrations/              # Migration files
│   ├── db.ts                    # Database provider
│   └── repositories/            # Data access layer
│       ├── transaction.repo.ts
│       ├── category.repo.ts
│       └── settings.repo.ts
│
├── services/                     # Business logic
│   ├── tax/                     # Tax calculation engine
│   │   ├── calculator.ts        # Main tax calculator
│   │   ├── section40.ts         # Section 40 income types
│   │   ├── deductions.ts        # Deductions & allowances
│   │   └── penalties.ts         # Penalty calculator
│   ├── receipt/                 # Receipt processing
│   │   ├── ocr.service.ts
│   │   └── parser.service.ts
│   └── sync/                    # Optional sync service
│
├── stores/                       # Zustand stores
│   ├── auth.store.ts
│   ├── theme.store.ts
│   └── transaction.store.ts
│
├── hooks/                        # Custom hooks
│   ├── use-theme.ts
│   ├── use-database.ts
│   ├── use-tax-calculator.ts
│   └── use-receipt-scanner.ts
│
├── theme/                        # Theming
│   ├── colors.ts                # Color palettes
│   ├── fonts.ts                 # Typography
│   └── index.ts                 # Theme exports
│
├── types/                        # TypeScript types
│   ├── database.ts
│   ├── tax.ts
│   └── transaction.ts
│
├── utils/                        # Utilities
│   ├── encryption.ts            # Encryption helpers
│   ├── formatters.ts            # Number/date formatters
│   └── validators.ts            # Input validation
│
└── constants/                    # Constants
    ├── categories.ts            # Transaction categories
    ├── tax-rates.ts             # Thai tax brackets
    └── deductions.ts            # Deduction limits
```

---

## 3. Database Schema Design

### 3.1 Core Tables

```typescript
// database/schema.ts

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ==================== TRANSACTIONS ====================
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
  
  // Sync status (for future cloud sync)
  syncStatus: text('sync_status', { 
    enum: ['pending', 'synced', 'failed'] 
  }).default('pending'),
}, (table) => ({
  dateIdx: index('transaction_date_idx').on(table.transactionDate),
  typeIdx: index('transaction_type_idx').on(table.type),
  categoryIdx: index('transaction_category_idx').on(table.categoryId),
}));

// ==================== CATEGORIES ====================
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

export const subCategories = sqliteTable('sub_categories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  nameTh: text('name_th'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

// ==================== TAX PROFILE ====================
export const taxProfiles = sqliteTable('tax_profiles', {
  id: text('id').primaryKey(),
  
  // Personal info (encrypted)
  fullName: text('full_name'), // encrypted
  taxId: text('tax_id'), // encrypted
  
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
});

// ==================== APP SETTINGS ====================
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
  dailyReminderTime: text('daily_reminder_time').default('20:00'),
  taxDeadlineReminder: integer('tax_deadline_reminder', { mode: 'boolean' }).default(true),
  
  // Tax settings
  defaultTaxYear: integer('default_tax_year'),
});

// ==================== RECEIPT CACHE ====================
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

// Types
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type TaxProfile = typeof taxProfiles.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
```

### 3.2 Indexes for Performance

```typescript
// Performance-critical indexes
- transaction_date_idx: For monthly queries
- transaction_type_idx: For income/expense separation
- transaction_category_idx: For category filtering
- transaction_section40_idx: For tax calculation
- tax_profile_year_idx: For tax year lookups
```

---

## 4. Thai Tax Calculation Engine

### 4.1 Income Classification (Section 40)

Based on the Thai Revenue Code analysis from the uploaded documents:

```typescript
// services/tax/section40.ts

export enum Section40Type {
  SALARY = 1,        // 40(1): Employment Income
  SERVICE = 2,       // 40(2): Post/Service Income
  INTELLECTUAL = 3,  // 40(3): Copyright, Goodwill
  PASSIVE = 4,       // 40(4): Interest, Dividends
  RENTAL = 5,        // 40(5): Rental Income
  PROFESSIONAL = 6,  // 40(6): Professional Services
  CONTRACT = 7,      // 40(7): Contract Work
  BUSINESS = 8,      // 40(8): Business/Commerce
}

export interface ExpenseDeduction {
  type: 'percentage' | 'actual' | 'fixed';
  percentage?: number;
  maxAmount?: number;
  actualAmount?: number;
}

export const SECTION_40_RULES: Record<Section40Type, {
  name: string;
  nameTh: string;
  defaultExpenseDeduction: ExpenseDeduction;
  canChooseActualExpense: boolean;
  specialRules?: string;
}> = {
  [Section40Type.SALARY]: {
    name: 'Employment Income',
    nameTh: 'เงินได้จากการจ้างแรงงาน',
    defaultExpenseDeduction: { type: 'percentage', percentage: 50, maxAmount: 100000 },
    canChooseActualExpense: false,
  },
  [Section40Type.SERVICE]: {
    name: 'Service Income',
    nameTh: 'เงินได้จากหน้าที่หรือตำแหน่งงาน',
    defaultExpenseDeduction: { type: 'percentage', percentage: 50, maxAmount: 100000 },
    canChooseActualExpense: false,
    specialRules: 'Combined with 40(1), max 100,000 THB',
  },
  [Section40Type.INTELLECTUAL]: {
    name: 'Intellectual Property',
    nameTh: 'ค่าลิขสิทธิ์ กู๊ดวิลล์',
    defaultExpenseDeduction: { type: 'percentage', percentage: 50, maxAmount: 100000 },
    canChooseActualExpense: true,
  },
  [Section40Type.PASSIVE]: {
    name: 'Passive Income',
    nameTh: 'ดอกเบี้ย เงินปันผล',
    defaultExpenseDeduction: { type: 'percentage', percentage: 0 },
    canChooseActualExpense: false,
    specialRules: 'Final tax option available (10-15% withholding)',
  },
  [Section40Type.RENTAL]: {
    name: 'Rental Income',
    nameTh: 'ค่าเช่าทรัพย์สิน',
    defaultExpenseDeduction: { 
      type: 'percentage', 
      percentage: 30, // Buildings
      // Alternative: 20% (Agricultural land), 15% (Other land), 30% (Vehicles)
    },
    canChooseActualExpense: true,
  },
  [Section40Type.PROFESSIONAL]: {
    name: 'Professional Services',
    nameTh: 'วิชาชีพอิสระ',
    defaultExpenseDeduction: { 
      type: 'percentage', 
      percentage: 30, // 60% for medical professionals
    },
    canChooseActualExpense: true,
  },
  [Section40Type.CONTRACT]: {
    name: 'Contract Work',
    nameTh: 'การรับเหมา',
    defaultExpenseDeduction: { type: 'percentage', percentage: 60 },
    canChooseActualExpense: true,
  },
  [Section40Type.BUSINESS]: {
    name: 'Business Income',
    nameTh: 'เงินได้จากการธุรกิจ',
    defaultExpenseDeduction: { type: 'percentage', percentage: 60 },
    canChooseActualExpense: true,
    specialRules: 'Must be in Royal Decree list for 60% deduction',
  },
};
```

### 4.2 Tax Brackets (2024-2025)

```typescript
// constants/tax-rates.ts

export interface TaxBracket {
  minIncome: number;
  maxIncome: number;
  rate: number;
  baseTax: number; // Cumulative tax up to previous bracket
}

export const TAX_BRACKETS_2024: TaxBracket[] = [
  { minIncome: 0, maxIncome: 150000, rate: 0, baseTax: 0 },
  { minIncome: 150001, maxIncome: 300000, rate: 0.05, baseTax: 0 },
  { minIncome: 300001, maxIncome: 500000, rate: 0.10, baseTax: 7500 },
  { minIncome: 500001, maxIncome: 750000, rate: 0.15, baseTax: 27500 },
  { minIncome: 750001, maxIncome: 1000000, rate: 0.20, baseTax: 65000 },
  { minIncome: 1000001, maxIncome: 2000000, rate: 0.25, baseTax: 115000 },
  { minIncome: 2000001, maxIncome: 5000000, rate: 0.30, baseTax: 365000 },
  { minIncome: 5000001, maxIncome: Infinity, rate: 0.35, baseTax: 1265000 },
];

// Progressive Tax Calculation
export const calculateProgressiveTax = (netIncome: number): number => {
  for (const bracket of TAX_BRACKETS_2024) {
    if (netIncome <= bracket.maxIncome) {
      const taxableInBracket = netIncome - bracket.minIncome;
      return bracket.baseTax + (taxableInBracket * bracket.rate);
    }
  }
  return 0;
};
```

### 4.3 Penalty & Surcharge Calculator

```typescript
// services/tax/penalties.ts

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

export const calculatePenalties = (
  taxDue: number,
  scenario: PenaltyScenario
): PenaltyCalculation => {
  let surcharge = 0;
  let penalty = 0;
  let criminalFine = 0;

  // Surcharge: 1.5% per month (max = tax amount)
  if (taxDue > 0) {
    surcharge = Math.min(
      taxDue * 0.015 * scenario.monthsLate,
      taxDue // Cap at 100% of tax
    );
  }

  switch (scenario.type) {
    case 'late_filing':
      // Criminal fine only
      criminalFine = scenario.monthsLate <= 1 ? 100 : 200;
      break;

    case 'non_filing':
      if (scenario.isVoluntary) {
        // Reduced penalty for voluntary disclosure
        if (scenario.paymentTimelineDays <= 15) {
          penalty = taxDue * 0.02;
        } else if (scenario.paymentTimelineDays <= 30) {
          penalty = taxDue * 0.05;
        } else if (scenario.paymentTimelineDays <= 60) {
          penalty = taxDue * 0.10;
        } else {
          penalty = taxDue * 0.20;
        }
      } else {
        // Audit detection: 100% or 200%
        penalty = taxDue * 2.0; // 200% for non-filing
      }
      break;

    case 'inaccurate_filing':
      if (scenario.isVoluntary) {
        // Same scale as non-filing but based on 100%
        if (scenario.paymentTimelineDays <= 15) {
          penalty = taxDue * 0.02;
        } else if (scenario.paymentTimelineDays <= 30) {
          penalty = taxDue * 0.05;
        } else if (scenario.paymentTimelineDays <= 60) {
          penalty = taxDue * 0.10;
        } else {
          penalty = taxDue * 0.20;
        }
      } else {
        penalty = taxDue * 1.0; // 100% for inaccurate filing
      }
      break;

    case 'voluntary_disclosure':
      // Voluntary disclosure with prompt payment
      if (scenario.paymentTimelineDays <= 15) {
        penalty = taxDue * 0.02;
      }
      break;
  }

  return {
    originalTax: taxDue,
    surcharge,
    penalty,
    criminalFine,
    totalDue: taxDue + surcharge + penalty + criminalFine,
  };
};

// Alternative Minimum Tax (Gross Income Method)
export const calculateAlternativeTax = (
  grossIncomeTypes2to8: number
): number => {
  // Only applies if income from types 2-8 >= 1,000,000 THB
  if (grossIncomeTypes2to8 < 1000000) return 0;
  
  const tax = grossIncomeTypes2to8 * 0.005; // 0.5%
  
  // Exempt if <= 5,000 THB
  if (tax <= 5000) return 0;
  
  return tax;
};
```

### 4.4 Main Tax Calculator Service

```typescript
// services/tax/calculator.ts

import { Section40Type, SECTION_40_RULES } from './section40';
import { calculateProgressiveTax, calculateAlternativeTax } from './tax-rates';
import { calculatePenalties } from './penalties';

export interface TaxCalculationInput {
  taxYear: number;
  incomes: {
    section40Type: Section40Type;
    amount: number;
    expenseDeduction?: 'standard' | 'actual';
    actualExpenses?: number;
  }[];
  deductions: {
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
  };
}

export interface TaxCalculationResult {
  // Income breakdown
  incomeBySection40: Record<Section40Type, number>;
  totalGrossIncome: number;
  totalExpenseDeduction: number;
  netIncome: number;
  
  // Deduction breakdown
  totalAllowances: number;
  totalInvestments: number;
  taxableIncome: number;
  
  // Tax calculation
  taxByProgressiveMethod: number;
  taxByAlternativeMethod: number;
  finalTaxDue: number;
  effectiveTaxRate: number;
  
  // Withholding tax credit (if any)
  withholdingTaxCredit: number;
  taxPayableOrRefund: number;
}

export class TaxCalculator {
  calculate(input: TaxCalculationInput): TaxCalculationResult {
    // 1. Calculate income by section 40 type
    const incomeBySection40 = this.groupIncomeBySection40(input.incomes);
    
    // 2. Calculate expense deductions
    let totalExpenseDeduction = 0;
    const processedIncomes = input.incomes.map(income => {
      const rule = SECTION_40_RULES[income.section40Type];
      let deduction = 0;
      
      if (income.expenseDeduction === 'actual' && rule.canChooseActualExpense) {
        deduction = income.actualExpenses || 0;
      } else {
        // Use standard deduction
        if (rule.defaultExpenseDeduction.type === 'percentage') {
          deduction = Math.min(
            income.amount * (rule.defaultExpenseDeduction.percentage! / 100),
            rule.defaultExpenseDeduction.maxAmount || Infinity
          );
        }
      }
      
      totalExpenseDeduction += deduction;
      return { ...income, deduction };
    });

    const totalGrossIncome = input.incomes.reduce((sum, i) => sum + i.amount, 0);
    const netIncome = totalGrossIncome - totalExpenseDeduction;

    // 3. Calculate allowances and deductions
    const totalAllowances = this.calculateAllowances(input.deductions);
    const totalInvestments = this.calculateInvestmentDeductions(input.deductions);
    
    const taxableIncome = Math.max(0, netIncome - totalAllowances - totalInvestments);

    // 4. Calculate tax
    const taxByProgressiveMethod = calculateProgressiveTax(taxableIncome);
    
    // Alternative method (for income types 2-8 only)
    const incomeTypes2to8 = 
      (incomeBySection40[Section40Type.SERVICE] || 0) +
      (incomeBySection40[Section40Type.INTELLECTUAL] || 0) +
      (incomeBySection40[Section40Type.PASSIVE] || 0) +
      (incomeBySection40[Section40Type.RENTAL] || 0) +
      (incomeBySection40[Section40Type.PROFESSIONAL] || 0) +
      (incomeBySection40[Section40Type.CONTRACT] || 0) +
      (incomeBySection40[Section40Type.BUSINESS] || 0);
    
    const taxByAlternativeMethod = calculateAlternativeTax(incomeTypes2to8);
    
    const finalTaxDue = Math.max(taxByProgressiveMethod, taxByAlternativeMethod);
    const effectiveTaxRate = totalGrossIncome > 0 ? finalTaxDue / totalGrossIncome : 0;

    return {
      incomeBySection40,
      totalGrossIncome,
      totalExpenseDeduction,
      netIncome,
      totalAllowances,
      totalInvestments,
      taxableIncome,
      taxByProgressiveMethod,
      taxByAlternativeMethod,
      finalTaxDue,
      effectiveTaxRate,
      withholdingTaxCredit: 0, // TODO: Track withholding tax
      taxPayableOrRefund: finalTaxDue,
    };
  }

  private groupIncomeBySection40(
    incomes: TaxCalculationInput['incomes']
  ): Record<Section40Type, number> {
    const grouped: Partial<Record<Section40Type, number>> = {};
    
    for (const income of incomes) {
      const current = grouped[income.section40Type] || 0;
      grouped[income.section40Type] = current + income.amount;
    }
    
    return grouped as Record<Section40Type, number>;
  }

  private calculateAllowances(deductions: TaxCalculationInput['deductions']): number {
    return (
      deductions.personalAllowance +
      deductions.spouseAllowance +
      deductions.childAllowance +
      deductions.parentAllowance +
      deductions.disabilityAllowance
    );
  }

  private calculateInvestmentDeductions(deductions: TaxCalculationInput['deductions']): number {
    // Apply deduction limits
    const lifeInsuranceDeduction = Math.min(deductions.lifeInsurance, 100000);
    const healthInsuranceDeduction = Math.min(deductions.healthInsurance, 25000);
    const pensionInsuranceDeduction = Math.min(deductions.pensionInsurance, 200000);
    const rmfDeduction = Math.min(deductions.rmf, 500000);
    const ssfDeduction = Math.min(deductions.ssf, 200000);
    
    // Combined RMf + SSF + Pension limit
    const retirementTotal = rmfDeduction + ssfDeduction + pensionInsuranceDeduction;
    const retirementDeduction = Math.min(retirementTotal, 500000);
    
    const homeLoanDeduction = Math.min(deductions.homeLoanInterest, 100000);
    const donationDeduction = Math.min(deductions.donation, deductions.taxableIncome * 0.10);
    
    return (
      lifeInsuranceDeduction +
      healthInsuranceDeduction +
      retirementDeduction +
      homeLoanDeduction +
      donationDeduction
    );
  }
}
```

---

## 5. UI/UX Design System

### 5.1 Theme Configuration

```typescript
// theme/index.ts

import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { AppTheme } from '@/types/theme';

const fontConfig = {
  displayLarge: { fontFamily: 'sans-serif', fontSize: 57, fontWeight: '400', letterSpacing: 0, lineHeight: 64 },
  displayMedium: { fontFamily: 'sans-serif', fontSize: 45, fontWeight: '400', letterSpacing: 0, lineHeight: 52 },
  displaySmall: { fontFamily: 'sans-serif', fontSize: 36, fontWeight: '400', letterSpacing: 0, lineHeight: 44 },
  headlineLarge: { fontFamily: 'sans-serif', fontSize: 32, fontWeight: '400', letterSpacing: 0, lineHeight: 40 },
  headlineMedium: { fontFamily: 'sans-serif', fontSize: 28, fontWeight: '400', letterSpacing: 0, lineHeight: 36 },
  headlineSmall: { fontFamily: 'sans-serif', fontSize: 24, fontWeight: '400', letterSpacing: 0, lineHeight: 32 },
  titleLarge: { fontFamily: 'sans-serif-medium', fontSize: 22, fontWeight: '500', letterSpacing: 0, lineHeight: 28 },
  titleMedium: { fontFamily: 'sans-serif-medium', fontSize: 16, fontWeight: '500', letterSpacing: 0.15, lineHeight: 24 },
  titleSmall: { fontFamily: 'sans-serif-medium', fontSize: 14, fontWeight: '500', letterSpacing: 0.1, lineHeight: 20 },
  bodyLarge: { fontFamily: 'sans-serif', fontSize: 16, fontWeight: '400', letterSpacing: 0.15, lineHeight: 24 },
  bodyMedium: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: '400', letterSpacing: 0.25, lineHeight: 20 },
  bodySmall: { fontFamily: 'sans-serif', fontSize: 12, fontWeight: '400', letterSpacing: 0.4, lineHeight: 16 },
  labelLarge: { fontFamily: 'sans-serif-medium', fontSize: 14, fontWeight: '500', letterSpacing: 0.1, lineHeight: 20 },
  labelMedium: { fontFamily: 'sans-serif-medium', fontSize: 12, fontWeight: '500', letterSpacing: 0.5, lineHeight: 16 },
  labelSmall: { fontFamily: 'sans-serif-medium', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, lineHeight: 16 },
};

const baseTheme = {
  roundness: 12,
  animation: {
    scale: 1.0,
    defaultAnimationDuration: 300,
  },
};

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  ...baseTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Brand colors - Professional financial app palette
    primary: '#0F766E',           // Teal 700 - Trust, stability
    onPrimary: '#FFFFFF',
    primaryContainer: '#CCFBF1',
    onPrimaryContainer: '#042F2E',
    
    secondary: '#0369A1',         // Sky 700
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E0F2FE',
    onSecondaryContainer: '#082F49',
    
    tertiary: '#7C3AED',          // Violet 600
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#EDE9FE',
    onTertiaryContainer: '#2E1065',
    
    // Semantic colors
    success: '#10B981',           // Emerald 500
    warning: '#F59E0B',           // Amber 500
    error: '#EF4444',             // Red 500
    info: '#3B82F6',              // Blue 500
    
    // Income/Expense specific
    income: '#10B981',
    expense: '#EF4444',
    tax: '#8B5CF6',
    
    // Chart colors
    chartPrimary: '#0F766E',
    chartSecondary: '#0369A1',
    chartTertiary: '#7C3AED',
    chartQuaternary: '#F59E0B',
    chartQuinary: '#EF4444',
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  ...baseTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Brand colors - Dark mode
    primary: '#5EEAD4',
    onPrimary: '#042F2E',
    primaryContainer: '#115E59',
    onPrimaryContainer: '#CCFBF1',
    
    secondary: '#7DD3FC',
    onSecondary: '#082F49',
    secondaryContainer: '#075985',
    onSecondaryContainer: '#E0F2FE',
    
    tertiary: '#C4B5FD',
    onTertiary: '#2E1065',
    tertiaryContainer: '#6D28D9',
    onTertiaryContainer: '#EDE9FE',
    
    // Semantic colors
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    // Income/Expense specific
    income: '#34D399',
    expense: '#F87171',
    tax: '#A78BFA',
    
    // Chart colors
    chartPrimary: '#5EEAD4',
    chartSecondary: '#7DD3FC',
    chartTertiary: '#C4B5FD',
    chartQuaternary: '#FBBF24',
    chartQuinary: '#F87171',
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};
```

### 5.2 Screen Designs

#### Dashboard Screen
```typescript
// Key components and layout

interface DashboardStats {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  ytdIncome: number;
  ytdExpense: number;
  estimatedTax: number;
  taxProgress: number; // Percentage of year
}

// Layout Structure:
// 1. Header with greeting and total balance
// 2. Period selector (Month/Year toggle)
// 3. Summary cards (Income | Expense | Balance)
// 4. Expense breakdown chart (Pie/Donut)
// 5. Income vs Expense trend (Line/Bar chart)
// 6. Tax summary card with progress
// 7. Recent transactions list (last 5)
// 8. FAB for quick add
```

#### Transaction List Screen
```typescript
// Features:
// - Grouped by date (Today, Yesterday, This Week, Earlier)
// - Filter by type (All, Income, Expense)
// - Filter by category
// - Search functionality
// - Swipe actions (Edit, Delete)
// - Pull to refresh
```

#### Tax Calculator Screen
```typescript
// Sections:
// 1. Income sources (Section 40 types)
// 2. Expense deductions per income type
// 3. Personal allowances
// 4. Investment deductions
// 5. Calculation results preview
// 6. Detailed breakdown modal
```

#### Receipt Scanner Screen
```typescript
// Flow:
// 1. Camera preview with overlay guide
// 2. Capture with auto-focus
// 3. Processing indicator
// 4. OCR results review
// 5. Manual correction if needed
// 6. Save to transactions
```

---

## 6. Security & Privacy Implementation

### 6.1 Encryption Architecture

```typescript
// utils/encryption.ts

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_ID = 'taxify_db_key';

export class EncryptionService {
  async initializeEncryption(): Promise<void> {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    if (!key) {
      key = await this.generateKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
    }
    
    // Set SQLCipher key
    await db.execAsync(`PRAGMA key = '${key}'`);
  }

  private async generateKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(randomBytes).toString('hex');
  }

  async encryptField(plaintext: string): Promise<string> {
    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    // Use AES encryption
    // Implementation using expo-crypto or native module
    return encrypted;
  }

  async decryptField(ciphertext: string): Promise<string> {
    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    // Decrypt
    return plaintext;
  }
}
```

### 6.2 Secure Database Configuration

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "expo-sqlite",
        {
          "useSQLCipher": true,
          "enableFTS": true,
          "android": {
            "enableFTS": false
          }
        }
      ],
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow Taxify to use Face ID to unlock your encrypted data"
        }
      ]
    ]
  }
}
```

### 6.3 Privacy Features

1. **Biometric Authentication**: Optional Face ID / Fingerprint to open app
2. **Auto-lock**: App locks after period of inactivity
3. **Screenshot protection**: Flag to prevent screenshots on sensitive screens
4. **Data export**: Local-only export to encrypted JSON or CSV
5. **Data purge**: Secure deletion with confirmation

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure and navigation
- [ ] Configure react-native-paper theming (light/dark)
- [ ] Set up SQLite with Drizzle ORM
- [ ] Implement database schema and migrations
- [ ] Create base UI components

### Phase 2: Core Features (Week 3-4)
- [ ] Transaction CRUD operations
- [ ] Category management
- [ ] Dashboard with summary cards
- [ ] Transaction list with filtering
- [ ] Add transaction form (manual entry)

### Phase 3: Tax Engine (Week 5-6)
- [ ] Implement Section 40 income classification
- [ ] Tax calculation engine
- [ ] Deduction and allowance management
- [ ] Tax dashboard and projections
- [ ] Penalty calculator

### Phase 4: Receipt Scanning (Week 7)
- [ ] Camera integration
- [ ] OCR implementation
- [ ] Receipt parsing logic
- [ ] Review and edit OCR results

### Phase 5: Data Visualization (Week 8)
- [ ] Chart components integration
- [ ] Expense breakdown charts
- [ ] Income vs expense trends
- [ ] Tax projection visualization

### Phase 6: Security & Polish (Week 9)
- [ ] Database encryption setup
- [ ] Biometric authentication
- [ ] Data export functionality
- [ ] App settings and preferences
- [ ] Final UI polish and animations

### Phase 7: Testing & Launch (Week 10)
- [ ] Unit tests for tax calculations
- [ ] Integration tests
- [ ] User acceptance testing
- [ ] App store preparation

---

## 8. Dependencies to Install

```bash
# Core dependencies already installed:
# - expo, react-native, react-native-paper, expo-router

# Database & ORM
bunx expo install expo-sqlite drizzle-orm
bun add -d drizzle-kit

# Charts
bunx expo install react-native-gifted-charts expo-linear-gradient react-native-svg

# Camera & OCR
bunx expo install expo-camera expo-mlkit-ocr expo-image-manipulator

# Security
bunx expo install expo-secure-store expo-crypto

# State Management
bun add zustand

# Utilities
bun add date-fns uuid
bun add -d @types/uuid

# Navigation helpers
bunx expo install @react-navigation/native

# Additional Expo modules
bunx expo install expo-haptics expo-localization
```

---

## 9. File Structure Changes

### New Files to Create

```
app/
├── _layout.tsx (modify for PaperProvider)
├── (app)/
│   ├── _layout.tsx (tab navigation)
│   ├── dashboard.tsx
│   ├── transactions/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── [id].tsx
│   │   └── new.tsx
│   ├── scan/
│   │   └── index.tsx
│   ├── tax/
│   │   ├── index.tsx
│   │   └── calculator.tsx
│   └── settings/
│       └── index.tsx

database/
├── schema.ts
├── db.ts
├── migrations/
│   └── 0000_initial.sql
└── repositories/
    ├── transaction.repo.ts
    ├── category.repo.ts
    └── settings.repo.ts

services/
├── tax/
│   ├── calculator.ts
│   ├── section40.ts
│   ├── deductions.ts
│   └── penalties.ts
└── receipt/
    ├── ocr.service.ts
    └── parser.service.ts

stores/
├── theme.store.ts
└── transaction.store.ts

hooks/
├── use-theme.ts
├── use-database.ts
└── use-tax-calculator.ts

theme/
├── colors.ts
├── fonts.ts
└── index.ts

types/
├── database.ts
├── tax.ts
└── transaction.ts

constants/
├── categories.ts
├── tax-rates.ts
└── deductions.ts
```

---

## 10. Testing Strategy

### Unit Tests
```typescript
// Tax calculation tests
describe('TaxCalculator', () => {
  it('should calculate tax for 500,000 THB income correctly', () => {
    // Test case based on Thai tax brackets
  });
  
  it('should apply alternative minimum tax when applicable', () => {
    // Test AMT calculation
  });
  
  it('should calculate penalties correctly for late filing', () => {
    // Test penalty scenarios
  });
});
```

### Integration Tests
- Database CRUD operations
- OCR pipeline
- Tax calculation end-to-end

### Manual Testing Checklist
- [ ] Theme switching works correctly
- [ ] All chart types render properly
- [ ] Camera and OCR on real device
- [ ] Database encryption verified
- [ ] Tax calculations match Revenue Dept examples

---

## 11. Appendix

### A. Thai Tax Reference Tables

#### Personal Allowances (2024)
| Allowance Type | Amount (THB) |
|----------------|--------------|
| Personal | 60,000 |
| Spouse | 60,000 |
| Child (per child) | 30,000 |
| Parent (per person) | 30,000 |
| Disability | 60,000 |

#### Deduction Limits
| Deduction Type | Limit (THB) |
|----------------|-------------|
| Life Insurance | 100,000 |
| Health Insurance | 25,000 |
| Pension Insurance | 200,000 |
| RMF | 500,000 |
| SSF | 200,000 |
| Home Loan Interest | 100,000 |
| Donation | 10% of net income |

### B. Statute of Limitations Reference
- **Normal filing**: 2-5 years audit period
- **Non-filing/Fraud**: 10 years (Civil Code Section 193/31)

---

*This plan provides a comprehensive roadmap for building Taxify. Each phase builds upon the previous, ensuring a solid foundation before adding advanced features. The architecture prioritizes privacy, accuracy, and usability.*
