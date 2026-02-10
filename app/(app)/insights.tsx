
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, Button, Portal, Modal, IconButton } from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { generateSpendingInsights } from '@/services/ai/expenseInsights.service';
import { InsightDetailContent } from '@/components/ai/InsightsCard';
import type { ExpenseInsight, NaturalLanguageQuery } from '@/types/ai';
import type { AppTheme } from '@/types/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { processNaturalLanguageQuery } from '@/services/ai/expenseInsights.service';

export default function InsightsScreen() {
  const theme = useTheme<AppTheme>();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const [insights, setInsights] = useState<ExpenseInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<ExpenseInsight | null>(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<NaturalLanguageQuery | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('insights.title'),
    });
  }, [navigation, t]);

  const loadInsights = useCallback(async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const generatedInsights = await generateSpendingInsights(startDate, endDate);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  }, [loadInsights]);

  const handleAskAI = async (question: string) => {
    setQuery(question);
    setQueryLoading(true);
    const result = await processNaturalLanguageQuery(question);
    setQueryResult(result);
    setQueryLoading(false);
  };

  const INSIGHT_COLORS: Record<string, string> = {
    spending_trend: '#2196F3',
    category_anomaly: '#FF9800',
    comparison: '#9C27B0',
    seasonal_pattern: '#4CAF50',
    budget_alert: '#F44336',
    saving_opportunity: '#00BCD4',
    tax_relevance: '#795548',
  };

  const INSIGHT_ICONS: Record<string, string> = {
    spending_trend: 'chart-line',
    category_anomaly: 'alert-circle',
    comparison: 'compare',
    seasonal_pattern: 'calendar-month',
    budget_alert: 'wallet',
    saving_opportunity: 'piggy-bank',
    tax_relevance: 'file-document',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Surface style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="brain" size={32} color={theme.colors.primary} />
          <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, marginTop: 8 }}>
            {t('insights.title')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
            {t('insights.subtitle')}
          </Text>
        </Surface>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('insights.askAI')}
        </Text>
        <View style={styles.quickQuestions}>
          {[
            t('insights.question1'),
            t('insights.question2'),
            t('insights.question3'),
            t('insights.question4'),
          ].map((q, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleAskAI(q)}
              style={[styles.questionButton, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text variant="bodySmall">{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {queryResult && (
          <Surface style={styles.queryResultCard}>
            <View style={styles.queryHeader}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Q: {queryResult.query}
              </Text>
              <IconButton
                icon="close"
                size={16}
                onPress={() => setQueryResult(null)}
              />
            </View>
            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
              {queryResult.result.answer}
            </Text>
          </Surface>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('insights.allInsights', { count: insights.length })}
        </Text>

        {loading ? (
          <Text style={{ textAlign: 'center', padding: 32 }}>{t('insights.loading')}</Text>
        ) : insights.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={48}
              color={theme.colors.onSurfaceDisabled}
            />
            <Text variant="bodyLarge" style={{ marginTop: 12 }}>
              {t('insights.noInsights')}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {t('insights.addMore')}
            </Text>
          </Surface>
        ) : (
          insights.map((insight) => (
            <TouchableOpacity
              key={insight.id}
              onPress={() => setSelectedInsight(insight)}
              activeOpacity={0.7}
            >
              <Surface style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: `${INSIGHT_COLORS[insight.type]}20` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={INSIGHT_ICONS[insight.type] as any}
                      size={24}
                      color={INSIGHT_COLORS[insight.type]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {insight.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {insight.type.replace('_', ' ')}
                    </Text>
                  </View>
                  {insight.severity === 'warning' && (
                    <MaterialCommunityIcons name="alert" size={20} color={theme.colors.error} />
                  )}
                  {insight.severity === 'positive' && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                  )}
                </View>

                <Text
                  variant="bodyMedium"
                  style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}
                >
                  {insight.description}
                </Text>

                {insight.amount !== undefined && (
                  <Text variant="bodyLarge" style={{ color: theme.colors.primary, marginTop: 8 }}>
                    {insight.amount.toLocaleString()} THB
                  </Text>
                )}

                {insight.suggestedAction && (
                  <Button
                    mode="text"
                    compact
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  >
                    {insight.suggestedAction}
                  </Button>
                )}
              </Surface>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={!!selectedInsight}
          onDismiss={() => setSelectedInsight(null)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {selectedInsight && <InsightDetailContent insight={selectedInsight} />}
          <Button onPress={() => setSelectedInsight(null)} style={{ margin: 16 }}>
            {t('common.close')}
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
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  questionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  queryResultCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
});
