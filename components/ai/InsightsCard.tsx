import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, Text, Surface, IconButton, Chip, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ExpenseInsight, InsightType } from '@/types/ai';

interface InsightsCardProps {
  insights: ExpenseInsight[];
  onInsightPress?: (insight: ExpenseInsight) => void;
  onViewAllPress?: () => void;
  isLoading?: boolean;
}

const INSIGHT_ICONS: Record<InsightType, string> = {
  spending_trend: 'chart-line',
  category_anomaly: 'alert-circle',
  comparison: 'compare',
  seasonal_pattern: 'calendar-month',
  budget_alert: 'wallet',
  saving_opportunity: 'piggy-bank',
  tax_relevance: 'file-document',
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  spending_trend: '#2196F3',
  category_anomaly: '#FF9800',
  comparison: '#9C27B0',
  seasonal_pattern: '#4CAF50',
  budget_alert: '#F44336',
  saving_opportunity: '#00BCD4',
  tax_relevance: '#795548',
};

export function InsightsCard({
  insights,
  onInsightPress,
  onViewAllPress,
  isLoading,
}: InsightsCardProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="brain"
            size={32}
            color={theme.colors.primary}
            style={styles.loadingIcon}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            AI is analyzing your spending...
          </Text>
        </View>
      </Surface>
    );
  }

  if (insights.length === 0) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={40}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No insights yet. Add more transactions for AI analysis.
          </Text>
        </View>
      </Surface>
    );
  }

  const topInsights = insights.slice(0, 3);

  const getSeverityIcon = (severity: ExpenseInsight['severity']) => {
    switch (severity) {
      case 'warning':
        return 'alert';
      case 'positive':
        return 'check-circle';
      default:
        return 'information';
    }
  };

  const getSeverityColor = (severity: ExpenseInsight['severity']) => {
    switch (severity) {
      case 'warning':
        return theme.colors.error;
      case 'positive':
        return theme.colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <MaterialCommunityIcons
            name="auto-fix"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            AI Insights
          </Text>
        </View>
        {insights.length > 3 && onViewAllPress && (
          <Button
            mode="text"
            onPress={onViewAllPress}
            compact
          >
            View All ({insights.length})
          </Button>
        )}
      </View>

      <View style={styles.insightsList}>
        {topInsights.map((insight, index) => (
          <TouchableOpacity
            key={insight.id}
            onPress={() => onInsightPress?.(insight)}
            activeOpacity={0.7}
            style={[
              styles.insightItem,
              index < topInsights.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${INSIGHT_COLORS[insight.type]}20` },
              ]}
            >
              <MaterialCommunityIcons
                name={INSIGHT_ICONS[insight.type] as any}
                size={20}
                color={INSIGHT_COLORS[insight.type]}
              />
            </View>

            <View style={styles.insightContent}>
              <View style={styles.insightHeader}>
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: '600', flex: 1 }}
                  numberOfLines={1}
                >
                  {insight.title}
                </Text>
                <MaterialCommunityIcons
                  name={getSeverityIcon(insight.severity) as any}
                  size={16}
                  color={getSeverityColor(insight.severity)}
                />
              </View>
              
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={2}
              >
                {insight.description}
              </Text>

              {insight.amount !== undefined && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.amount,
                    { color: theme.colors.primary },
                  ]}
                >
                  {insight.amount.toLocaleString()} THB
                  {insight.percentageChange !== undefined && (
                    <Text style={{ color: insight.percentageChange > 0 ? theme.colors.error : theme.colors.primary }}>
                      {' '}({insight.percentageChange > 0 ? '+' : ''}{insight.percentageChange.toFixed(1)}%)
                    </Text>
                  )}
                </Text>
              )}

              {insight.suggestedAction && (
                <Chip
                  style={styles.actionChip}
                  textStyle={{ fontSize: 10 }}
                  compact
                >
                  {insight.suggestedAction}
                </Chip>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Surface>
  );
}

interface InsightDetailModalProps {
  insight: ExpenseInsight | null;
  visible: boolean;
  onDismiss: () => void;
}

export function InsightDetailContent({ insight }: { insight: ExpenseInsight }) {
  const theme = useTheme();

  if (!insight) return null;

  return (
    <ScrollView style={styles.detailContainer}>
      <View
        style={[
          styles.detailIcon,
          { backgroundColor: `${INSIGHT_COLORS[insight.type]}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={INSIGHT_ICONS[insight.type] as any}
          size={40}
          color={INSIGHT_COLORS[insight.type]}
        />
      </View>

      <Text variant="headlineSmall" style={styles.detailTitle}>
        {insight.title}
      </Text>

      <Chip
        style={[
          styles.detailTypeChip,
          { backgroundColor: `${INSIGHT_COLORS[insight.type]}20` },
        ]}
        textStyle={{ color: INSIGHT_COLORS[insight.type] }}
      >
        {insight.type.replace('_', ' ').toUpperCase()}
      </Chip>

      <Text variant="bodyLarge" style={styles.detailDescription}>
        {insight.description}
      </Text>

      {insight.amount !== undefined && (
        <Surface style={styles.detailAmountCard}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Amount
          </Text>
          <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
            {insight.amount.toLocaleString()} THB
          </Text>
          {insight.percentageChange !== undefined && (
            <Text
              variant="bodyMedium"
              style={{
                color: insight.percentageChange > 0 ? theme.colors.error : theme.colors.primary,
              }}
            >
              {insight.percentageChange > 0 ? '+' : ''}{insight.percentageChange.toFixed(1)}% change
            </Text>
          )}
        </Surface>
      )}

      {insight.suggestedAction && (
        <View style={styles.suggestedAction}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Suggested Action
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4 }}>
            {insight.suggestedAction}
          </Text>
        </View>
      )}

      <Text variant="bodySmall" style={styles.generatedAt}>
        Generated on {insight.generatedAt.toLocaleDateString()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingIcon: {
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  insightsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amount: {
    fontWeight: '600',
  },
  actionChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  detailContainer: {
    padding: 24,
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  detailTypeChip: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailDescription: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailAmountCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestedAction: {
    padding: 16,
    marginBottom: 16,
  },
  generatedAt: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});
