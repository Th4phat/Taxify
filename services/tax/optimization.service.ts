import { TaxBracket } from './calculator';
import { TAX_BRACKETS_2024 } from '@/constants/tax';

export interface TaxOptimizationSuggestion {
  id: string;
  type: 'deduction' | 'investment' | 'income_timing' | 'bracket_management';
  title: string;
  titleTh: string;
  description: string;
  descriptionTh: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
  actionRequired: string;
  actionRequiredTh: string;
  deadline?: Date; // Deadline to take action
  estimatedImpact: string;
}

export interface TaxOptimizationInput {
  taxYear: number;
  taxableIncome: number;
  currentTaxAmount: number;
  
  // Current deductions being used
  currentDeductions: {
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
  
  // Income breakdown
  incomeBySection40: Record<number, number>;
  
  // Year progress (for projections)
  monthsElapsed: number;
}

export interface TaxOptimizationResult {
  currentBracket: TaxBracket;
  nextBracket?: TaxBracket;
  amountToNextBracket: number;
  effectiveTaxRate: number;
  suggestions: TaxOptimizationSuggestion[];
  totalPotentialSavings: number;
  
  // Quick stats
  unusedDeductionCapacity: {
    rmf: number;
    ssf: number;
    pensionInsurance: number;
    lifeInsurance: number;
    healthInsurance: number;
    homeLoanInterest: number;
  };
}

const DEDUCTION_LIMITS = {
  personalAllowance: 60000,
  spouseAllowance: 60000,
  childAllowancePerChild: 30000,
  parentAllowancePerParent: 30000,
  disabilityAllowance: 60000,
  lifeInsurance: 100000,
  healthInsurance: 25000,
  pensionInsurance: 200000,
  rmf: 500000,
  ssf: 200000,
  retirementCombined: 500000, // RMF + SSF + Pension combined limit
  homeLoanInterest: 100000,
  donation: 0.10, // 10% of income after deductions
  socialSecurity: 9000, // Approximate max per year
};

export class TaxOptimizationService {
  
