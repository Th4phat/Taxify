
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  useTheme,
  SegmentedButtons,
  Chip,
  IconButton,
  Searchbar,
  Button,
  Portal,
  Modal,
  Divider,
  Menu,
  TextInput,
} from 'react-native-paper';
import { router, type Href, useFocusEffect, useNavigation } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import { formatCurrency, formatDateFull } from '@/utils/formatters';
import {
  getAllTransactions,
  getTransactionsByType,
  deleteTransaction,
  type TransactionWithCategory,
} from '@/database/repositories/transaction.repo';
import { getAllCategories, type Category } from '@/database/repositories/category.repo';
import type { TransactionType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';
import { DatePicker } from '@/components/common/DatePicker';

type DateRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type SortBy = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type AmountRange = 'all' | 'under100' | '100to500' | '500to1000' | 'over1000' | 'custom';

interface Filters {
  type: TransactionType | 'all';
  dateRange: DateRange;
  categoryId: string | 'all';
  amountRange: AmountRange;
  minAmount: string;
  maxAmount: string;
  customStartDate: Date;
  customEndDate: Date;
}

function formatShortDate(date: Date, locale: string): string {
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function TransactionsScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Data state
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    dateRange: 'all',
    categoryId: 'all',
    amountRange: 'all',
    minAmount: '',
    maxAmount: '',
    customStartDate: new Date(new Date().getFullYear(), 0, 1),
    customEndDate: new Date(),
  });

  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('transactions.title'),
    });
  }, [navigation, t]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      let data: TransactionWithCategory[];

      if (filters.type === 'all') {
        data = await getAllTransactions(500);
      } else {
        data = await getTransactionsByType(filters.type, 500);
      }

      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  const getDateRange = useCallback((range: DateRange): { start: Date; end: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { start: weekStart, end: new Date(weekEnd.getTime() - 1) };
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start: monthStart, end: monthEnd };
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { start: yearStart, end: yearEnd };
      }
      case 'custom':
        return {
          start: filters.customStartDate,
          end: new Date(filters.customEndDate.getFullYear(), filters.customEndDate.getMonth(), filters.customEndDate.getDate(), 23, 59, 59),
        };
      default:
        return null;
    }
  }, [filters.customStartDate, filters.customEndDate]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.category?.name.toLowerCase().includes(lowerQuery) ||
        t.category?.nameTh?.toLowerCase().includes(lowerQuery)
      );
    }

    if (filters.dateRange !== 'all') {
      const dateRange = getDateRange(filters.dateRange);
      if (dateRange) {
        result = result.filter((t) => {
          const date = new Date(t.transactionDate);
          return date >= dateRange.start && date <= dateRange.end;
        });
      }
    }

    if (filters.categoryId !== 'all') {
      result = result.filter((t) => t.categoryId === filters.categoryId);
    }

    if (filters.amountRange !== 'all') {
      switch (filters.amountRange) {
        case 'under100':
          result = result.filter((t) => t.amount < 100);
          break;
        case '100to500':
          result = result.filter((t) => t.amount >= 100 && t.amount < 500);
          break;
        case '500to1000':
          result = result.filter((t) => t.amount >= 500 && t.amount < 1000);
          break;
        case 'over1000':
          result = result.filter((t) => t.amount >= 1000);
          break;
        case 'custom': {
          const min = parseFloat(filters.minAmount) || 0;
          const max = parseFloat(filters.maxAmount) || Infinity;
          result = result.filter((t) => t.amount >= min && t.amount <= max);
          break;
        }
      }
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        case 'date-asc':
          return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, searchQuery, filters, sortBy, getDateRange]);

  const { totalIncome, totalExpense } = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.totalIncome += t.amount;
        } else {
          acc.totalExpense += t.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );
  }, [filteredTransactions]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.categoryId !== 'all') count++;
    if (filters.amountRange !== 'all') count++;
    return count;
  }, [filters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      categoryId: 'all',
      amountRange: 'all',
      minAmount: '',
      maxAmount: '',
      customStartDate: new Date(new Date().getFullYear(), 0, 1),
      customEndDate: new Date(),
    });
    setSortBy('date-desc');
  };

  const hasActiveFilters = activeFilterCount > 0 || sortBy !== 'date-desc';

  const renderTransaction = ({ item }: { item: TransactionWithCategory }) => (
    <TouchableOpacity
      onPress={() => router.push(`/transactions/${item.id}` as Href)}
      activeOpacity={0.7}
    >
      <Card style={styles.transactionCard}>
        <Card.Content>
          <View style={styles.transactionRow}>
            <View style={styles.leftSection}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.category?.color ? `${item.category.color}20` : theme.colors.surfaceVariant }
                ]}
              >
                <Text style={{ fontSize: 18 }}>
                  {item.type === 'income' ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {item.description || item.category?.name || 'Unknown'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatShortDate(item.transactionDate, language)} • {item.category?.name}
                </Text>
              </View>
            </View>
            <View style={styles.rightSection}>
              <Text
                variant="bodyLarge"
                style={{
                  color: item.type === 'income' ? theme.colors.income : theme.colors.expense,
                  fontWeight: '600',
                }}
              >
                {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'all', label: t('filters.allTime') },
    { value: 'today', label: t('filters.today') },
    { value: 'week', label: t('filters.thisWeek') },
    { value: 'month', label: t('filters.thisMonth') },
    { value: 'year', label: t('filters.thisYear') },
    { value: 'custom', label: t('filters.customRange') },
  ];

  const amountRangeOptions: { value: AmountRange; label: string }[] = [
    { value: 'all', label: t('filters.allAmounts') },
    { value: 'under100', label: '< ฿100' },
    { value: '100to500', label: '฿100 - ฿500' },
    { value: '500to1000', label: '฿500 - ฿1,000' },
    { value: 'over1000', label: '> ฿1,000' },
    { value: 'custom', label: t('filters.customAmount') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showSearch && (
        <Searchbar
          placeholder={t('common.search')}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          autoFocus
        />
      )}

      <View style={styles.filterBar}>
        <SegmentedButtons
          value={filters.type}
          onValueChange={(value) => setFilters((f) => ({ ...f, type: value as TransactionType | 'all' }))}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('transactions.income') },
            { value: 'expense', label: t('transactions.expense') },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.filterActions}>
          <IconButton
            icon={showSearch ? 'close' : 'magnify'}
            size={20}
            style={styles.actionButton}
            onPress={() => {
              setShowSearch(!showSearch);
              if (showSearch) {
                setSearchQuery('');
              }
            }}
          />
          <IconButton
            icon="filter-variant"
            size={20}
            style={styles.actionButton}
            onPress={() => setShowFilterModal(true)}
            iconColor={hasActiveFilters ? theme.colors.primary : undefined}
          />
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                size={20}
                style={styles.actionButton}
                onPress={() => setSortMenuVisible(true)}
                iconColor={sortBy !== 'date-desc' ? theme.colors.primary : undefined}
              />
            }
          >
            <Menu.Item
              onPress={() => { setSortBy('date-desc'); setSortMenuVisible(false); }}
              title={t('filters.newestFirst')}
              trailingIcon={sortBy === 'date-desc' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setSortBy('date-asc'); setSortMenuVisible(false); }}
              title={t('filters.oldestFirst')}
              trailingIcon={sortBy === 'date-asc' ? 'check' : undefined}
            />
            <Divider />
            <Menu.Item
              onPress={() => { setSortBy('amount-desc'); setSortMenuVisible(false); }}
              title={t('filters.highestAmount')}
              trailingIcon={sortBy === 'amount-desc' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setSortBy('amount-asc'); setSortMenuVisible(false); }}
              title={t('filters.lowestAmount')}
              trailingIcon={sortBy === 'amount-asc' ? 'check' : undefined}
            />
          </Menu>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {filteredTransactions.length} {t('transactions.transactions')}
        </Text>
        {filters.type !== 'all' && (
          <Text
            variant="bodySmall"
            style={{
              color: filters.type === 'income' ? theme.colors.income : theme.colors.expense,
              fontWeight: '600',
            }}
          >
            {filters.type === 'income' ? '+' : '-'}
            {formatCurrency(filters.type === 'income' ? totalIncome : totalExpense)}
          </Text>
        )}
        {filters.type === 'all' && (
          <View style={styles.summaryTotals}>
            <Text variant="bodySmall" style={{ color: theme.colors.income }}>
              +{formatCurrency(totalIncome)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 4 }}>
              /
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.expense }}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {hasActiveFilters ? t('filters.noResults') : t('transactions.noTransactions')}
            </Text>
            {hasActiveFilters && (
              <Button mode="text" onPress={resetFilters} style={{ marginTop: 8 }}>
                {t('filters.clearAll')}
              </Button>
            )}
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/transactions/new')}
      />

      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={[styles.filterModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.filterModalHeader}>
            <Text variant="titleLarge">{t('filters.filterTransactions')}</Text>
            {activeFilterCount > 0 && (
              <Button mode="text" onPress={resetFilters} compact>
                {t('filters.clearAll')}
              </Button>
            )}
          </View>

          <ScrollView>
            <View style={styles.filterSection}>
              <Text variant="titleSmall" style={styles.filterSectionTitle}>
                {t('filters.dateRange')}
              </Text>
              <View style={styles.filterOptions}>
                {dateRangeOptions.map((option) => (
                  <Chip
                    key={option.value}
                    selected={filters.dateRange === option.value}
                    onPress={() => setFilters((f) => ({ ...f, dateRange: option.value }))}
                    style={styles.filterOptionChip}
                    showSelectedOverlay
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>

              {filters.dateRange === 'custom' && (
                <View style={styles.customDateRange}>
                  <DatePicker
                    date={filters.customStartDate}
                    onDateChange={(date) => setFilters((f) => ({ ...f, customStartDate: date }))}
                    label={t('filters.from')}
                    maximumDate={filters.customEndDate}
                  />
                  <View style={{ height: 8 }} />
                  <DatePicker
                    date={filters.customEndDate}
                    onDateChange={(date) => setFilters((f) => ({ ...f, customEndDate: date }))}
                    label={t('filters.to')}
                    minimumDate={filters.customStartDate}
                  />
                </View>
              )}
            </View>

            <Divider style={styles.filterDivider} />

            <View style={styles.filterSection}>
              <Text variant="titleSmall" style={styles.filterSectionTitle}>
                {t('filters.category')}
              </Text>
              <View style={styles.filterOptions}>
                <Chip
                  selected={filters.categoryId === 'all'}
                  onPress={() => setFilters((f) => ({ ...f, categoryId: 'all' }))}
                  style={styles.filterOptionChip}
                  showSelectedOverlay
                >
                  {t('common.all')}
                </Chip>
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    selected={filters.categoryId === cat.id}
                    onPress={() => setFilters((f) => ({ ...f, categoryId: cat.id }))}
                    style={styles.filterOptionChip}
                    showSelectedOverlay
                  >
                    {cat.name}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider style={styles.filterDivider} />

            <View style={styles.filterSection}>
              <Text variant="titleSmall" style={styles.filterSectionTitle}>
                {t('filters.amountRange')}
              </Text>
              <View style={styles.filterOptions}>
                {amountRangeOptions.map((option) => (
                  <Chip
                    key={option.value}
                    selected={filters.amountRange === option.value}
                    onPress={() => setFilters((f) => ({ ...f, amountRange: option.value }))}
                    style={styles.filterOptionChip}
                    showSelectedOverlay
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>

              {filters.amountRange === 'custom' && (
                <View style={styles.customAmountRange}>
                  <TextInput
                    mode="outlined"
                    label={t('filters.minAmount')}
                    value={filters.minAmount}
                    onChangeText={(text) => setFilters((f) => ({ ...f, minAmount: text.replace(/[^\d.]/g, '') }))}
                    keyboardType="decimal-pad"
                    left={<TextInput.Affix text="฿" />}
                    style={styles.amountInput}
                  />
                  <Text style={styles.amountSeparator}>-</Text>
                  <TextInput
                    mode="outlined"
                    label={t('filters.maxAmount')}
                    value={filters.maxAmount}
                    onChangeText={(text) => setFilters((f) => ({ ...f, maxAmount: text.replace(/[^\d.]/g, '') }))}
                    keyboardType="decimal-pad"
                    left={<TextInput.Affix text="฿" />}
                    style={styles.amountInput}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <Button
            mode="contained"
            onPress={() => setShowFilterModal(false)}
            style={styles.applyButton}
          >
            {t('filters.applyFilters')}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  segmentedButtons: {
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    margin: 0,
    marginHorizontal: -4,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryTotals: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  rightSection: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  filterModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionChip: {
    borderRadius: 8,
  },
  customDateRange: {
    marginTop: 12,
  },
  customAmountRange: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  amountSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  filterDivider: {
    marginVertical: 16,
  },
  applyButton: {
    marginTop: 8,
  },
});
