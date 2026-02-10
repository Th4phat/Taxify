import type { 
  TaxCalculationInput, 
  TaxCalculationResult, 
  PenaltyCalculation, 
  PenaltyScenario 
} from '@/types';
import { Section40Type } from '@/types';
import { 
  TAX_BRACKETS_2024, 
  SECTION_40_RULES, 
  DEDUCTION_LIMITS, 
  PENALTY_RATES,
  ALTERNATIVE_TAX 
} from '@/constants/tax';

export function calculateProgressiveTax(netIncome: number): number {
  for (const bracket of TAX_BRACKETS_2024) {
    if (netIncome <= bracket.maxIncome) {
      const taxableInBracket = netIncome - bracket.minIncome;
      return bracket.baseTax + (taxableInBracket * bracket.rate);
    }
  }
  return 0;
}

export function calculateAlternativeTax(grossIncomeTypes2to8: number): number {
  // Only applies if income from types 2-8 >= 1,000,000 THB
  if (grossIncomeTypes2to8 < ALTERNATIVE_TAX.MIN_INCOME_THRESHOLD) {
    return 0;
  }
  
  const tax = grossIncomeTypes2to8 * ALTERNATIVE_TAX.RATE;
  
  // Exempt if <= 5,000 THB
  if (tax <= ALTERNATIVE_TAX.EXEMPT_MAX) {
    return 0;
  }
  
  return tax;
}

function calculateExpenseDeduction(
  section40Type: Section40Type,
  amount: number,
  expenseDeductionType: 'standard' | 'actual',
  actualExpenses?: number
): number {
  const rule = SECTION_40_RULES[section40Type];
  
  if (expenseDeductionType === 'actual' && rule.canChooseActualExpense && actualExpenses !== undefined) {
    return actualExpenses;
  }
  
  const deduction = rule.defaultExpenseDeduction;
  
  if (deduction.type === 'percentage' && deduction.percentage !== undefined) {
    const calculatedDeduction = amount * (deduction.percentage / 100);
    
    if (deduction.maxAmount !== undefined) {
      return Math.min(calculatedDeduction, deduction.maxAmount);
    }
    
    return calculatedDeduction;
  }
  
  if (deduction.type === 'fixed' && deduction.actualAmount !== undefined) {
    return deduction.actualAmount;
  }
  
  return 0;
}

function calculateAllowances(deductions: TaxCalculationInput['deductions']): number {
  return (
    deductions.personalAllowance +
    deductions.spouseAllowance +
    deductions.childAllowance +
    deductions.parentAllowance +
    deductions.disabilityAllowance
  );
}

function calculateInvestmentDeductions(deductions: TaxCalculationInput['deductions']): number {
  const lifeInsuranceDeduction = Math.min(deductions.lifeInsurance, DEDUCTION_LIMITS.LIFE_INSURANCE_MAX);
  const healthInsuranceDeduction = Math.min(deductions.healthInsurance, DEDUCTION_LIMITS.HEALTH_INSURANCE_MAX);
  const pensionInsuranceDeduction = Math.min(deductions.pensionInsurance, DEDUCTION_LIMITS.PENSION_INSURANCE_MAX);
  const rmfDeduction = Math.min(deductions.rmf, DEDUCTION_LIMITS.RMF_MAX);
  const ssfDeduction = Math.min(deductions.ssf, DEDUCTION_LIMITS.SSF_MAX);
  
  const retirementTotal = rmfDeduction + ssfDeduction + pensionInsuranceDeduction;
  const retirementDeduction = Math.min(retirementTotal, DEDUCTION_LIMITS.RMF_SSF_PENSION_COMBINED_MAX);
  
  const socialSecurityDeduction = Math.min(deductions.socialSecurity, DEDUCTION_LIMITS.SOCIAL_SECURITY_MAX);
  const homeLoanDeduction = Math.min(deductions.homeLoanInterest, DEDUCTION_LIMITS.HOME_LOAN_INTEREST_MAX);
  

  
  return (
    lifeInsuranceDeduction +
    healthInsuranceDeduction +
    retirementDeduction +
    socialSecurityDeduction +
    homeLoanDeduction
  );
}

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const incomeBySection40: Record<Section40Type, number> = {
    [Section40Type.SALARY]: 0,
    [Section40Type.SERVICE]: 0,
    [Section40Type.INTELLECTUAL]: 0,
    [Section40Type.PASSIVE]: 0,
    [Section40Type.RENTAL]: 0,
    [Section40Type.PROFESSIONAL]: 0,
    [Section40Type.CONTRACT]: 0,
    [Section40Type.BUSINESS]: 0,
  };
  
  let totalExpenseDeduction = 0;
  
  for (const income of input.incomes) {
    incomeBySection40[income.section40Type] += income.amount;
    
    const deduction = calculateExpenseDeduction(
      income.section40Type,
      income.amount,
      income.expenseDeduction,
      income.actualExpenses
    );
    
    totalExpenseDeduction += deduction;
  }
  
  const totalGrossIncome = input.incomes.reduce((sum, i) => sum + i.amount, 0);
  const netIncome = totalGrossIncome - totalExpenseDeduction;
  
  const totalAllowances = calculateAllowances(input.deductions);
  const totalInvestments = calculateInvestmentDeductions(input.deductions);
  
  const incomeAfterAllowances = Math.max(0, netIncome - totalAllowances);
  const maxDonation = incomeAfterAllowances * DEDUCTION_LIMITS.DONATION_MAX_PERCENTAGE;
  const donationDeduction = Math.min(input.deductions.donation, maxDonation);
  
  const totalDeductions = totalAllowances + totalInvestments + donationDeduction;
  const taxableIncome = Math.max(0, netIncome - totalDeductions);
  
  const taxByProgressiveMethod = calculateProgressiveTax(taxableIncome);
  
  const incomeTypes2to8 = 
    incomeBySection40[Section40Type.SERVICE] +
    incomeBySection40[Section40Type.INTELLECTUAL] +
    incomeBySection40[Section40Type.PASSIVE] +
    incomeBySection40[Section40Type.RENTAL] +
    incomeBySection40[Section40Type.PROFESSIONAL] +
    incomeBySection40[Section40Type.CONTRACT] +
    incomeBySection40[Section40Type.BUSINESS];
  
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
    withholdingTaxCredit: input.withholdingTaxCredit || 0,
    taxPayableOrRefund: finalTaxDue - (input.withholdingTaxCredit || 0),
  };
}