  static analyze(input: TaxOptimizationInput): TaxOptimizationResult {
    const currentBracket = this.getCurrentBracket(input.taxableIncome);
    const nextBracket = this.getNextBracket(input.taxableIncome);
    const amountToNextBracket = nextBracket 
      ? nextBracket.minIncome - input.taxableIncome 
      : 0;
    
    const effectiveTaxRate = input.taxableIncome > 0 
      ? input.currentTaxAmount / input.taxableIncome 
      : 0;
    
    const suggestions: TaxOptimizationSuggestion[] = [];
    
    // Check for unused deduction capacity
    const unusedCapacity = this.calculateUnusedDeductionCapacity(input.currentDeductions);
    
    // Suggestion 1: Maximize retirement savings (RMF + SSF + Pension)
    const retirementSuggestion = this.getRetirementSuggestion(
      input.currentDeductions,
      input.taxableIncome,
      currentBracket.rate
    );
    if (retirementSuggestion) suggestions.push(retirementSuggestion);
    
    // Suggestion 2: Life insurance
    const lifeInsuranceSuggestion = this.getLifeInsuranceSuggestion(
      input.currentDeductions,
      input.taxableIncome,
      currentBracket.rate
    );
    if (lifeInsuranceSuggestion) suggestions.push(lifeInsuranceSuggestion);
    
    // Suggestion 3: Health insurance
    const healthInsuranceSuggestion = this.getHealthInsuranceSuggestion(
      input.currentDeductions,
      input.taxableIncome,
      currentBracket.rate
    );
    if (healthInsuranceSuggestion) suggestions.push(healthInsuranceSuggestion);
    
    // Suggestion 4: Home loan interest
    const homeLoanSuggestion = this.getHomeLoanSuggestion(
      input.currentDeductions,
      input.taxableIncome,
      currentBracket.rate
    );
    if (homeLoanSuggestion) suggestions.push(homeLoanSuggestion);
    
    // Suggestion 5: Donation strategy
    const donationSuggestion = this.getDonationSuggestion(
      input.currentDeductions,
      input.taxableIncome,
      currentBracket.rate
    );
    if (donationSuggestion) suggestions.push(donationSuggestion);
    
    // Suggestion 6: Bracket management
    if (amountToNextBracket > 0 && amountToNextBracket < 100000) {
      suggestions.push({
        id: 'bracket-warning',
        type: 'bracket_management',
        title: 'Approaching Higher Tax Bracket',
        titleTh: 'ใกล้ถึงขั้นบันไดภาษีถัดไป',
        description: `You are ${amountToNextBracket.toLocaleString()} THB away from the next tax bracket (${(nextBracket!.rate * 100).toFixed(0)}%). Consider maximizing deductions to stay in your current bracket.`,
        descriptionTh: `คุณอยู่ห่างจากขั้นบันไดภาษีถัดไป ${amountToNextBracket.toLocaleString()} บาท (${(nextBracket!.rate * 100).toFixed(0)}%) พิจารณาใช้สิทธิลดหย่อนให้เต็มที่เพื่ออยู่ในอัตราภาษีปัจจุบัน`,
        potentialSavings: (nextBracket!.rate - currentBracket.rate) * amountToNextBracket,
        priority: 'high',
        actionRequired: 'Maximize all available deductions before year-end',
        actionRequiredTh: 'ใช้สิทธิลดหย่อนทั้งหมดก่อนสิ้นปี',
        deadline: new Date(input.taxYear, 11, 31), // December 31
        estimatedImpact: `Save ${((nextBracket!.rate - currentBracket.rate) * 100).toFixed(0)}% on income near bracket threshold`,
      });
    }
    
    // Suggestion 7: Parent allowance check
    if (input.currentDeductions.parentAllowance === 0) {
      suggestions.push({
        id: 'parent-allowance',
        type: 'deduction',
        title: 'Parent Allowance Available',
        titleTh: 'สิทธิลดหย่อนบิดา-มารดา',
        description: 'You can claim 30,000 THB per parent (60,000 THB total if supporting both). Ensure you have documentation of support.',
        descriptionTh: 'คุณสามารถลดหย่อนบิดา-มารดาได้คนละ 30,000 บาท (รวม 60,000 บาท หากดูแลทั้งสองท่าน) ตรวจสอบให้มีหลักฐานการส่งเสีย',
        potentialSavings: 60000 * currentBracket.rate,
        priority: 'medium',
        actionRequired: 'Gather parent support documentation',
        actionRequiredTh: 'เตรียมหลักฐานการส่งเสียบิดา-มารดา',
        estimatedImpact: `Save up to ${(60000 * currentBracket.rate).toLocaleString()} THB`,
      });
    }
    
    // Suggestion 8: Income timing for freelancers
    if (input.incomeBySection40[2] || input.incomeBySection40[6] || input.incomeBySection40[8]) {
      const projectedIncome = this.projectAnnualIncome(input.incomeBySection40, input.monthsElapsed);
      const nextProjectedBracket = this.getNextBracket(projectedIncome);
      
      if (nextProjectedBracket && nextProjectedBracket.rate > currentBracket.rate) {
        suggestions.push({
          id: 'income-timing',
          type: 'income_timing',
          title: 'Consider Income Timing',
          titleTh: 'พิจารณาการเลื่อนรายได้',
          description: `Based on your current trajectory, you may reach the ${(nextProjectedBracket.rate * 100).toFixed(0)}% bracket. Consider deferring some income to next year if possible.`,
          descriptionTh: `จากแนวโน้มปัจจุบัน คุณอาจถึงขั้นบันไดภาษี ${(nextProjectedBracket.rate * 100).toFixed(0)}% พิจารณาเลื่อนรายได้บางส่วนไปปีหน้าหากเป็นไปได้`,
          potentialSavings: (projectedIncome - nextProjectedBracket.minIncome) * (nextProjectedBracket.rate - currentBracket.rate),
          priority: 'medium',
          actionRequired: 'Review client contracts for payment timing flexibility',
          actionRequiredTh: 'ตรวจสอบสัญญาการจ้างงานว่าสามารถเลื่อนการรับเงินได้หรือไม่',
          estimatedImpact: 'Potential significant savings depending on income amount',
        });
      }
    }
    
    // Sort by potential savings (descending)
    suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
    
    const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.potentialSavings, 0);
    
    return {
      currentBracket,
      nextBracket,
      amountToNextBracket,
      effectiveTaxRate,
      suggestions,
      totalPotentialSavings,
      unusedDeductionCapacity: unusedCapacity,
    };
  }
  
  private static getCurrentBracket(taxableIncome: number): TaxBracket {
    for (const bracket of TAX_BRACKETS_2024) {
      if (taxableIncome <= bracket.maxIncome) {
        return bracket;
      }
    }
    return TAX_BRACKETS_2024[TAX_BRACKETS_2024.length - 1];
  }
  
