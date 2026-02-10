import { generateStructuredContent, Type, GEMINI_MODELS } from './gemini.client';
import type { 
  TaxOptimizationSuggestion, 
  TaxOptimizationReport,
  DeductionGap,
  ScenarioComparison 
} from '@/types/ai';
import { calculateTax, calculateProgressiveTax } from '@/services/tax/calculator';
import { TAX_BRACKETS_2024, DEDUCTION_LIMITS } from '@/constants/tax';
import { Section40Type, type TaxDeductions } from '@/types';
import * as TransactionRepo from '@/database/repositories/transaction.repo';

const OPTIMIZATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { 
            type: Type.STRING,
            enum: ['additional_deduction', 'investment_opportunity', 'income_timing', 'bracket_optimization', 'missing_document'],
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          potentialSaving: { type: Type.NUMBER },
          difficulty: { 
            type: Type.STRING,
            enum: ['easy', 'medium', 'hard'],
          },
          actionRequired: { type: Type.STRING },
          priority: { 
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
          },
        },
        required: ['type', 'title', 'description', 'potentialSaving', 'difficulty', 'actionRequired', 'priority'],
      },
    },
    totalPotentialSavings: { type: Type.NUMBER },
  },
  required: ['suggestions', 'totalPotentialSavings'],
};

const DEDUCTION_INFO = {
  personalAllowance: { max: 60000, description: 'Personal allowance (fixed)' },
  spouseAllowance: { max: 60000, description: 'Spouse allowance (if non-income spouse)' },
  childAllowance: { max: 30000, per: 'child', description: 'Child allowance (30,000 per child)' },
  parentAllowance: { max: 30000, per: 'parent', description: 'Parent allowance (30,000 per parent, max 4)' },
  disabilityAllowance: { max: 60000, description: 'Disability allowance' },
  lifeInsurance: { max: 100000, description: 'Life insurance premium' },
  healthInsurance: { max: 25000, description: 'Health insurance premium (self)' },
  parentHealthInsurance: { max: 15000, description: 'Parent health insurance' },
  pensionInsurance: { max: 200000, description: 'Pension life insurance' },
  rmf: { max: 500000, percentOfIncome: 30, description: 'RMF (30% of income, max 500K)' },
  ssf: { max: 200000, percentOfIncome: 30, description: 'SSF (30% of income, max 200K)' },
  socialSecurity: { max: 9000, description: 'Social security contributions' },
  homeLoanInterest: { max: 100000, description: 'Home loan interest' },
  donation: { maxPercentOfIncome: 10, description: 'Donations (10% of income after deductions)' },
  educationDonation: { maxPercentOfIncome: 10, description: 'Education donations (2x deduction)' },
};

