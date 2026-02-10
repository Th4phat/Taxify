// Core Gemini client
export {
  getGeminiClient,
  resetGeminiClient,
  isGeminiAvailable,
  generateContent,
  generateStructuredContent,
  GEMINI_MODELS,
  Type,
  FunctionCallingConfigMode,
} from './gemini.client';

export type {
  GenerateOptions,
  GenerateResult,
  GeminiModel,
  FunctionDeclaration,
} from './gemini.client';

// Auto-categorization service
export {
  suggestCategory,
  batchSuggestCategories,
  quickCategorize,
} from './autoCategorization.service';

// Tax chat service
export {
  createChatSession,
  getChatSession,
  deleteChatSession,
  getAllSessions,
  sendMessage,
  generateChatTitle,
} from './taxChat.service';

// Expense insights service
export {
  generateSpendingInsights,
  processNaturalLanguageQuery,
  detectUnusualTransactions,
  compareSpendingPeriods,
} from './expenseInsights.service';

// Tax optimization service
export {
  generateTaxOptimizationReport,
  compareTaxScenarios,
  checkMissingDocuments,
} from './taxOptimization.service';
