import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';
import {
  Text,
  IconButton,
  Chip,
  Divider,
  useTheme,
  Portal,
  Modal,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/types/theme';
import type { Transaction, Category, TransactionType } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  searchTransactions,
  quickSearch,
  getSearchSuggestions,
  type SearchFilters,
  type SearchResult,
} from '@/services/search/transactionSearch.service';
import { useTranslation } from '@/hooks/useTranslation';

interface TransactionSearchProps {
  onSelectTransaction?: (transaction: Transaction) => void;
  showResults?: boolean;
  compact?: boolean;
}

export function TransactionSearch({
  onSelectTransaction,
  showResults = true,
  compact = false,
}: TransactionSearchProps) {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
      
      // Load suggestions
      loadSuggestions();
    } else {
      setSuggestions([]);
      setSearchResults(null);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, filters]);
  
  const performSearch = async () => {
    if (!query.trim() && !hasActiveFilters()) return;
    
    setLoading(true);
    try {
      const results = await searchTransactions({
        ...filters,
        query: query.trim() || undefined,
      }, 50);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadSuggestions = async () => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const results = await getSearchSuggestions(query.trim(), 5);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  };
  
  const hasActiveFilters = () => {
    return (
      filters.type !== 'all' ||
      filters.categoryId !== undefined ||
      filters.startDate !== undefined ||
      filters.endDate !== undefined ||
      filters.minAmount !== undefined ||
      filters.maxAmount !== undefined ||
      filters.hasReceipt !== undefined ||
      filters.isTaxDeductible !== undefined
    );
  };
  
  const clearSearch = () => {
    setQuery('');
    setFilters({ type: 'all' });
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };
  
  const handleSuggestionPress = (suggestion: { type: string; value: string }) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    performSearch();
  };
  
  const renderTransactionItem = ({ item }: { item: Transaction & { category: Category | null } }) => (
    <TouchableOpacity
      style={[styles.transactionItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => onSelectTransaction?.(item)}
    >
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: item.category?.color ? `${item.category.color}20` : theme.colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name={(item.category?.icon as any) || 'help-circle'}
            size={20}
            color={item.category?.color || theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {item.description || item.category?.name || t('common.unknown')}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            {formatDate(item.transactionDate)} • {item.category?.name}
          </Text>
        </View>
      </View>
      <Text
        variant="bodyLarge"
        style={{
          color: item.type === 'income' ? theme.colors.income : theme.colors.expense,
          fontWeight: '600',
        }}
      >
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  );
  
  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
      <MaterialCommunityIcons
        name="magnify"
        size={24}
        color={theme.colors.outline}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        style={[styles.searchInput, { color: theme.colors.onSurface }]}
        placeholder={t('search.placeholder') || 'Search transactions...'}
        placeholderTextColor={theme.colors.outline}
        value={query}
        onChangeText={setQuery}
        onFocus={() => query.length >= 2 && setShowSuggestions(true)}
        returnKeyType="search"
        onSubmitEditing={performSearch}
      />
      {query.length > 0 && (
        <IconButton
          icon="close"
          size={20}
          onPress={clearSearch}
          style={styles.clearButton}
        />
      )}
      <IconButton
        icon="tune"
        size={24}
        onPress={() => setShowFilterModal(true)}
        style={styles.filterButton}
        selected={hasActiveFilters()}
      />
    </View>
  );
  
  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    
    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface }]}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`${suggestion.type}-${index}`}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <MaterialCommunityIcons
              name={suggestion.type === 'category' ? 'tag' : 'store'}
              size={20}
              color={theme.colors.outline}
            />
            <Text style={styles.suggestionText}>{suggestion.value}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {suggestion.type === 'category' ? t('search.category') : t('search.merchant')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  const renderResults = () => {
    if (!searchResults || !showResults) return null;
    
    return (
      <View style={styles.resultsContainer}>
        {/* Summary */}
        <View style={styles.resultsSummary}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            {searchResults.totalCount} {t('search.results')}
          </Text>
          {searchResults.totalCount > 0 && (
            <View style={styles.totals}>
              <Text variant="bodySmall" style={{ color: theme.colors.income }}>
                +{formatCurrency(searchResults.totalIncome)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.expense, marginLeft: 8 }}>
                -{formatCurrency(searchResults.totalExpense)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Results List */}
        <FlatList
          data={searchResults.transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          ItemSeparatorComponent={() => <Divider />}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  };
  
  const renderFilterModal = () => (
    <Portal>
      <Modal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        contentContainerStyle={[
          styles.filterModal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          {t('search.filters')}
        </Text>
        
        {/* Type Filter */}
        <Text variant="bodyMedium" style={styles.filterLabel}>
          {t('search.type')}
        </Text>
        <SegmentedButtons
          value={filters.type || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, type: value as TransactionType | 'all' })
          }
          buttons={[
            { value: 'all', label: t('search.all') },
            { value: 'income', label: t('search.income') },
            { value: 'expense', label: t('search.expense') },
          ]}
          style={styles.segmentedButtons}
        />
        
        {/* Receipt Filter */}
        <Text variant="bodyMedium" style={styles.filterLabel}>
          {t('search.receipt')}
        </Text>
        <View style={styles.chipContainer}>
          <Chip
            selected={filters.hasReceipt === undefined}
            onPress={() => setFilters({ ...filters, hasReceipt: undefined })}
            style={styles.filterChip}
          >
            {t('search.all')}
          </Chip>
          <Chip
            selected={filters.hasReceipt === true}
            onPress={() => setFilters({ ...filters, hasReceipt: true })}
            style={styles.filterChip}
            icon="receipt"
          >
            {t('search.withReceipt')}
          </Chip>
          <Chip
            selected={filters.hasReceipt === false}
            onPress={() => setFilters({ ...filters, hasReceipt: false })}
            style={styles.filterChip}
          >
            {t('search.withoutReceipt')}
          </Chip>
        </View>
        
        {/* Tax Deductible Filter */}
        <Text variant="bodyMedium" style={styles.filterLabel}>
          {t('search.taxDeductible')}
        </Text>
        <View style={styles.chipContainer}>
          <Chip
            selected={filters.isTaxDeductible === undefined}
            onPress={() => setFilters({ ...filters, isTaxDeductible: undefined })}
            style={styles.filterChip}
          >
            {t('search.all')}
          </Chip>
          <Chip
            selected={filters.isTaxDeductible === true}
            onPress={() => setFilters({ ...filters, isTaxDeductible: true })}
            style={styles.filterChip}
            icon="check-circle"
          >
            {t('search.taxDeductible')}
          </Chip>
        </View>
        
        {/* Actions */}
        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={() => {
              setFilters({ type: 'all' });
            }}
          >
            {t('search.reset')}
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              setShowFilterModal(false);
              performSearch();
            }}
          >
            {t('search.apply')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
  
  if (compact) {
    return (
      <View>
        {renderSearchBar()}
        {renderSuggestions()}
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderSuggestions()}
      {renderResults()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    margin: 0,
  },
  filterButton: {
    margin: 0,
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  totals: {
    flexDirection: 'row',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
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
  filterModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 20,
  },
  filterLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
});

export default TransactionSearch;
