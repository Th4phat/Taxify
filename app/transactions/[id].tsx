
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Card,
  IconButton,
  Divider,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
  Menu,
} from 'react-native-paper';
import { router, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import { formatCurrency, formatDateFull } from '@/utils/formatters';
import {
  getTransactionById,
  deleteTransaction,
  type TransactionWithCategory,
} from '@/database/repositories/transaction.repo';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';

export default function TransactionDetailScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transaction, setTransaction] = useState<TransactionWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const loadTransaction = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getTransactionById(id);
      if (data) {
        setTransaction(data);
        navigation.setOptions({
          headerTitle: data.description || t('transactions.transactionDetails'),
          headerLeft: () => (
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
            />
          ),
        });
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
    } finally {
      setLoading(false);
    }
  }, [id, navigation, t]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  useFocusEffect(
    useCallback(() => {
      loadTransaction();
    }, [loadTransaction])
  );

  useEffect(() => {
    if (transaction) {
      navigation.setOptions({
        headerTitle: transaction.description || t('transactions.transactionDetails'),
        headerLeft: () => (
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
        ),
      });
    }
  }, [language, navigation, t, transaction]);

  const handleEdit = () => {
    setShowMenu(false);
    router.push(`/transactions/edit/${id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteTransaction(id);
      setShowDeleteDialog(false);
      router.back();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert(t('common.error'), t('transactions.failedToDelete'));
    }
  };

  const confirmDelete = () => {
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">{t('transactions.transactionNotFound')}</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          {t('common.goBack')}
        </Button>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';
  const typeColor = isIncome ? theme.colors.income : theme.colors.expense;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerActions}>
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={() => setShowMenu(true)}
            />
          }
        >
          <Menu.Item
            onPress={handleEdit}
            title={t('common.edit')}
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={confirmDelete}
            title={t('common.delete')}
            leadingIcon="delete"
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.amountCard, { backgroundColor: typeColor }]}>
          <Card.Content style={styles.amountContent}>
            <Text style={styles.amountLabel}>
              {isIncome ? t('transactions.income') : t('transactions.expense')}
            </Text>
            <Text style={styles.amountValue}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={styles.amountCurrency}>THB</Text>
          </Card.Content>
        </Card>

        <Card style={styles.detailsCard}>
          <Card.Content>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Text style={{ fontSize: 20, color: transaction.category?.color || theme.colors.primary }}>
                  ●
                </Text>
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('transactions.category')}
                </Text>
                <Text variant="bodyLarge">
                  {transaction.category?.name || t('common.unknown')}
                </Text>
                {transaction.category?.nameTh && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {transaction.category.nameTh}
                  </Text>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <IconButton icon="calendar" size={20} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('transactions.date')}
                </Text>
                <Text variant="bodyLarge">
                  {formatDateFull(transaction.transactionDate, language)}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <IconButton icon="text" size={20} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('transactions.description')}
                </Text>
                <Text variant="bodyLarge">
                  {transaction.description || t('transactions.noDescription')}
                </Text>
              </View>
            </View>

            {transaction.isTaxDeductible && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <IconButton icon="shield-check" size={20} />
                  </View>
                  <View style={styles.detailContent}>
                    <Chip icon="check-circle" style={styles.taxChip}>
                      {t('transactions.taxDeductible')}
                    </Chip>
                    {transaction.deductibleAmount && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        {t('transactions.deductibleAmount')}: {formatCurrency(transaction.deductibleAmount)}
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {transaction.receiptImageUri && (
          <Card style={styles.receiptCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.receiptTitle}>
                {t('transactions.receipt')}
              </Text>
              <Image
                source={{ uri: transaction.receiptImageUri }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
              {transaction.ocrConfidence && (
                <View style={styles.confidenceContainer}>
                  <Chip
                    style={[
                      styles.confidenceChip,
                      {
                        backgroundColor:
                          transaction.ocrConfidence >= 0.8
                            ? theme.colors.success
                            : transaction.ocrConfidence >= 0.5
                            ? theme.colors.warning
                            : theme.colors.error,
                      },
                    ]}
                  >
                    <Text style={styles.confidenceText}>
                      {transaction.ocrConfidence >= 0.8
                        ? t('transactions.highConfidence')
                        : transaction.ocrConfidence >= 0.5
                        ? t('transactions.mediumConfidence')
                        : t('transactions.lowConfidence')}
                    </Text>
                  </Chip>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.metadataCard}>
          <Card.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('transactions.created')}: {formatDateFull(transaction.createdAt, language)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t('transactions.lastUpdated')}: {formatDateFull(transaction.updatedAt, language)}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            icon="pencil"
            onPress={handleEdit}
            style={styles.editButton}
            buttonColor={theme.colors.primary}
          >
            {t('common.edit')}
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={confirmDelete}
            style={styles.deleteButton}
            textColor={theme.colors.error}
          >
            {t('common.delete')}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>{t('transactions.deleteTransaction')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('transactions.deleteConfirmMessage')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleDelete} textColor={theme.colors.error}>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  amountCard: {
    marginBottom: 16,
    elevation: 2,
  },
  amountContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  amountCurrency: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 4,
  },
  detailsCard: {
    marginBottom: 16,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconContainer: {
    marginRight: 8,
    marginTop: -8,
  },
  detailContent: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  taxChip: {
    alignSelf: 'flex-start',
  },
  receiptCard: {
    marginBottom: 16,
    elevation: 1,
  },
  receiptTitle: {
    marginBottom: 12,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  confidenceContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  confidenceChip: {
    paddingHorizontal: 8,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  metadataCard: {
    marginBottom: 16,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    paddingVertical: 8,
  },
  deleteButton: {
    paddingVertical: 8,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,0,0,0.05)',
  },
  backButton: {
    marginTop: 16,
  },
});
