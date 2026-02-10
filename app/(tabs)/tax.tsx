
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Divider, List, Chip } from 'react-native-paper';
import { useFocusEffect, useNavigation } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { calculateTax } from '@/services/tax/calculator';
import { TaxOptimizationService, type TaxOptimizationResult } from '@/services/tax/optimization.service';
import { generateTaxOptimizationReport } from '@/services/ai/taxOptimization.service';
import { TaxOptimizationCard as AITaxOptimizationCard } from '@/components/ai/TaxOptimization';
import type { TaxOptimizationReport } from '@/types/ai';
import { NotificationService, type TaxDeadlineInfo } from '@/services/notifications/notification.service';
import { getIncomeBySection40Type } from '@/database/repositories/transaction.repo';
import { TAX_BRACKETS_2024, SECTION_40_RULES, getSection40Name } from '@/constants/tax';
import { Section40Type, type TaxCalculationResult, type TaxDeductions } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';
import { TaxOptimizationCard } from '@/components/tax/TaxOptimizationCard';
import { TaxDeadlineBanner } from '@/components/tax/TaxDeadlineBanner';

const DEFAULT_DEDUCTIONS: TaxDeductions = {
  personalAllowance: 60000,
  spouseAllowance: 0,
  childAllowance: 0,
  parentAllowance: 0,
  disabilityAllowance: 0,
  lifeInsurance: 0,
  healthInsurance: 0,
  pensionInsurance: 0,
  rmf: 0,
  ssf: 0,
  socialSecurity: 0,
  homeLoanInterest: 0,
  donation: 0,
};

