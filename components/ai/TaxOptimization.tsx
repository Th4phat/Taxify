import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, Text, Surface, Button, Chip, ProgressBar, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { TaxOptimizationSuggestion, TaxOptimizationReport } from '@/types/ai';

interface TaxOptimizationCardProps {
  report: TaxOptimizationReport | null;
  onSuggestionPress?: (suggestion: TaxOptimizationSuggestion) => void;
  onGenerateReport?: () => void;
  isLoading?: boolean;
}

export function TaxOptimizationCard({
  report,
  onSuggestionPress,
  onGenerateReport,
  isLoading,
}: TaxOptimizationCardProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="brain"
            size={40}
            color={theme.colors.primary}
            style={styles.loadingIcon}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            AI is analyzing your tax optimization opportunities...
          </Text>
        </View>
      </Surface>
    );
  }

  if (!report) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="calculator-variant"
            size={48}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text variant="titleMedium" style={{ marginTop: 12, marginBottom: 4 }}>
            Tax Optimization Report
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}
          >
            Get AI-powered suggestions to reduce your tax liability
          </Text>
          <Button
            mode="contained"
            onPress={onGenerateReport}
            icon="auto-fix"
          >
            Generate Report
          </Button>
        </View>
      </Surface>
    );
  }

  const sortedSuggestions = [...report.suggestions].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialSaving - a.potentialSaving;
  });

  const topSuggestions = sortedSuggestions.slice(0, 3);

  const getDifficultyColor = (difficulty: TaxOptimizationSuggestion['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return theme.colors.primary;
      case 'medium':
        return theme.colors.tertiary;
      case 'hard':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getPriorityIcon = (priority: TaxOptimizationSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'flag';
      case 'medium':
        return 'flag-outline';
      default:
        return 'flag-variant-outline';
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <MaterialCommunityIcons
            name="auto-fix"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            Tax Optimization
          </Text>
        </View>
        <Chip icon="check-circle" compact>
          {report.suggestions.length} suggestions
        </Chip>
      </View>

      <View style={styles.summaryContainer}>
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            Potential Savings
          </Text>
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {report.totalPotentialSavings.toLocaleString()} THB
          </Text>
        </Surface>

        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer }}>
            Current Tax
          </Text>
          <Text variant="titleLarge" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
            {report.currentTaxAmount.toLocaleString()} THB
          </Text>
        </Surface>
      </View>

      {report.amountToNextBracket !== null && report.amountToNextBracket > 0 && (
        <Surface style={[styles.bracketCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.bracketInfo}>
            <MaterialCommunityIcons
              name="trending-up"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                Next Tax Bracket
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {report.amountToNextBracket.toLocaleString()} THB more income will push you to the next bracket
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={1 - (report.amountToNextBracket / (report.nextBracketThreshold || 1))}
            color={theme.colors.tertiary}
            style={styles.bracketProgress}
          />
        </Surface>
      )}

      <View style={styles.suggestionsContainer}>
        <Text variant="titleSmall" style={styles.suggestionsTitle}>
          Top Recommendations
        </Text>

        {topSuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={suggestion.id}
            onPress={() => onSuggestionPress?.(suggestion)}
            activeOpacity={0.7}
          >
            <Surface
              style={[
                styles.suggestionItem,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.suggestionHeader}>
                <View style={styles.suggestionType}>
                  <MaterialCommunityIcons
                    name={getSuggestionIcon(suggestion.type) as any}
                    size={20}
                    color={getSuggestionColor(suggestion.type)}
                  />
                  <Text
                    variant="labelSmall"
                    style={{ color: getSuggestionColor(suggestion.type) }}
                  >
                    {suggestion.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Chip
                  compact
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor:
                        suggestion.priority === 'high'
                          ? theme.colors.errorContainer
                          : suggestion.priority === 'medium'
                          ? theme.colors.tertiaryContainer
                          : theme.colors.surface,
                    },
                  ]}
                  textStyle={{
                    color:
                      suggestion.priority === 'high'
                        ? theme.colors.error
                        : suggestion.priority === 'medium'
                        ? theme.colors.tertiary
                        : theme.colors.onSurfaceVariant,
                  }}
                >
                  {suggestion.priority}
                </Chip>
              </View>

              <Text variant="bodyMedium" style={{ fontWeight: '600', marginTop: 8 }}>
                {suggestion.title}
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                numberOfLines={2}
              >
                {suggestion.description}
              </Text>

              <View style={styles.suggestionFooter}>
                <Surface style={[styles.savingChip, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons
                    name="currency-thb"
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    Save {suggestion.potentialSaving.toLocaleString()}
                  </Text>
                </Surface>

                <Chip
                  compact
                  style={{ backgroundColor: `${getDifficultyColor(suggestion.difficulty)}20` }}
                  textStyle={{ color: getDifficultyColor(suggestion.difficulty) }}
                >
                  {suggestion.difficulty}
                </Chip>
              </View>

              {suggestion.deadline && (
                <View style={styles.deadlineRow}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Deadline: {suggestion.deadline.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>
        ))}
      </View>

      {report.suggestions.length > 3 && (
        <Button
          mode="text"
          onPress={onGenerateReport}
          style={{ marginTop: 8 }}
        >
          View All {report.suggestions.length} Suggestions
        </Button>
      )}
    </Surface>
  );
}

function getSuggestionIcon(type: TaxOptimizationSuggestion['type']): string {
  switch (type) {
    case 'additional_deduction':
      return 'receipt-text';
    case 'investment_opportunity':
      return 'trending-up';
    case 'income_timing':
      return 'calendar-clock';
    case 'bracket_optimization':
      return 'chart-bell-curve';
    case 'missing_document':
      return 'file-document-outline';
    default:
      return 'lightbulb';
  }
}

function getSuggestionColor(type: TaxOptimizationSuggestion['type']): string {
  switch (type) {
    case 'additional_deduction':
      return '#4CAF50';
    case 'investment_opportunity':
      return '#2196F3';
    case 'income_timing':
      return '#FF9800';
    case 'bracket_optimization':
      return '#9C27B0';
    case 'missing_document':
      return '#F44336';
    default:
      return '#757575';
  }
}

interface SuggestionDetailProps {
  suggestion: TaxOptimizationSuggestion;
}

export function SuggestionDetail({ suggestion }: SuggestionDetailProps) {
  const theme = useTheme();

  return (
    <ScrollView style={styles.detailContainer}>
      <View
        style={[
          styles.detailIcon,
          { backgroundColor: `${getSuggestionColor(suggestion.type)}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={getSuggestionIcon(suggestion.type) as any}
          size={40}
          color={getSuggestionColor(suggestion.type)}
        />
      </View>

      <Text variant="headlineSmall" style={styles.detailTitle}>
        {suggestion.title}
      </Text>

      <View style={styles.detailChips}>
        <Chip
          style={{ backgroundColor: `${getSuggestionColor(suggestion.type)}20` }}
          textStyle={{ color: getSuggestionColor(suggestion.type) }}
        >
          {suggestion.type.replace('_', ' ')}
        </Chip>
        <Chip
          style={{
            backgroundColor:
              suggestion.priority === 'high'
                ? theme.colors.errorContainer
                : suggestion.priority === 'medium'
                ? theme.colors.tertiaryContainer
                : theme.colors.surfaceVariant,
          }}
          textStyle={{
            color:
              suggestion.priority === 'high'
                ? theme.colors.error
                : suggestion.priority === 'medium'
                ? theme.colors.tertiary
                : theme.colors.onSurfaceVariant,
          }}
        >
          {suggestion.priority} priority
        </Chip>
      </View>

      <Surface style={[styles.savingCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
          Potential Tax Savings
        </Text>
        <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {suggestion.potentialSaving.toLocaleString()} THB
        </Text>
      </Surface>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Description
        </Text>
        <Text variant="bodyMedium" style={styles.sectionContent}>
          {suggestion.description}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Action Required
        </Text>
        <Surface style={[styles.actionCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons
            name="checkbox-marked-circle-outline"
            size={20}
            color={theme.colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {suggestion.actionRequired}
          </Text>
        </Surface>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Difficulty Level
        </Text>
        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <View
              key={level}
              style={[
                styles.difficultyDot,
                {
                  backgroundColor:
                    level === suggestion.difficulty
                      ? level === 'easy'
                        ? theme.colors.primary
                        : level === 'medium'
                        ? theme.colors.tertiary
                        : theme.colors.error
                      : theme.colors.surfaceDisabled,
                },
              ]}
            />
          ))}
          <Text
            variant="bodyMedium"
            style={{
              marginLeft: 8,
              textTransform: 'capitalize',
              color:
                suggestion.difficulty === 'easy'
                  ? theme.colors.primary
                  : suggestion.difficulty === 'medium'
                  ? theme.colors.tertiary
                  : theme.colors.error,
            }}
          >
            {suggestion.difficulty}
          </Text>
        </View>
      </View>

      {suggestion.deadline && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Deadline
          </Text>
          <View style={styles.deadlineCard}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.colors.error} />
            <Text variant="bodyMedium" style={{ color: theme.colors.error, marginLeft: 8 }}>
              {suggestion.deadline.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
      )}
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
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingIcon: {
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bracketCard: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bracketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bracketProgress: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionsTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityChip: {
    height: 24,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  savingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
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
    marginBottom: 12,
  },
  detailChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  savingCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    lineHeight: 22,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
});