  private static getNextBracket(taxableIncome: number): TaxBracket | undefined {
    for (let i = 0; i < TAX_BRACKETS_2024.length - 1; i++) {
      if (taxableIncome <= TAX_BRACKETS_2024[i].maxIncome) {
        return TAX_BRACKETS_2024[i + 1];
      }
    }
    return undefined;
  }
  
  private static calculateUnusedDeductionCapacity(current: TaxOptimizationInput['currentDeductions']) {
    const retirementUsed = current.rmf + current.ssf + current.pensionInsurance;
    
    return {
      rmf: Math.max(0, DEDUCTION_LIMITS.rmf - current.rmf),
      ssf: Math.max(0, DEDUCTION_LIMITS.ssf - current.ssf),
      pensionInsurance: Math.max(0, DEDUCTION_LIMITS.pensionInsurance - current.pensionInsurance),
      lifeInsurance: Math.max(0, DEDUCTION_LIMITS.lifeInsurance - current.lifeInsurance),
      healthInsurance: Math.max(0, DEDUCTION_LIMITS.healthInsurance - current.healthInsurance),
      homeLoanInterest: Math.max(0, DEDUCTION_LIMITS.homeLoanInterest - current.homeLoanInterest),
    };
  }
  
  private static getRetirementSuggestion(
    current: TaxOptimizationInput['currentDeductions'],
    taxableIncome: number,
    taxRate: number
  ): TaxOptimizationSuggestion | null {
    const retirementUsed = current.rmf + current.ssf + current.pensionInsurance;
    const retirementRemaining = DEDUCTION_LIMITS.retirementCombined - retirementUsed;
    
    if (retirementRemaining < 10000) return null; // Less than 10k remaining, not worth suggesting
    
    const potentialSavings = Math.min(retirementRemaining, taxableIncome * 0.15) * taxRate; // Cap at 15% of income
    
    return {
      id: 'maximize-retirement',
      type: 'investment',
      title: 'Maximize Retirement Savings (RMF/SSF)',
      titleTh: 'เพิ่มการลงทุน RMF/SSF',
      description: `You can contribute up to ${retirementRemaining.toLocaleString()} THB more to RMF/SSF/Pension insurance. Total retirement deduction limit is 500,000 THB (or 15% of income, whichever is lower).`,
      descriptionTh: `คุณสามารถลงทุน RMF/SSF/ประกันบำเหน็จบำนาญเพิ่มได้อีก ${retirementRemaining.toLocaleString()} บาท โดยสามารถหักลดหย่อนได้สูงสุด 500,000 บาท หรือ 15% ของรายได้ ( whichever is lower)`,
      potentialSavings,
      priority: taxRate >= 0.20 ? 'high' : 'medium',
      actionRequired: 'Invest in RMF or SSF before year-end',
      actionRequiredTh: 'ลงทุนใน RMF หรือ SSF ก่อนสิ้นปี',
      deadline: new Date(new Date().getFullYear(), 11, 31),
      estimatedImpact: `Save approximately ${potentialSavings.toLocaleString()} THB in taxes`,
    };
  }
  
  private static getLifeInsuranceSuggestion(
    current: TaxOptimizationInput['currentDeductions'],
    taxableIncome: number,
    taxRate: number
  ): TaxOptimizationSuggestion | null {
    const remaining = DEDUCTION_LIMITS.lifeInsurance - current.lifeInsurance;
    
    if (remaining < 5000) return null;
    
    const potentialSavings = remaining * taxRate;
    
    return {
      id: 'life-insurance',
      type: 'investment',
      title: 'Life Insurance Premium',
      titleTh: 'เบี้ยประกันชีวิต',
      description: `You can claim up to ${remaining.toLocaleString()} THB more in life insurance premiums. Maximum deduction is 100,000 THB per year.`,
      descriptionTh: `คุณสามารถหักลดหย่อนเบี้ยประกันชีวิตได้อีก ${remaining.toLocaleString()} บาท โดยหักได้สูงสุด 100,000 บาทต่อปี`,
      potentialSavings,
      priority: 'medium',
      actionRequired: 'Review life insurance policy and ensure premiums are paid',
      actionRequiredTh: 'ตรวจสอบกรมธรรม์ประกันชีวิตและชำระเบี้ยให้ครบ',
      estimatedImpact: `Save up to ${potentialSavings.toLocaleString()} THB`,
    };
  }
  
