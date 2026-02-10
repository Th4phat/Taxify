
import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Button,
  useTheme,
  Portal,
  Dialog,
  Chip,
  Divider,
  Menu,
} from 'react-native-paper';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import type { AppTheme } from '@/types/theme';
import {
  getAllRecurringTransactions,
  deleteRecurringTransaction,
  toggleRecurringTransactionActive,
  type RecurringTransactionWithCategory,
  type RecurringFrequency,
} from '@/database/repositories/recurringTransaction.repo';
import { manuallyGenerateRecurringTransaction, getRecurringSummary } from '@/services/recurring/recurringScheduler.service';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';

function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function RecurringTransactionsScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('transactions.recurringTransactions'),
    });
  }, [navigation, t]);
  
  const formatFrequency = (frequency: RecurringFrequency): string => {
    switch (frequency) {
      case 'daily':
        return t('transactions.daily');
      case 'weekly':
        return t('transactions.weekly');
      case 'monthly':
        return t('transactions.monthly');
      case 'yearly':
        return t('transactions.yearly');
      default:
        return frequency;
    }
  };

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransactionWithCategory[]>([]);
  const [summary, setSummary] = useState({
    activeCount: 0,
    totalMonthlyIncome: 0,
    totalMonthlyExpense: 0,
    upcomingCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<RecurringTransactionWithCategory | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const loadData = useCallback(async () => {
    try {
      const [transactions, summaryData] = await Promise.all([
        getAllRecurringTransactions(true),
        getRecurringSummary(),
      ]);
      setRecurringTransactions(transactions);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      await deleteRecurringTransaction(selectedTransaction.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      await toggleRecurringTransactionActive(selectedTransaction.id, !selectedTransaction.isActive);
      await loadData();
      setShowActionMenu(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNow = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      await manuallyGenerateRecurringTransaction(selectedTransaction.id);
      await loadData();
      setShowActionMenu(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error generating transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const openActionMenu = (transaction: RecurringTransactionWithCategory, x: number, y: number) => {
    setSelectedTransaction(transaction);
    setMenuAnchor({ x, y });
    setShowActionMenu(true);
  };

  const openDeleteDialog = () => {
    setShowActionMenu(false);
    setShowDeleteDialog(true);
  };

  const renderRecurringCard = (transaction: RecurringTransactionWithCategory) => {
    const isIncome = transaction.type === 'income';
    const amountColor = isIncome ? theme.colors.income : theme.colors.expense;

    return (
      <Card
        key={transaction.id}
        style={[
          styles.card,
          !transaction.isActive && styles.inactiveCard,
        ]}
        onPress={() => {}}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${transaction.category?.color || '#999'}30` }]}>
                <Text style={[styles.iconText, { color: transaction.category?.color || '#999' }]}>
                  {isIncome ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text variant="titleSmall" numberOfLines={1}>
                  {transaction.description || transaction.category?.name || t('transactions.recurringTransaction')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {transaction.category?.name} • {formatFrequency(transaction.frequency)}
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text variant="titleSmall" style={{ color: amountColor }}>
                {isIncome ? '+' : '-'}฿{transaction.amount.toLocaleString()}
              </Text>
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={(event) => {
                  const { pageX, pageY } = event.nativeEvent;
                  openActionMenu(transaction, pageX, pageY);
                }}
              />
            </View>
          </View>

          <Divider style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {t('transactions.nextDue')}
              </Text>
              <Text variant="bodySmall">
                {formatDate(transaction.nextDueDate, language)}
              </Text>
            </View>
            {transaction.endDate && (
              <View style={styles.footerItem}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {t('transactions.endDate')}
                </Text>
                <Text variant="bodySmall">
                  {formatDate(transaction.endDate, language)}
                </Text>
              </View>
            )}
            {!transaction.isActive && (
              <Chip compact style={styles.inactiveChip}>
                {t('transactions.inactive')}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={styles.summaryContainer}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.summaryContent}>
            <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer }}>
              {summary.activeCount}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
              {t('transactions.activeRecurring')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: `${theme.colors.income}20` }]}>
          <Card.Content style={styles.summaryContent}>
            <Text variant="titleMedium" style={{ color: theme.colors.income }}>
              +฿{Math.round(summary.totalMonthlyIncome).toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {t('dashboard.totalIncome')}/{t('common.monthly')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: `${theme.colors.expense}20` }]}>
          <Card.Content style={styles.summaryContent}>
            <Text variant="titleMedium" style={{ color: theme.colors.expense }}>
              -฿{Math.round(summary.totalMonthlyExpense).toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {t('dashboard.totalExpenses')}/{t('common.monthly')}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.listHeader}>
        <Text variant="titleMedium">{t('transactions.recurringTransactions')}</Text>
        <Button
          mode="contained-tonal"
          icon="plus"
          onPress={() => router.push('/transactions/new')}
          compact
        >
          {t('common.add')}
        </Button>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {recurringTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center' }}>
              {t('transactions.noTransactions')}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 8 }}>
              {t('transactions.addFirstTransaction')}
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/transactions/new')}
              style={{ marginTop: 16 }}
            >
              {t('transactions.newTransaction')}
            </Button>
          </View>
        ) : (
          <>
            {recurringTransactions.filter(t => t.isActive).length > 0 && (
              <>
                <Text variant="labelMedium" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
                  {t('transactions.activeRecurring')}
                </Text>
                {recurringTransactions
                  .filter(t => t.isActive)
                  .map(renderRecurringCard)}
              </>
            )}

            {recurringTransactions.filter(t => !t.isActive).length > 0 && (
              <>
                <Text variant="labelMedium" style={[styles.sectionHeader, { color: theme.colors.outline }]}>
                  {t('transactions.inactive')}
                </Text>
                {recurringTransactions
                  .filter(t => !t.isActive)
                  .map(renderRecurringCard)}
              </>
            )}
          </>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Portal>
        <Menu
          visible={showActionMenu}
          onDismiss={() => setShowActionMenu(false)}
          anchor={menuAnchor}
        >
          <Menu.Item
            leadingIcon={selectedTransaction?.isActive ? 'pause' : 'play'}
            onPress={handleToggleActive}
            title={selectedTransaction?.isActive ? t('transactions.pauseRecurring') : t('transactions.resumeRecurring')}
          />
          <Menu.Item
            leadingIcon="lightning-bolt"
            onPress={handleGenerateNow}
            title={t('transactions.generateNow')}
          />
          <Divider />
          <Menu.Item
            leadingIcon="delete"
            onPress={openDeleteDialog}
            title={t('transactions.deleteRecurring')}
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      </Portal>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>{t('common.delete')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('dialogs.deleteRecurringConfirm')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleDelete} loading={loading} textColor={theme.colors.error}>
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
  },
  summaryContent: {
    alignItems: 'center',
    padding: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
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
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDivider: {
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    gap: 4,
  },
  inactiveChip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  bottomPadding: {
    height: 32,
  },
});