export function calculatePenalties(
  taxDue: number,
  scenario: PenaltyScenario
): PenaltyCalculation {
  let surcharge = 0;
  let penalty = 0;
  let criminalFine = 0;
  
  if (taxDue > 0) {
    surcharge = Math.min(
      taxDue * PENALTY_RATES.SURCHARGE_RATE * scenario.monthsLate,
      taxDue * PENALTY_RATES.SURCHARGE_MAX_MULTIPLIER
    );
  }
  
  switch (scenario.type) {
    case 'late_filing':
      // Criminal fine only
      criminalFine = scenario.monthsLate <= 1 
        ? PENALTY_RATES.LATE_FILING_FINE_LOW 
        : PENALTY_RATES.LATE_FILING_FINE_HIGH;
      break;
      
    case 'non_filing':
      if (scenario.isVoluntary) {
        // Reduced penalty for voluntary disclosure
        if (scenario.paymentTimelineDays <= 15) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_15_DAYS;
        } else if (scenario.paymentTimelineDays <= 30) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_30_DAYS;
        } else if (scenario.paymentTimelineDays <= 60) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_60_DAYS;
        } else {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_OVER_60_DAYS;
        }
      } else {
        // Audit detection: 200%
        penalty = taxDue * PENALTY_RATES.NON_FILING_PENALTY;
      }
      break;
      
    case 'inaccurate_filing':
      if (scenario.isVoluntary) {
        // Same scale as non-filing but based on 100%
        if (scenario.paymentTimelineDays <= 15) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_15_DAYS;
        } else if (scenario.paymentTimelineDays <= 30) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_30_DAYS;
        } else if (scenario.paymentTimelineDays <= 60) {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_60_DAYS;
        } else {
          penalty = taxDue * PENALTY_RATES.VOLUNTARY_OVER_60_DAYS;
        }
      } else {
        penalty = taxDue * PENALTY_RATES.INACCURATE_FILING_PENALTY;
      }
      break;
      
    case 'voluntary_disclosure':
      // Voluntary disclosure with prompt payment
      if (scenario.paymentTimelineDays <= 15) {
        penalty = taxDue * PENALTY_RATES.VOLUNTARY_15_DAYS;
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
}

export interface WithholdingTaxSummary {
  totalWithheld: number;
  byRate: Record<number, number>; // Rate -> Amount
  bySection40: Record<number, number>; // Section 40 type -> Amount
  missingCertificates: number; // Count of transactions without certificates
}

export function calculateWithholdingTaxSummary(
  transactions: Array<{
    amount: number;
    withholdingTax: number;
    withholdingTaxRate?: number;
    section40Type?: number;
    hasWithholdingCertificate: boolean;
  }>
): WithholdingTaxSummary {
  const summary: WithholdingTaxSummary = {
    totalWithheld: 0,
    byRate: {},
    bySection40: {},
    missingCertificates: 0,
  };
  
  for (const tx of transactions) {
    if (tx.withholdingTax > 0) {
      summary.totalWithheld += tx.withholdingTax;
      
      // By rate
      const rate = tx.withholdingTaxRate || 0;
      summary.byRate[rate] = (summary.byRate[rate] || 0) + tx.withholdingTax;
      
      // By section 40 type
      const section40 = tx.section40Type || 0;
      summary.bySection40[section40] = (summary.bySection40[section40] || 0) + tx.withholdingTax;
      
      // Missing certificates
      if (!tx.hasWithholdingCertificate) {
        summary.missingCertificates++;
      }
    }
  }
  
  return summary;
}

export function estimateMonthlyTax(yearlyTaxEstimate: number, currentMonth: number): number {
  const monthsElapsed = currentMonth + 1;
  const expectedTaxToDate = (yearlyTaxEstimate / 12) * monthsElapsed;
  return expectedTaxToDate;
}

export function getTaxFilingStatus(
  estimatedTax: number,
  filingDeadline: Date,
  currentDate: Date = new Date()
): 'not_due' | 'due_soon' | 'overdue' | 'filed' {
  const daysUntilDeadline = Math.ceil(
    (filingDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (estimatedTax <= 0) {
    return 'not_due';
  }
  
  if (daysUntilDeadline < 0) {
    return 'overdue';
  }
  
  if (daysUntilDeadline <= 30) {
    return 'due_soon';
  }
  
  return 'not_due';
}
