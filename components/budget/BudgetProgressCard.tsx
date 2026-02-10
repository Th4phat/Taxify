import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BudgetProgress } from '@/types';

interface BudgetProgressCardProps {
  progress: BudgetProgress;
  onPress?: () => void;
  compact?: boolean;
}

export function BudgetProgressCard({
  progress,
  onPress,
  compact = false,
}: BudgetProgressCardProps) {
  const theme = useTheme();
  const { budget, spent, remaining, percentUsed, isOverBudget, alertTriggered } = progress;
  
  const getProgressColor = () => {
    if (isOverBudget) return theme.colors.error;
    if (alertTriggered) return theme.colors.warning || '#F59E0B';
    if (percentUsed >= 90) return '#F59E0B';
    return theme.colors.primary;
  };
  
  const getStatusIcon = () => {
    if (isOverBudget) return 'alert-circle';
    if (alertTriggered) return 'alert';
    if (percentUsed >= 90) return 'alert-outline';
    return 'check-circle';
  };
  
  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`;
  };
  
  if (compact) {
    return (
      <Card style={styles.compactCard} onPress={onPress}>
        <Card.Content style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
              {budget.name}
            </Text>
            <MaterialCommunityIcons
              name={getStatusIcon()}
              size={16}
              color={getProgressColor()}
            />
          </View>
          <ProgressBar
            progress={Math.min(percentUsed / 100, 1)}
            color={getProgressColor()}
            style={styles.compactProgress}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            {formatCurrency(spent)} / {formatCurrency(budget.amount)}
          </Text>
        </Card.Content>
      </Card>
    );
  }
  
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              {budget.name}
            </Text>
            {budget.category && (
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {budget.category.nameTh || budget.category.name}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: getProgressColor() + '20' }]}>
            <MaterialCommunityIcons
              name={getStatusIcon()}
              size={16}
              color={getProgressColor()}
            />
          </View>
        </View>
        
        <View style={styles.amountsRow}>
          <View style={styles.amountItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Budget
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              {formatCurrency(budget.amount)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Spent
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '600', color: getProgressColor() }}>
              {formatCurrency(spent)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {isOverBudget ? 'Over' : 'Remaining'}
            </Text>
            <Text 
              variant="titleMedium" 
              style={{ fontWeight: '600', color: isOverBudget ? theme.colors.error : theme.colors.success }}
            >
              {formatCurrency(Math.abs(remaining))}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {percentUsed.toFixed(0)}% used
            </Text>
            {alertTriggered && (
              <Text variant="labelSmall" style={{ color: theme.colors.warning || '#F59E0B' }}>
                Alert threshold reached
              </Text>
            )}
          </View>
          <ProgressBar
            progress={Math.min(percentUsed / 100, 1)}
            color={getProgressColor()}
            style={styles.progressBar}
          />
        </View>
        
        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
          {budget.period === 'monthly' ? 'Monthly' : budget.period === 'yearly' ? 'Yearly' : 'Custom'} • {' '}
          {new Date(budget.startDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })} - {' '}
          {budget.endDate 
            ? new Date(budget.endDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
            : 'Ongoing'}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  compactCard: {
    width: 160,
    marginRight: 8,
    elevation: 2,
  },
  compactContent: {
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactProgress: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountItem: {
    alignItems: 'flex-start',
  },
  progressSection: {
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});

export default BudgetProgressCard;
