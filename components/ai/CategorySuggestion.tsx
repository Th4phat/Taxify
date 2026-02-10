import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, Text, Surface, Chip, ProgressBar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { CategorySuggestion, AutoCategorizationResult } from '@/types/ai';
import type { Category } from '@/types';

interface CategorySuggestionProps {
  suggestion: AutoCategorizationResult;
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

export function CategorySuggestionCard({
  suggestion,
  categories,
  onSelectCategory,
  onDismiss,
  isLoading,
}: CategorySuggestionProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="brain"
            size={32}
            color={theme.colors.primary}
            style={styles.loadingIcon}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            AI is analyzing...
          </Text>
        </View>
      </Surface>
    );
  }

  if (suggestion.error || !suggestion.suggestion) {
    return null;
  }

  const primarySuggestion = suggestion.suggestion;
  const alternatives = suggestion.alternatives.slice(0, 2);
  
  const primaryCategory = categories.find(c => c.id === primarySuggestion.categoryId);
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return theme.colors.primary;
    if (confidence >= 0.5) return theme.colors.tertiary;
    return theme.colors.error;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.header}>
        <View style={styles.aiBadge}>
          <MaterialCommunityIcons name="auto-fix" size={14} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            AI Suggestion
          </Text>
        </View>
        {onDismiss && (
          <IconButton
            icon="close"
            size={18}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
          />
        )}
      </View>

      <TouchableOpacity
        onPress={() => onSelectCategory(primarySuggestion.categoryId)}
        activeOpacity={0.7}
      >
        <Surface
          style={[
            styles.primarySuggestion,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <View style={styles.primaryContent}>
            <View style={styles.categoryInfo}>
              {primaryCategory && (
                <MaterialCommunityIcons
                  name={primaryCategory.icon as any}
                  size={24}
                  color={theme.colors.primary}
                  style={styles.categoryIcon}
                />
              )}
              <View>
                <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
                  {primarySuggestion.categoryName}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {primarySuggestion.reason}
                </Text>
              </View>
            </View>
            
            <View style={styles.confidenceContainer}>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {Math.round(primarySuggestion.confidence * 100)}% match
              </Text>
              <ProgressBar
                progress={primarySuggestion.confidence}
                color={getConfidenceColor(primarySuggestion.confidence)}
                style={styles.confidenceBar}
              />
            </View>
          </View>
        </Surface>
      </TouchableOpacity>

      {alternatives.length > 0 && (
        <View style={styles.alternativesContainer}>
          <Text variant="bodySmall" style={[styles.alternativesLabel, { color: theme.colors.onSurfaceVariant }]}>
            Other options:
          </Text>
          <View style={styles.alternativesList}>
            {alternatives.map((alt, index) => (
              <Chip
                key={index}
                onPress={() => onSelectCategory(alt.categoryId)}
                style={styles.alternativeChip}
                textStyle={{ fontSize: 12 }}
              >
                {alt.categoryName} ({Math.round(alt.confidence * 100)}%)
              </Chip>
            ))}
          </View>
        </View>
      )}
    </Surface>
  );
}

interface QuickCategoryHintProps {
  description: string;
  onApply: (categoryName: string) => void;
}

export function QuickCategoryHint({ description, onApply }: QuickCategoryHintProps) {
  const theme = useTheme();
  
  const hints: Array<{ pattern: RegExp; category: string; icon: string }> = [
    { pattern: /7-eleven|7e|seven/i, category: 'Convenience Store', icon: 'store' },
    { pattern: /ptt|shell|esso|gas/i, category: 'Fuel', icon: 'gas-station' },
    { pattern: /tesco|lotus|big\s?c/i, category: 'Groceries', icon: 'cart' },
    { pattern: /grab|foodpanda|lineman/i, category: 'Food Delivery', icon: 'motorbike' },
    { pattern: /starbucks|cafe|coffee/i, category: 'Coffee', icon: 'coffee' },
    { pattern: /bts|mrt|taxi|transport/i, category: 'Transport', icon: 'train' },
  ];

  const match = hints.find(h => h.pattern.test(description));
  
  if (!match) return null;

  return (
    <TouchableOpacity
      onPress={() => onApply(match.category)}
      activeOpacity={0.7}
    >
      <Surface
        style={[
          styles.quickHint,
          { backgroundColor: theme.colors.secondaryContainer },
        ]}
      >
        <MaterialCommunityIcons
          name={match.icon as any}
          size={16}
          color={theme.colors.secondary}
        />
        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
          Usually: {match.category}
        </Text>
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingIcon: {
    marginBottom: 8,
  },
  primarySuggestion: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryContent: {
    padding: 16,
    gap: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
  },
  confidenceContainer: {
    gap: 4,
  },
  confidenceBar: {
    height: 4,
    borderRadius: 2,
  },
  alternativesContainer: {
    marginTop: 12,
  },
  alternativesLabel: {
    marginBottom: 8,
  },
  alternativesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alternativeChip: {
    height: 32,
  },
  quickHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
});