  private static getHealthInsuranceSuggestion(
    current: TaxOptimizationInput['currentDeductions'],
    taxableIncome: number,
    taxRate: number
  ): TaxOptimizationSuggestion | null {
    const remaining = DEDUCTION_LIMITS.healthInsurance - current.healthInsurance;
    
    if (remaining < 1000) return null;
    
    const potentialSavings = remaining * taxRate;
    
    return {
      id: 'health-insurance',
      type: 'investment',
      title: 'Health Insurance Premium',
      titleTh: 'เบี้ยประกันสุขภาพ',
      description: `You can claim up to ${remaining.toLocaleString()} THB more in health insurance premiums. Maximum deduction is 25,000 THB per year (combined with life insurance not exceeding 100,000 THB).`,
      descriptionTh: `คุณสามารถหักลดหย่อนเบี้ยประกันสุขภาพได้อีก ${remaining.toLocaleString()} บาท โดยหักได้สูงสุด 25,000 บาทต่อปี (รวมกับประกันชีวิตไม่เกิน 100,000 บาท)`,
      potentialSavings,
      priority: 'medium',
      actionRequired: 'Review health insurance coverage and premiums',
      actionRequiredTh: 'ตรวจสอบความคุ้มครองและเบี้ยประกันสุขภาพ',
      estimatedImpact: `Save up to ${potentialSavings.toLocaleString()} THB`,
    };
  }
  
  private static getHomeLoanSuggestion(
    current: TaxOptimizationInput['currentDeductions'],
    taxableIncome: number,
    taxRate: number
  ): TaxOptimizationSuggestion | null {
    const remaining = DEDUCTION_LIMITS.homeLoanInterest - current.homeLoanInterest;
    
    if (remaining < 5000) return null;
    
    const potentialSavings = remaining * taxRate;
    
    return {
      id: 'home-loan',
      type: 'deduction',
      title: 'Home Loan Interest',
      titleTh: 'ดอกเบี้ยเงินกู้บ้าน',
      description: `You can claim up to ${remaining.toLocaleString()} THB more in home loan interest. Maximum deduction is 100,000 THB per year for primary residence.`,
      descriptionTh: `คุณสามารถหักลดหย่อนดอกเบี้ยเงินกู้บ้านได้อีก ${remaining.toLocaleString()} บาท โดยหักได้สูงสุด 100,000 บาทต่อปีสำหรับบ้านหลัก`,
      potentialSavings,
      priority: 'medium',
      actionRequired: 'Prepare home loan interest certificate from bank',
      actionRequiredTh: 'เตรียมใบรับรองดอกเบี้ยเงินกู้จากธนาคาร',
      estimatedImpact: `Save up to ${potentialSavings.toLocaleString()} THB`,
    };
  }
  
  private static getDonationSuggestion(
    current: TaxOptimizationInput['currentDeductions'],
    taxableIncome: number,
    taxRate: number
  ): TaxOptimizationSuggestion | null {
    // Donation limit is 10% of income after deductions
    const donationLimit = taxableIncome * 0.10;
    const remaining = donationLimit - current.donation;
    
    if (remaining < 10000) return null;
    
    const potentialSavings = remaining * taxRate * 2; // x2 because donations are double deductible
    
    return {
      id: 'donation-strategy',
      type: 'deduction',
      title: 'Charitable Donations (2x Deduction)',
      titleTh: 'บริจาคเพื่อการกุศล (หัก 2 เท่า)',
      description: `You can donate up to ${remaining.toLocaleString()} THB more and receive double deduction. Donations to approved charities are deductible at 2x the donation amount.`,
      descriptionTh: `คุณสามารถบริจาคเพิ่มได้อีก ${remaining.toLocaleString()} บาท และได้รับสิทธิหักลดหย่อน 2 เท่าของจำนวนที่บริจาค สำหรับการบริจาคให้กับมูลนิธิที่ได้รับอนุมัติ`,
      potentialSavings,
      priority: 'low',
      actionRequired: 'Donate to Revenue Department-approved charities',
      actionRequiredTh: 'บริจาคให้กับมูลนิธิที่ได้รับการอนุมัติจากกรมสรรพากร',
      deadline: new Date(new Date().getFullYear(), 11, 31),
      estimatedImpact: `Save up to ${potentialSavings.toLocaleString()} THB (plus social impact!)`,
    };
  }
  
  private static projectAnnualIncome(
    incomeBySection40: Record<number, number>,
    monthsElapsed: number
  ): number {
    const currentTotal = Object.values(incomeBySection40).reduce((sum, val) => sum + val, 0);
    if (monthsElapsed === 0) return currentTotal;
    return (currentTotal / monthsElapsed) * 12;
  }
}

export default TaxOptimizationService;