export async function generateTaxOptimizationReport(
  taxYear: number,
  currentDeductions: Partial<TaxDeductions>,
  totalIncome: number,
  incomeBySection40: Record<number, number>
): Promise<TaxOptimizationReport> {
  try {
    // Calculate current tax situation
    const incomes = Object.entries(incomeBySection40)
      .filter(([, amount]) => amount > 0)
      .map(([type, amount]) => ({
        section40Type: parseInt(type) as Section40Type,
        amount,
        expenseDeduction: 'standard' as const,
      }));

    const fullDeductions: TaxDeductions = {
      personalAllowance: currentDeductions.personalAllowance ?? 60000,
      spouseAllowance: currentDeductions.spouseAllowance ?? 0,
      childAllowance: currentDeductions.childAllowance ?? 0,
      parentAllowance: currentDeductions.parentAllowance ?? 0,
      disabilityAllowance: currentDeductions.disabilityAllowance ?? 0,
      lifeInsurance: currentDeductions.lifeInsurance ?? 0,
      healthInsurance: currentDeductions.healthInsurance ?? 0,
      pensionInsurance: currentDeductions.pensionInsurance ?? 0,
      rmf: currentDeductions.rmf ?? 0,
      ssf: currentDeductions.ssf ?? 0,
      socialSecurity: currentDeductions.socialSecurity ?? 0,
      homeLoanInterest: currentDeductions.homeLoanInterest ?? 0,
      donation: currentDeductions.donation ?? 0,
    };

    const taxResult = calculateTax({
      taxYear,
      incomes,
      deductions: fullDeductions,
    });

    // Find current bracket
    const currentBracketIndex = findCurrentBracket(taxResult.taxableIncome);
    const currentBracket = TAX_BRACKETS_2024[currentBracketIndex];
    const nextBracket = TAX_BRACKETS_2024[currentBracketIndex + 1];

    // Calculate deduction gaps
    const deductionGaps = calculateDeductionGaps(fullDeductions, totalIncome);

    // Generate AI suggestions
    const suggestions = await generateOptimizationSuggestions({
      taxYear,
      currentTaxableIncome: taxResult.taxableIncome,
      currentTaxAmount: taxResult.finalTaxDue,
      effectiveTaxRate: taxResult.effectiveTaxRate,
      currentDeductions: fullDeductions,
      deductionGaps,
      totalIncome,
      incomeBySection40,
      currentBracket,
      nextBracket,
    });

    const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.potentialSaving, 0);

    return {
      taxYear,
      currentTaxableIncome: taxResult.taxableIncome,
      currentTaxAmount: taxResult.finalTaxDue,
      effectiveTaxRate: taxResult.effectiveTaxRate,
      currentBracketIndex,
      nextBracketThreshold: nextBracket?.minIncome || null,
      amountToNextBracket: nextBracket ? nextBracket.minIncome - taxResult.taxableIncome : null,
      suggestions,
      totalPotentialSavings,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Tax optimization error:', error);
    throw error;
  }
}

