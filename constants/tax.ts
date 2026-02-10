import type { TaxBracket, Section40Rule } from '@/types';
import { Section40Type } from '@/types';

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

export const SECTION_40_RULES: Record<Section40Type, Section40Rule> = {
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
      percentage: 30,
    },
    canChooseActualExpense: true,
    specialRules: '30% for buildings, 20% agricultural land, 15% other land, 30% vehicles',
  },
  [Section40Type.PROFESSIONAL]: {
    name: 'Professional Services',
    nameTh: 'วิชาชีพอิสระ',
    defaultExpenseDeduction: { 
      type: 'percentage', 
      percentage: 30,
    },
    canChooseActualExpense: true,
    specialRules: '60% for medical professionals',
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

export const DEDUCTION_LIMITS = {
  PERSONAL_ALLOWANCE: 60000,
  SPOUSE_ALLOWANCE: 60000,
  CHILD_ALLOWANCE_PER_CHILD: 30000,
  PARENT_ALLOWANCE_PER_PARENT: 30000,
  DISABILITY_ALLOWANCE: 60000,
  LIFE_INSURANCE_MAX: 100000,
  HEALTH_INSURANCE_MAX: 25000,
  PENSION_INSURANCE_MAX: 200000,
  RMF_MAX: 500000,
  SSF_MAX: 200000,
  RMF_SSF_PENSION_COMBINED_MAX: 500000,
  SOCIAL_SECURITY_MAX: 9000,
  HOME_LOAN_INTEREST_MAX: 100000,
  DONATION_MAX_PERCENTAGE: 0.10, // 10% of income after expenses
  SALARY_SERVICE_MAX_EXPENSE: 100000,
};

export const PENALTY_RATES = {
  SURCHARGE_RATE: 0.015,
  SURCHARGE_MAX_MULTIPLIER: 1.0,
  LATE_FILING_FINE_LOW: 100,
  LATE_FILING_FINE_HIGH: 200,
  VOLUNTARY_15_DAYS: 0.02,
  VOLUNTARY_30_DAYS: 0.05,
  VOLUNTARY_60_DAYS: 0.10,
  VOLUNTARY_OVER_60_DAYS: 0.20,
  NON_FILING_PENALTY: 2.0, // 200%
  INACCURATE_FILING_PENALTY: 1.0, // 100%
};

export const ALTERNATIVE_TAX = {
  RATE: 0.005,
  MIN_INCOME_THRESHOLD: 1000000,
  EXEMPT_MAX: 5000,
};

export const TAX_YEAR_CONFIG = {
  START_MONTH: 0, // January
  END_MONTH: 11, // December
  PND91_DEADLINE_MONTH: 2, // March
  PND91_DEADLINE_DAY: 31,
  
  PND90_DEADLINE_MONTH: 2, // March
  PND90_DEADLINE_DAY: 31,
  EXTENSION_DEADLINE_MONTH: 5, // June
  EXTENSION_DEADLINE_DAY: 30,
};

export function getSection40Name(type: Section40Type, language: 'th' | 'en' = 'en'): string {
  const rule = SECTION_40_RULES[type];
  return language === 'th' ? rule.nameTh : rule.name;
}

export function getSection40Types(): Section40Type[] {
  return [
    Section40Type.SALARY,
    Section40Type.SERVICE,
    Section40Type.INTELLECTUAL,
    Section40Type.PASSIVE,
    Section40Type.RENTAL,
    Section40Type.PROFESSIONAL,
    Section40Type.CONTRACT,
    Section40Type.BUSINESS,
  ];
}

export function isIncomeType(type: Section40Type): boolean {
  return Object.values(Section40Type).includes(type);
}
