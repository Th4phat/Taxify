
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Button, Card, Divider, FAB, IconButton, Menu, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { InsightsCard } from '@/components/ai/InsightsCard';
import { DatePicker } from '@/components/common/DatePicker';
import {
  getDailySpending,
  getRecentTransactions,
  getSpendingByCategory,
  getTransactionSummary,
  type CategorySpending,
  type DailySpending,
  type TransactionWithCategory,
} from '@/database/repositories/transaction.repo';
import { useTranslation } from '@/hooks/useTranslation';
import { generateSpendingInsights } from '@/services/ai/expenseInsights.service';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ExpenseInsight } from '@/types/ai';
import type { AppTheme } from '@/types/theme';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatters';

type DateRange = 'month' | 'year' | 'all' | 'custom';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

function formatDate(date: Date, format: string, locale: string): string {
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  
  if (format === 'MMMM yyyy') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString();
}

function formatShortDate(date: Date, locale: string): string {
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateRangeLabel(start: Date, end: Date, locale: string): string {
  const startStr = formatShortDate(start, locale);
  const endStr = formatShortDate(end, locale);
  
  // If same month and year, show compact format
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} - ${end.getDate()} ${formatDate(start, 'MMMM yyyy', locale).split(' ')[0]} ${start.getFullYear()}`;
  }
  
  return `${startStr} - ${endStr}`;
}

function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  
  switch (range) {
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case 'all':
      return {
        start: new Date(2000, 0, 1),
        end: new Date(2100, 11, 31, 23, 59, 59),
      };
    case 'custom':
      return {
        start: customStart || new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
  }
}

function getRangeLabel(range: DateRange, locale: string, customStart?: Date, customEnd?: Date): string {
  const now = new Date();
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  
  switch (range) {
    case 'month':
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    case 'year':
      return `${now.getFullYear()}`;
    case 'all':
      return locale === 'th' ? 'ทั้งหมด' : 'All Time';
    case 'custom':
      if (customStart && customEnd) {
        return formatDateRangeLabel(customStart, customEnd, locale);
      }
      return locale === 'th' ? 'กำหนดเอง' : 'Custom';
    default:
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
}

const EXPENSE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
];

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('dashboard.title'),
    });
  }, [navigation, t]);
  
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [dailySpending, setDailySpending] = useState<DailySpending[]>([]);
  const [insights, setInsights] = useState<ExpenseInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [rangeMenuVisible, setRangeMenuVisible] = useState(false);
  const [customRangeModalVisible, setCustomRangeModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  
  const loadData = useCallback(async () => {
    try {
      const { start, end } = getDateRange(dateRange, customStartDate, customEndDate);
      
      const [summaryData, recentData, categoryData, dailyData] = await Promise.all([
        getTransactionSummary(start, end),
        getRecentTransactions(5),
        getSpendingByCategory(start, end),
        getDailySpending(start, end),
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(recentData);
      setCategorySpending(categoryData);
      setDailySpending(dailyData);
      
      // Generate AI insights
      setInsightsLoading(true);
      const generatedInsights = await generateSpendingInsights(start, end);
      setInsights(generatedInsights);
      setInsightsLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setInsightsLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);
  
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
  
  const handleRangeSelect = (range: DateRange) => {
    setRangeMenuVisible(false);
    if (range === 'custom') {
      const now = new Date();
      setCustomStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setCustomEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      setCustomRangeModalVisible(true);
    } else {
      setDateRange(range);
    }
  };
  
  const handleApplyCustomRange = () => {
    setDateRange('custom');
    setCustomRangeModalVisible(false);
  };
  
  const balance = summary.income - summary.expense;
  const rangeLabel = getRangeLabel(dateRange, language, customStartDate, customEndDate);
  
  const pieChartData = useMemo(() => {
    if (categorySpending.length === 0) return [];
    
    const total = categorySpending.reduce((sum, cat) => sum + cat.total, 0);
    
    return categorySpending.slice(0, 8).map((cat, index) => ({
      value: cat.total,
      color: cat.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length],
      text: `${Math.round((cat.total / total) * 100)}%`,
      categoryName: language === 'th' && cat.categoryNameTh ? cat.categoryNameTh : cat.categoryName,
      focused: false,
    }));
  }, [categorySpending, language]);
  
  const dailyChartData = useMemo(() => {
    if (dailySpending.length === 0) return [];
    
    // Get the last 14 days of data for better visualization
    const recentData = dailySpending.slice(-14);
    
    const maxAmount = Math.max(...recentData.map(d => d.amount));
    
    return recentData.map((day, index) => {
      const date = day.date;
      const dayLabel = date.getDate().toString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Color intensity based on spending amount
      const intensity = maxAmount > 0 ? day.amount / maxAmount : 0;
      
      return {
        value: day.amount,
        label: dayLabel,
        frontColor: intensity > 0.7 
          ? theme.colors.expense 
          : intensity > 0.4 
            ? `${theme.colors.expense}CC`
            : intensity > 0
              ? `${theme.colors.expense}88`
              : `${theme.colors.outline}44`,
        labelTextStyle: { 
          color: isWeekend ? theme.colors.expense : theme.colors.onSurfaceVariant,
          fontSize: 10,
          fontWeight: isWeekend ? ('bold' as const) : ('normal' as const),
        },
      };
    });
  }, [dailySpending, theme]);
  
  const avgDailySpending = useMemo(() => {
    if (dailySpending.length === 0) return 0;
    const total = dailySpending.reduce((sum, d) => sum + d.amount, 0);
    return total / dailySpending.length;
  }, [dailySpending]);
  
  const highestSpendingDay = useMemo(() => {
    if (dailySpending.length === 0) return null;
    return dailySpending.reduce((max, day) => day.amount > max.amount ? day : max, dailySpending[0]);
  }, [dailySpending]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.rangeSelectorContainer}>
          <Menu
            visible={rangeMenuVisible}
            onDismiss={() => setRangeMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.rangeSelector}
                onPress={() => setRangeMenuVisible(true)}
              >
                <Text variant="headlineSmall" style={styles.rangeLabel} numberOfLines={1}>
                  {rangeLabel}
                </Text>
                <IconButton
                  icon="chevron-down"
                  size={24}
                  style={styles.rangeIcon}
                />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleRangeSelect('month')}
              title={t('dashboard.thisMonth')}
              trailingIcon={dateRange === 'month' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleRangeSelect('year')}
              title={t('dashboard.thisYear')}
              trailingIcon={dateRange === 'year' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleRangeSelect('all')}
              title={t('dashboard.allTime')}
              trailingIcon={dateRange === 'all' ? 'check' : undefined}
            />
            <Divider />
            <Menu.Item
              onPress={() => handleRangeSelect('custom')}
              title={t('dashboard.customRange')}
              trailingIcon={dateRange === 'custom' ? 'check' : undefined}
            />
          </Menu>
        </View>
        
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('dashboard.netIncome')}
            </Text>
            <Text 
              variant="displayLarge" 
              style={{ 
                color: balance >= 0 ? theme.colors.income : theme.colors.expense,
                marginTop: 8,
              }}
            >
              {formatCurrency(balance)}
            </Text>
          </Card.Content>
        </Card>
        
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { marginRight: 8 }]}>
            <Card.Content>
              <View style={styles.summaryHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.income}20` }]}>
                  <Text style={{ color: theme.colors.income, fontSize: 18 }}>↑</Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.totalIncome')}
                </Text>
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.income, marginTop: 8 }}>
                {formatCurrencyCompact(summary.income)}
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={[styles.summaryCard, { marginLeft: 8 }]}>
            <Card.Content>
              <View style={styles.summaryHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.expense}20` }]}>
                  <Text style={{ color: theme.colors.expense, fontSize: 18 }}>↓</Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.totalExpenses')}
                </Text>
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.expense, marginTop: 8 }}>
                {formatCurrencyCompact(summary.expense)}
              </Text>
            </Card.Content>
          </Card>
        </View>
        
        {summary.expense > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                {t('dashboard.expenseBreakdown')}
              </Text>
              
              {pieChartData.length > 0 ? (
                <View style={styles.pieChartContainer}>
                  <PieChart
                    data={pieChartData}
                    donut
                    showText
                    textColor={theme.colors.onSurface}
                    textSize={12}
                    innerRadius={50}
                    radius={90}
                    innerCircleColor={theme.colors.surface}
                    showTextBackground
                    textBackgroundColor={theme.colors.surface}
                    textBackgroundRadius={14}
                    isAnimated
                    animationDuration={800}
                    focusOnPress
                    centerLabelComponent={() => (
                      <View style={styles.pieCenterLabel}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {t('dashboard.total')}
                        </Text>
                        <Text variant="titleMedium" style={{ color: theme.colors.expense, fontWeight: 'bold' }}>
                          {formatCurrencyCompact(summary.expense)}
                        </Text>
                      </View>
                    )}
                  />
                  
                  <View style={styles.legendContainer}>
                    {categorySpending.slice(0, 6).map((cat, index) => (
                      <View key={cat.categoryId} style={styles.legendItem}>
                        <View 
                          style={[
                            styles.legendColor, 
                            { backgroundColor: cat.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length] }
                          ]} 
                        />
                        <Text 
                          variant="bodySmall" 
                          style={styles.legendText}
                          numberOfLines={1}
                        >
                          {language === 'th' && cat.categoryNameTh ? cat.categoryNameTh : cat.categoryName}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatCurrencyCompact(cat.total)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, padding: 20 }}>
                  {t('dashboard.noExpenseData')}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        
        {dailyChartData.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <View style={styles.chartHeader}>
                <Text variant="titleMedium" style={styles.chartTitle}>
                  {t('dashboard.dailySpending')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.last14Days')}
                </Text>
              </View>
              
              <View style={styles.barChartContainer}>
                <BarChart
                  data={dailyChartData}
                  width={CHART_WIDTH - 40}
                  height={140}
                  barWidth={16}
                  spacing={6}
                  noOfSections={3}
                  barBorderRadius={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={theme.colors.outline}
                  yAxisLabelWidth={0}
                  hideYAxisText
                  isAnimated
                  animationDuration={600}
                  maxValue={Math.max(...dailySpending.map(d => d.amount)) * 1.1 || 100}
                />
              </View>
              
              <View style={styles.dailyStats}>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('dashboard.avgDaily')}
                  </Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {formatCurrency(avgDailySpending)}
                  </Text>
                </View>
                {highestSpendingDay && (
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('dashboard.highestDay')}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.expense }}>
                      {formatCurrency(highestSpendingDay.amount)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatShortDate(highestSpendingDay.date, language)}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        
        <InsightsCard
          insights={insights}
          isLoading={insightsLoading}
          onViewAllPress={() => router.push('/insights')}
        />

        <Card style={styles.taxCard}>
          <Card.Content>
            <View style={styles.taxHeader}>
              <Text variant="titleMedium">{t('dashboard.estimatedTax')}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                2024 {t('tax.taxYear')}
              </Text>
            </View>
            <Text variant="headlineMedium" style={{ color: theme.colors.tax, marginTop: 8 }}>
              {formatCurrency(0)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t('dashboard.basedOnCurrentYear')}
            </Text>
          </Card.Content>
        </Card>
        
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium">{t('dashboard.recentTransactions')}</Text>
          <Text 
            variant="bodySmall" 
            style={{ color: theme.colors.primary }}
            onPress={() => router.push('/transactions')}
          >
            {t('dashboard.viewAll')}
          </Text>
        </View>
        
        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                {t('dashboard.noTransactions')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          recentTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <Card.Content>
                <View style={styles.transactionRow}>
                  <View style={styles.transactionInfo}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {transaction.description || transaction.category?.name || t('common.unknown')}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatShortDate(transaction.transactionDate, language)}
                    </Text>
                  </View>
                  <Text 
                    variant="bodyLarge" 
                    style={{ 
                      color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense,
                      fontWeight: '600',
                    }}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
        
        <View style={{ height: 80 }} />
      </ScrollView>
      
      <FAB
        icon="robot"
        style={[styles.aiFab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.primary}
        onPress={() => router.push('/ai-chat' as any)}
        size="small"
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/transactions/new')}
      />
      
      <Portal>
        <Modal
          visible={customRangeModalVisible}
          onDismiss={() => setCustomRangeModalVisible(false)}
          contentContainerStyle={[styles.customRangeModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('dashboard.customRange')}
          </Text>
          
          <DatePicker
            date={customStartDate}
            onDateChange={setCustomStartDate}
            label={t('filters.from')}
            maximumDate={customEndDate}
          />
          
          <View style={{ height: 16 }} />
          
          <DatePicker
            date={customEndDate}
            onDateChange={setCustomEndDate}
            label={t('filters.to')}
            minimumDate={customStartDate}
          />
          
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setCustomRangeModalVisible(false)}
              style={styles.modalButton}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyCustomRange}
              style={styles.modalButton}
            >
              {t('common.apply')}
            </Button>
          </View>
        </Modal>
      </Portal>
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
  rangeSelectorContainer: {
    marginBottom: 16,
  },
  rangeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeLabel: {
    flex: 1,
  },
  rangeIcon: {
    margin: 0,
    marginLeft: -8,
  },
  balanceCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    marginBottom: 12,
  },
  pieChartContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    maxWidth: 80,
  },
  barChartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  dailyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  taxCard: {
    marginBottom: 24,
    elevation: 2,
  },
  taxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCard: {
    marginBottom: 8,
    elevation: 1,
  },
  transactionCard: {
    marginBottom: 8,
    elevation: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  aiFab: {
    position: 'absolute',
    right: 80,
    bottom: 16,
  },
  customRangeModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