async function generateOptimizationSuggestions(context: {
  taxYear: number;
  currentTaxableIncome: number;
  currentTaxAmount: number;
  effectiveTaxRate: number;
  currentDeductions: TaxDeductions;
  deductionGaps: DeductionGap[];
  totalIncome: number;
  incomeBySection40: Record<number, number>;
  currentBracket: typeof TAX_BRACKETS_2024[0];
  nextBracket: typeof TAX_BRACKETS_2024[0] | undefined;
}): Promise<TaxOptimizationSuggestion[]> {
  const prompt = `You are a Thai tax optimization expert. Analyze this tax situation and suggest optimization strategies.

Taxpayer Situation (Tax Year ${context.taxYear}):
- Total Income: ${context.totalIncome.toLocaleString()} THB
- Taxable Income: ${context.currentTaxableIncome.toLocaleString()} THB
- Current Tax: ${context.currentTaxAmount.toLocaleString()} THB
- Effective Tax Rate: ${(context.effectiveTaxRate * 100).toFixed(2)}%
- Current Tax Bracket: ${(context.currentBracket.rate * 100).toFixed(0)}%
${context.nextBracket ? `- Next Bracket: ${(context.nextBracket.rate * 100).toFixed(0)}% (at ${context.nextBracket.minIncome.toLocaleString()} THB)` : ''}

Current Deductions:
${JSON.stringify(context.currentDeductions, null, 2)}

Available Deduction Room:
${JSON.stringify(context.deductionGaps.filter(g => g.remainingAllowance > 1000).map(g => ({
  type: g.deductionType,
  current: g.currentAmount,
  max: g.maxAllowed,
  room: g.remainingAllowance,
})), null, 2)}

Income Breakdown by Section 40:
${JSON.stringify(context.incomeBySection40, null, 2)}

Thai Tax Brackets (2024):
- 0-150K: 0%
- 150K-300K: 5%
- 300K-500K: 10%
- 500K-750K: 15%
- 750K-1M: 20%
- 1M-2M: 25%
- 2M-5M: 30%
- 5M+: 35%

Generate 3-6 specific, actionable optimization suggestions. Consider:
1. Unused deduction allowances (easy wins)
2. Investment opportunities (RMF, SSF)
3. Tax bracket optimization
4. Missing deductions user might qualify for
5. Document requirements

For each suggestion, calculate the approximate tax savings based on the current tax bracket rate.

Difficulty levels:
- easy: Simple actions like buying more insurance or making donations
- medium: Requires some planning like RMF/SSF investments
- hard: Complex strategies or requires significant changes

Priority:
- high: Immediate action needed, high savings potential
- medium: Good opportunity, moderate effort
- low: Nice to have, minimal impact

Respond with JSON matching the schema.`;

  const response = await generateStructuredContent<{
    suggestions: Array<Omit<TaxOptimizationSuggestion, 'id'>>;
    totalPotentialSavings: number;
  }>(prompt, OPTIMIZATION_SCHEMA, {
    model: GEMINI_MODELS.PRO,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  if (response.error || !response.data) {
    // Fallback to rule-based suggestions
    return generateFallbackSuggestions(context);
  }

  // Add IDs to suggestions
  return response.data.suggestions.map(s => ({
    ...s,
    id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    deadline: getDeadlineForSuggestion(s.type),
  }));
}

function generateFallbackSuggestions(context: {
  currentDeductions: TaxDeductions;
  deductionGaps: DeductionGap[];
  currentBracket: typeof TAX_BRACKETS_2024[0];
}): TaxOptimizationSuggestion[] {
  const suggestions: TaxOptimizationSuggestion[] = [];

  // Check for unused RMF/SSF allowance
  const rmfGap = context.deductionGaps.find(g => g.deductionType === 'rmf');
  if (rmfGap && rmfGap.remainingAllowance > 10000) {
    const saving = rmfGap.remainingAllowance * context.currentBracket.rate;
    suggestions.push({
      id: generateSuggestionId(),
      type: 'investment_opportunity',
      title: 'RMF Investment Opportunity',
      description: `You can invest up to ${rmfGap.remainingAllowance.toLocaleString()} THB more in RMF to reduce your taxable income.`,
      potentialSaving: saving,
      difficulty: 'medium',
      actionRequired: 'Purchase RMF units before December 31st',
      priority: saving > 5000 ? 'high' : 'medium',
    });
  }

  // Check for unused SSF allowance
  const ssfGap = context.deductionGaps.find(g => g.deductionType === 'ssf');
  if (ssfGap && ssfGap.remainingAllowance > 10000) {
    const saving = ssfGap.remainingAllowance * context.currentBracket.rate;
    suggestions.push({
      id: generateSuggestionId(),
      type: 'investment_opportunity',
      title: 'SSF Investment Opportunity',
      description: `You can invest up to ${ssfGap.remainingAllowance.toLocaleString()} THB more in SSF for additional tax savings.`,
      potentialSaving: saving,
      difficulty: 'medium',
      actionRequired: 'Purchase SSF units before December 31st',
      priority: saving > 3000 ? 'high' : 'medium',
    });
  }

  // Check for insurance gaps
  const lifeInsuranceGap = context.deductionGaps.find(g => g.deductionType === 'lifeInsurance');
  if (lifeInsuranceGap && lifeInsuranceGap.remainingAllowance > 5000) {
    const saving = Math.min(lifeInsuranceGap.remainingAllowance, 100000) * context.currentBracket.rate;
    suggestions.push({
      id: generateSuggestionId(),
      type: 'additional_deduction',
      title: 'Life Insurance Deduction',
      description: `You have ${lifeInsuranceGap.remainingAllowance.toLocaleString()} THB remaining allowance for life insurance premiums.`,
      potentialSaving: saving,
      difficulty: 'easy',
      actionRequired: 'Ensure life insurance premiums are paid and documented',
      priority: 'medium',
    });
  }

  return suggestions;
}

function calculateDeductionGaps(
  current: TaxDeductions,
  totalIncome: number
): DeductionGap[] {
  const gaps: DeductionGap[] = [];

  // RMF: 30% of income or 500K, whichever is lower
  const rmfMax = Math.min(totalIncome * 0.3, DEDUCTION_LIMITS.RMF_MAX);
  gaps.push({
    deductionType: 'RMF',
    currentAmount: current.rmf,
    maxAllowed: rmfMax,
    remainingAllowance: Math.max(0, rmfMax - current.rmf),
    potentialSaving: Math.max(0, rmfMax - current.rmf) * 0.2, // Approximate at 20% bracket
  });

  // SSF: 30% of income or 200K
  const ssfMax = Math.min(totalIncome * 0.3, DEDUCTION_LIMITS.SSF_MAX);
  gaps.push({
    deductionType: 'SSF',
    currentAmount: current.ssf,
    maxAllowed: ssfMax,
    remainingAllowance: Math.max(0, ssfMax - current.ssf),
    potentialSaving: Math.max(0, ssfMax - current.ssf) * 0.2,
  });

  // Life insurance: max 100K
  gaps.push({
    deductionType: 'Life Insurance',
    currentAmount: current.lifeInsurance,
    maxAllowed: DEDUCTION_LIMITS.LIFE_INSURANCE_MAX,
    remainingAllowance: Math.max(0, DEDUCTION_LIMITS.LIFE_INSURANCE_MAX - current.lifeInsurance),
    potentialSaving: Math.max(0, DEDUCTION_LIMITS.LIFE_INSURANCE_MAX - current.lifeInsurance) * 0.2,
  });

  // Health insurance: max 25K
  gaps.push({
    deductionType: 'Health Insurance',
    currentAmount: current.healthInsurance,
    maxAllowed: DEDUCTION_LIMITS.HEALTH_INSURANCE_MAX,
    remainingAllowance: Math.max(0, DEDUCTION_LIMITS.HEALTH_INSURANCE_MAX - current.healthInsurance),
    potentialSaving: Math.max(0, DEDUCTION_LIMITS.HEALTH_INSURANCE_MAX - current.healthInsurance) * 0.2,
  });

  // Home loan interest: max 100K
  gaps.push({
    deductionType: 'Home Loan Interest',
    currentAmount: current.homeLoanInterest,
    maxAllowed: DEDUCTION_LIMITS.HOME_LOAN_INTEREST_MAX,
    remainingAllowance: Math.max(0, DEDUCTION_LIMITS.HOME_LOAN_INTEREST_MAX - current.homeLoanInterest),
    potentialSaving: Math.max(0, DEDUCTION_LIMITS.HOME_LOAN_INTEREST_MAX - current.homeLoanInterest) * 0.2,
  });

  return gaps;
}

function findCurrentBracket(taxableIncome: number): number {
  for (let i = 0; i < TAX_BRACKETS_2024.length; i++) {
    if (taxableIncome <= TAX_BRACKETS_2024[i].maxIncome) {
      return i;
    }
  }
  return TAX_BRACKETS_2024.length - 1;
}

export async function compareTaxScenarios(
  baseScenario: {
    taxYear: number;
    totalIncome: number;
    deductions: TaxDeductions;
    incomeBySection40: Record<number, number>;
  },
  alternativeScenarios: Array<{
    name: string;
    deductionChanges: Partial<TaxDeductions>;
    incomeChanges?: Partial<Record<number, number>>;
  }>
): Promise<ScenarioComparison[]> {
  const baseTax = calculateTax({
    taxYear: baseScenario.taxYear,
    incomes: Object.entries(baseScenario.incomeBySection40)
      .filter(([, amount]) => amount > 0)
      .map(([type, amount]) => ({
        section40Type: parseInt(type) as Section40Type,
        amount,
        expenseDeduction: 'standard' as const,
      })),
    deductions: baseScenario.deductions,
  });

  const comparisons: ScenarioComparison[] = [];

  for (const scenario of alternativeScenarios) {
    const newDeductions = { ...baseScenario.deductions, ...scenario.deductionChanges };
    const newIncomeBySection40 = scenario.incomeChanges
      ? { ...baseScenario.incomeBySection40, ...scenario.incomeChanges }
      : baseScenario.incomeBySection40;

    const newTax = calculateTax({
      taxYear: baseScenario.taxYear,
      incomes: Object.entries(newIncomeBySection40)
        .filter(([, amount]) => amount && amount > 0)
        .map(([type, amount]) => ({
          section40Type: parseInt(type) as Section40Type,
          amount: amount || 0,
          expenseDeduction: 'standard' as const,
        })),
      deductions: newDeductions,
    });

    const changes: string[] = [];
    for (const [key, value] of Object.entries(scenario.deductionChanges)) {
      if (value && value > 0) {
        changes.push(`Increase ${key} by ${value.toLocaleString()} THB`);
      }
    }

    comparisons.push({
      scenarioName: scenario.name,
      changes,
      projectedTaxableIncome: newTax.taxableIncome,
      projectedTaxAmount: newTax.finalTaxDue,
      savingsVsCurrent: baseTax.finalTaxDue - newTax.finalTaxDue,
    });
  }

  return comparisons.sort((a, b) => b.savingsVsCurrent - a.savingsVsCurrent);
}

function getDeadlineForSuggestion(type: TaxOptimizationSuggestion['type']): Date | undefined {
  const now = new Date();
  const year = now.getMonth() > 3 ? now.getFullYear() : now.getFullYear() - 1;
  
  switch (type) {
    case 'investment_opportunity':
      // RMF/SSF must be purchased by Dec 31
      return new Date(year, 11, 31);
    case 'additional_deduction':
      // Most deductions apply to calendar year
      return new Date(year, 11, 31);
    case 'missing_document':
      // Documents needed for tax filing (March-April)
      return new Date(year + 1, 2, 31);
    default:
      return undefined;
  }
}

function generateSuggestionId(): string {
  return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function checkMissingDocuments(
  taxYear: number,
  incomeBySection40: Record<number, number>
): Promise<Array<{
  documentType: string;
  description: string;
  required: boolean;
  estimatedCount: number;
}>> {
  const documents: Array<{
    documentType: string;
    description: string;
    required: boolean;
    estimatedCount: number;
  }> = [];

  // Check for withholding certificates (50 Tawi)
  if (incomeBySection40[Section40Type.SALARY] > 0) {
    documents.push({
      documentType: 'Withholding Certificate (50 Tawi)',
      description: 'From employer for salary income',
      required: true,
      estimatedCount: 1,
    });
  }

  // Check for investment statements
  const hasInvestments = await TransactionRepo.getTransactionsByDateRange(
    new Date(taxYear, 0, 1),
    new Date(taxYear, 11, 31),
    'expense'
  );
  
  const investmentCategories = ['RMF', 'SSF', 'Insurance', 'Insurance Premium'];
  const investmentTx = hasInvestments.filter(t => 
    investmentCategories.some(cat => 
      t.description?.toLowerCase().includes(cat.toLowerCase())
    )
  );

  if (investmentTx.length > 0) {
    documents.push({
      documentType: 'Investment Statements',
      description: 'RMF, SSF, and insurance premium certificates',
      required: true,
      estimatedCount: investmentTx.length,
    });
  }

  // Check for donation receipts
  const donationTx = hasInvestments.filter(t => 
    t.description?.toLowerCase().includes('donation') || 
    t.isTaxDeductible
  );
  
  if (donationTx.length > 0) {
    documents.push({
      documentType: 'Donation Receipts',
      description: 'Receipts for tax-deductible donations',
      required: false,
      estimatedCount: donationTx.length,
    });
  }

  return documents;
}
