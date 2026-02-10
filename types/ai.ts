export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1
  reason: string;
}

export interface AutoCategorizationResult {
  suggestion: CategorySuggestion | null;
  alternatives: CategorySuggestion[];
  error?: string;
}

export interface MerchantPattern {
  merchantName: string;
  suggestedCategoryId: string;
  frequency: number;
  avgAmount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  functionCalls?: FunctionCallInfo[];
  isError?: boolean;
}

export interface FunctionCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxAssistantResponse {
  message: string;
  suggestedActions?: SuggestedAction[];
  relevantDeductions?: string[];
  confidence: number;
  isError?: boolean;
}

export interface SuggestedAction {
  type: 'navigate' | 'show_calculation' | 'explain' | 'suggest_deduction';
  label: string;
  payload?: unknown;
}

export type InsightType = 
  | 'spending_trend' 
  | 'category_anomaly' 
  | 'comparison' 
  | 'seasonal_pattern'
  | 'budget_alert'
  | 'saving_opportunity'
  | 'tax_relevance';

export interface ExpenseInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'positive';
  relatedCategoryId?: string;
  amount?: number;
  percentageChange?: number;
  suggestedAction?: string;
  generatedAt: Date;
}

export interface SpendingAnalysis {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalSpending: number;
  topCategories: CategorySpendingInfo[];
  unusualTransactions: UnusualTransaction[];
  comparisons: PeriodComparison[];
  trends: TrendInfo[];
}

export interface CategorySpendingInfo {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentageOfTotal: number;
  changeFromPreviousPeriod: number;
}

export interface UnusualTransaction {
  transactionId: string;
  description: string;
  amount: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PeriodComparison {
  label: string;
  currentAmount: number;
  previousAmount: number;
  changePercentage: number;
}

export interface TrendInfo {
  label: string;
  direction: 'up' | 'down' | 'stable';
  percentageChange: number;
  description: string;
}

export interface NaturalLanguageQuery {
  query: string;
  result: QueryResult;
  sqlEquivalent?: string;
}

export interface QueryResult {
  answer: string;
  data?: unknown;
  chartType?: 'bar' | 'line' | 'pie' | 'none';
  chartData?: unknown;
}

export interface TaxOptimizationSuggestion {
  id: string;
  type: 
    | 'additional_deduction' 
    | 'investment_opportunity' 
    | 'income_timing' 
    | 'bracket_optimization'
    | 'missing_document';
  title: string;
  description: string;
  potentialSaving: number;
  difficulty: 'easy' | 'medium' | 'hard';
  actionRequired: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface TaxOptimizationReport {
  taxYear: number;
  currentTaxableIncome: number;
  currentTaxAmount: number;
  effectiveTaxRate: number;
  currentBracketIndex: number;
  nextBracketThreshold: number | null;
  amountToNextBracket: number | null;
  suggestions: TaxOptimizationSuggestion[];
  totalPotentialSavings: number;
  generatedAt: Date;
}

export interface BracketInfo {
  index: number;
  minIncome: number;
  maxIncome: number;
  rate: number;
  baseTax: number;
}

export interface DeductionGap {
  deductionType: string;
  currentAmount: number;
  maxAllowed: number;
  remainingAllowance: number;
  potentialSaving: number;
}

export interface ScenarioComparison {
  scenarioName: string;
  changes: string[];
  projectedTaxableIncome: number;
  projectedTaxAmount: number;
  savingsVsCurrent: number;
}

export interface AIServiceConfig {
  enabled: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  cacheResults: boolean;
  cacheExpiryMinutes: number;
}

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  enabled: true,
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  maxTokens: 2048,
  cacheResults: true,
  cacheExpiryMinutes: 60,
};

export interface ToolFunction {
  name: string;
  description: string;
  parameters: object;
}

export interface QueryTransactionsParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  minAmount?: number;
  maxAmount?: number;
}

export interface CalculateTaxParams {
  taxYear: number;
  includeProjections?: boolean;
}

export interface GetInsightsParams {
  period: 'month' | 'quarter' | 'year';
  focus?: 'spending' | 'tax' | 'savings';
}