export default function TaxScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('tax.title'),
    });
  }, [navigation, t]);
  
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<TaxOptimizationResult | null>(null);
  const [aiOptimizationReport, setAiOptimizationReport] = useState<TaxOptimizationReport | null>(null);
  const [aiOptimizationLoading, setAiOptimizationLoading] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState<TaxDeadlineInfo | null>(null);
  const [incomeBySection40, setIncomeBySection40] = useState<Record<number, number>>({});
  const [deductions] = useState<TaxDeductions>(DEFAULT_DEDUCTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const currentYear = new Date().getFullYear();
  
  const loadData = useCallback(async () => {
    try {
      const incomeData = await getIncomeBySection40Type(currentYear);
      setIncomeBySection40(incomeData);
      
      const incomes = Object.entries(incomeData)
        .filter(([, amount]) => amount > 0)
        .map(([type, amount]) => ({
          section40Type: parseInt(type) as Section40Type,
          amount,
          expenseDeduction: 'standard' as const,
        }));
      
      if (incomes.length > 0) {
        const result = calculateTax({
          taxYear: currentYear,
          incomes,
          deductions,
        });
        setTaxResult(result);
        
        const monthsElapsed = new Date().getMonth() + 1;
        const optResult = TaxOptimizationService.analyze({
          taxYear: currentYear,
          taxableIncome: result.taxableIncome,
          currentTaxAmount: result.finalTaxDue,
          currentDeductions: deductions,
          incomeBySection40: incomeData,
          monthsElapsed,
        });
        setOptimizationResult(optResult);
        
        setAiOptimizationLoading(true);
        const aiReport = await generateTaxOptimizationReport(
          currentYear,
          deductions,
          result.totalGrossIncome,
          incomeData
        );
        setAiOptimizationReport(aiReport);
        setAiOptimizationLoading(false);
      }
      
      const deadline = NotificationService.getTaxDeadlines(currentYear);
      setDeadlineInfo(deadline);
    } catch (error) {
      console.error('Error loading tax data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, deductions]);
  
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);
  
  const totalIncome = Object.values(incomeBySection40).reduce((a, b) => a + b, 0);
  const hasIncome = totalIncome > 0;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text variant="headlineSmall" style={styles.header}>
          {t('tax.taxYear')} {currentYear}
        </Text>
        
        {deadlineInfo && (
          <TaxDeadlineBanner
            deadline={deadlineInfo}
            compact={true}
            onViewDetailsPress={() => {}}
          />
        )}
        
        <AITaxOptimizationCard
          report={aiOptimizationReport}
          isLoading={aiOptimizationLoading}
          onGenerateReport={loadData}
          onSuggestionPress={(suggestion) => {
            // Handle suggestion press - could navigate to relevant screen
            console.log('Suggestion pressed:', suggestion);
          }}
        />

        {optimizationResult && (
          <TaxOptimizationCard
            result={optimizationResult}
            onViewAllPress={() => {}}
          />
        )}
        
        {!hasIncome ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
                {t('tax.noIncomeRecorded', { year: currentYear })}
              </Text>
              <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {t('tax.addIncomeToSeeEstimate')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.estimatedTax')}
                </Text>
                <Text 
                  variant="displayLarge" 
                  style={{ color: theme.colors.tax, marginTop: 8 }}
                >
                  {formatCurrency(taxResult?.finalTaxDue || 0)}
                </Text>
                
                {taxResult && taxResult.effectiveTaxRate > 0 && (
                  <Chip style={styles.rateChip}>
                    {t('tax.effectiveRate')}: {formatPercentage(taxResult.effectiveTaxRate)}
                  </Chip>
                )}
                
                <Divider style={styles.divider} />
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('tax.totalIncome')}
                    </Text>
                    <Text variant="titleMedium">
                      {formatCurrency(taxResult?.totalGrossIncome || totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('tax.taxableIncome')}
                    </Text>
                    <Text variant="titleMedium">
                      {formatCurrency(taxResult?.taxableIncome || 0)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            
            <Card style={styles.breakdownCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>{t('tax.incomeInfo')}</Text>
                
                {Object.entries(incomeBySection40)
                  .filter(([, amount]) => amount > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, amount]) => (
                    <List.Item
                      key={type}
                      title={getSection40Name(parseInt(type) as Section40Type, language)}
                      description={`${t('transactions.section40')}(${type})`}
                      right={() => (
                        <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                          {formatCurrency(amount)}
                        </Text>
                      )}
                    />
                  ))}
                
                <Divider style={styles.divider} />
                
                <List.Item
                  title={t('tax.totalIncome')}
                  titleStyle={{ fontWeight: '700' }}
                  right={() => (
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                      {formatCurrency(totalIncome)}
                    </Text>
                  )}
                />
              </Card.Content>
            </Card>
            
            {taxResult && (
              <Card style={styles.breakdownCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>{t('tax.deductions')}</Text>
                  
                  <List.Item
                    title={t('tax.expenseDeductions')}
                    right={() => (
                      <Text variant="bodyLarge">
                        {formatCurrency(taxResult.totalExpenseDeduction)}
                      </Text>
                    )}
                  />
                  <List.Item
                    title={t('tax.personalAllowances')}
                    right={() => (
                      <Text variant="bodyLarge">
                        {formatCurrency(taxResult.totalAllowances)}
                      </Text>
                    )}
                  />
                  <List.Item
                    title={t('tax.investmentDeductions')}
                    right={() => (
                      <Text variant="bodyLarge">
                        {formatCurrency(taxResult.totalInvestments)}
                      </Text>
                    )}
                  />
                  
                  <Divider style={styles.divider} />
                  
                  <List.Item
                    title={t('tax.totalDeductions')}
                    titleStyle={{ fontWeight: '700' }}
                    right={() => (
                      <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                        {formatCurrency(
                          taxResult.totalExpenseDeduction + 
                          taxResult.totalAllowances + 
                          taxResult.totalInvestments
                        )}
                      </Text>
                    )}
                  />
                </Card.Content>
              </Card>
            )}
            
            <Card style={styles.breakdownCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>{t('tax.taxBrackets', { year: '2024' })}</Text>
                
                {TAX_BRACKETS_2024.map((bracket, index) => (
                  <List.Item
                    key={index}
                    title={`${formatCurrency(bracket.minIncome)} - ${
                      bracket.maxIncome === Infinity ? '∞' : formatCurrency(bracket.maxIncome)
                    }`}
                    description={bracket.rate === 0 ? t('tax.exempt') : `${(bracket.rate * 100).toFixed(0)}%`}
                    style={
                      taxResult && 
                      taxResult.taxableIncome > bracket.minIncome && 
                      taxResult.taxableIncome <= bracket.maxIncome 
                        ? styles.activeBracket 
                        : undefined
                    }
                  />
                ))}
              </Card.Content>
            </Card>
            
            {taxResult && taxResult.taxByAlternativeMethod > taxResult.taxByProgressiveMethod && (
              <Card style={[styles.warningCard, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Card.Content>
                  <Text variant="bodyMedium" style={{ color: theme.colors.warning }}>
                    {t('tax.amtWarning')}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </>
        )}
        
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  emptyCard: {
    marginTop: 32,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  rateChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  breakdownCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  activeBracket: {
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
  },
  warningCard: {
    marginBottom: 16,
    elevation: 1,
  },
});
