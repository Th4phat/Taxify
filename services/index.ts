// Tax Services
export { calculateTax, calculateProgressiveTax, calculateAlternativeTax, calculatePenalties } from './tax/calculator';
export type { WithholdingTaxSummary } from './tax/calculator';

export { 
  TaxOptimizationService,
  type TaxOptimizationSuggestion,
  type TaxOptimizationInput,
  type TaxOptimizationResult,
} from './tax/optimization.service';

// Export Service
export {
  ExportService,
  exportTransactionsToCSV,
  exportTaxSummaryToCSV,
  generateTaxReportHTML,
  shareFile,
  saveFileToDownloads,
  type CSVExportOptions,
  type PDFReportOptions,
  type TaxReportData,
} from './export/export.service';

// Budget Service
export {
  BudgetService,
  type BudgetWithCategory,
  type CreateBudgetInput,
} from './budget/budget.service';

// Notification Service
export {
  NotificationService,
  type TaxDeadlineInfo,
  type DailyReminderConfig,
  type NotificationPreferences,
} from './notifications/notification.service';

// Security Service
export {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  setPIN,
  getPIN,
  validatePIN,
  removePIN,
  hasPIN,
  authenticateWithPIN,
  getAuthSettings,
  saveAuthSettings,
  isLockEnabled,
  enableLock,
  disableLock,
  authenticate,
  getBiometricLabel,
  shouldAutoLock,
  type AuthCheckResult,
  type BiometricAvailability,
  type AuthSettings,
} from './security/auth.service';

// Search Service
export {
  searchTransactions,
  quickSearch,
  getSearchSuggestions,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  findMissingReceipts,
  findTaxDeductibleTransactions,
  getFilterSummary,
  type SearchFilters,
  type SearchResult,
  type SearchSuggestion,
} from './search/transactionSearch.service';
