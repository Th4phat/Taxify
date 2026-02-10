import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TaxOptimizationSuggestion, TaxOptimizationResult } from '@/services/tax/optimization.service';

interface TaxOptimizationCardProps {
  result: TaxOptimizationResult | null;
  loading?: boolean;
  onSuggestionPress?: (suggestion: TaxOptimizationSuggestion) => void;
  onViewAllPress?: () => void;
}

export function TaxOptimizationCard({
  result,
  loading = false,
  onSuggestionPress,
  onViewAllPress,
}: TaxOptimizationCardProps) {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Analyzing...</Text>
        </Card.Content>
      </Card>
    );
  }
  
  if (!result) return null;
  
  const { suggestions, totalPotentialSavings, currentBracket, amountToNextBracket, effectiveTaxRate } = result;
  const topSuggestions = suggestions.slice(0, 3);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning || '#F59E0B';
      default: return theme.colors.primary;
    }
  };
  
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'deduction': return 'receipt';
      case 'investment': return 'chart-line';
      case 'income_timing': return 'calendar-clock';
      case 'bracket_management': return 'arrow-up-circle';
      default: return 'lightbulb';
    }
  };
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              💡 Tax Optimization
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Potential Savings: ฿{totalPotentialSavings.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.taxRateBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
              {(effectiveTaxRate * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
        
        {amountToNextBracket > 0 && (
          <View style={styles.bracketSection}>
            <View style={styles.bracketInfo}>
              <Text variant="bodySmall">Current Bracket: {(currentBracket.rate * 100).toFixed(0)}%</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                ฿{amountToNextBracket.toLocaleString()} to next bracket
              </Text>
            </View>
            <ProgressBar
              progress={1 - (amountToNextBracket / (currentBracket.maxIncome - currentBracket.minIncome))}
              color={amountToNextBracket < 50000 ? theme.colors.error : theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
        )}
        
        <View style={styles.suggestionsContainer}>
          {topSuggestions.map((suggestion, index) => (
            <View key={suggestion.id} style={styles.suggestionItem}>
              <View style={[styles.iconContainer, { backgroundColor: getPriorityColor(suggestion.priority) + '20' }]}>
                <MaterialCommunityIcons
                  name={getSuggestionIcon(suggestion.type)}
                  size={20}
                  color={getPriorityColor(suggestion.priority)}
                />
              </View>
              <View style={styles.suggestionContent}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ fontWeight: '500' }}>
                  {suggestion.title}
                </Text>
                <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.outline }}>
                  {suggestion.description}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                  Save ~฿{suggestion.potentialSavings.toLocaleString()}
                </Text>
              </View>
              {onSuggestionPress && (
                <Button
                  mode="text"
                  compact
                  onPress={() => onSuggestionPress(suggestion)}
                  style={styles.actionButton}
                >
                  View
                </Button>
              )}
            </View>
          ))}
        </View>
        
        {suggestions.length > 3 && onViewAllPress && (
          <Button
            mode="outlined"
            onPress={onViewAllPress}
            style={{ marginTop: 12 }}
          >
            View All {suggestions.length} Suggestions
          </Button>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taxRateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  bracketSection: {
    marginBottom: 16,
  },
  bracketInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  actionButton: {
    marginLeft: 8,
  },
});

export default TaxOptimizationCard;
