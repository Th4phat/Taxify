
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  useTheme,
  Chip,
  HelperText,
  Portal,
  Modal,
  List,
  IconButton,
  Divider,
  Switch,
} from 'react-native-paper';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import { createTransaction } from '@/database/repositories/transaction.repo';
import { createRecurringTransaction } from '@/database/repositories/recurringTransaction.repo';
import { getCategoriesByType, getAllCategories } from '@/database/repositories/category.repo';
import type { Category } from '@/database/repositories/category.repo';
import type { TransactionType } from '@/types';
import type { RecurringFrequency } from '@/database/repositories/recurringTransaction.repo';
import { ReceiptScanner } from '@/components/receipt/ReceiptScanner';
import type { GeminiReceiptData } from '@/services/receipt/gemini.service';
import { DatePicker } from '@/components/common/DatePicker';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';
import { CategorySuggestionCard } from '@/components/ai/CategorySuggestion';
import { suggestCategory, quickCategorize } from '@/services/ai/autoCategorization.service';
import type { AutoCategorizationResult } from '@/types/ai';

function formatDate(date: Date, locale: string): string {
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const frequencyOptions: { value: RecurringFrequency; label: string; icon: string }[] = [
  { value: 'daily', label: 'transactions.daily', icon: 'calendar-today' },
  { value: 'weekly', label: 'transactions.weekly', icon: 'calendar-week' },
  { value: 'monthly', label: 'transactions.monthly', icon: 'calendar-month' },
  { value: 'yearly', label: 'transactions.yearly', icon: 'calendar-range' },
];

export default function NewTransactionScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ scan?: string }>();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('transactions.newTransaction'),
    });
  }, [navigation, t]);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);

  // Recurring transaction state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [aiCategorySuggestion, setAiCategorySuggestion] = useState<AutoCategorizationResult | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Debounce timer for AI categorization
  const [categorizationTimer, setCategorizationTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategoriesByType(type);
      setCategories(cats as Category[]);
      // Reset selected category when type changes
      setSelectedCategory(null);
      setAiCategorySuggestion(null);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [type]);
  
  useEffect(() => {
    const triggerAutoCategorization = async () => {
      if (selectedCategory || !description.trim() || !amount) return;
      
      if (categorizationTimer) {
        clearTimeout(categorizationTimer);
      }
      
      const quickMatch = quickCategorize(description, type);
      if (quickMatch) {
        const matchingCategory = allCategories.find(c => 
          c.name.toLowerCase().includes(quickMatch.toLowerCase()) ||
          quickMatch.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchingCategory) {
          setSuggestedCategory(matchingCategory.name);
          // Don't auto-select, just suggest
        }
      }
      
      const timer = setTimeout(async () => {
        setCategoryLoading(true);
        const result = await suggestCategory(
          description,
          parseFloat(amount) || 0,
          type
        );
        setAiCategorySuggestion(result);
        setCategoryLoading(false);
        
        if (result.suggestion) {
          setSuggestedCategory(result.suggestion.categoryName);
        }
      }, 800); // 800ms debounce
      
      setCategorizationTimer(timer);
    };
    
    triggerAutoCategorization();
    
    return () => {
      if (categorizationTimer) {
        clearTimeout(categorizationTimer);
      }
    };
  }, [description, amount, type, allCategories]);

  const loadAllCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setAllCategories(cats as Category[]);
    } catch (error) {
      console.error('Error loading all categories:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadAllCategories();
  }, [loadAllCategories]);

  useEffect(() => {
    if (params.scan === 'true') {
      setTimeout(() => {
        setShowScanner(true);
      }, 300);
    }
  }, [params.scan]);

  const handleScanComplete = useCallback(
    (data: {
      amount: number;
      merchantName: string;
      date: Date;
      categoryId: string | null;
      suggestedCategory: string;
      items: string[];
      taxAmount: number | null;
      receiptImageUri: string;
      confidence: number;
      rawData: GeminiReceiptData;
    }) => {
      setShowScanner(false);

      setAmount(data.amount.toFixed(2));
      setDescription(data.merchantName);
      setTransactionDate(data.date);

      setScannedImageUri(data.receiptImageUri);
      setOcrConfidence(data.confidence);
      setSuggestedCategory(data.suggestedCategory);

      setType('expense');

      if (data.categoryId) {
        const matchedCategory = allCategories.find((c) => c.id === data.categoryId);
        if (matchedCategory) {
          setSelectedCategory(matchedCategory);
        }
      }
    },
    [allCategories]
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = t('transactions.enterAmount');
    }

    if (!selectedCategory) {
      newErrors.category = t('transactions.selectCategory');
    }

    if (isRecurring && hasEndDate && endDate && endDate < startDate) {
      newErrors.endDate = t('transactions.endDateAfterStart');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (isRecurring) {
        // Create recurring transaction
        await createRecurringTransaction({
          amount: parseFloat(amount),
          type,
          categoryId: selectedCategory!.id,
          subCategoryId: null,
          frequency,
          startDate,
          endDate: hasEndDate ? endDate : null,
          nextDueDate: startDate,
          description: description || null,
          isTaxDeductible,
          deductibleAmount: isTaxDeductible ? parseFloat(amount) : null,
          section40Type: selectedCategory?.defaultSection40 || null,
          isActive: true,
          lastGeneratedDate: null,
        });
      } else {
        // Create single transaction
        await createTransaction({
          amount: parseFloat(amount),
          type,
          categoryId: selectedCategory!.id,
          description: description || null,
          transactionDate,
          isTaxDeductible,
          deductibleAmount: isTaxDeductible ? parseFloat(amount) : null,
          section40Type: selectedCategory?.defaultSection40 || null,
          subCategoryId: null,
          receiptImageUri: scannedImageUri,
          ocrRawText: description,
          ocrConfidence: ocrConfidence > 0 ? ocrConfidence : null,
          syncStatus: 'pending',
        });
      }

      router.back();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setErrors({ submit: t('transactions.failedToSave') });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (text: string): string => {
    const cleaned = text.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const clearScannedImage = () => {
    setScannedImageUri(null);
    setOcrConfidence(0);
    setSuggestedCategory(null);
  };

  const getConfidenceColor = () => {
    if (ocrConfidence >= 0.8) return theme.colors.success;
    if (ocrConfidence >= 0.5) return theme.colors.warning;
    return theme.colors.error;
  };

  const getNextDuePreview = (): string => {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return formatDate(date, language);
  };

  const formatDateForPicker = (date: Date) => formatDate(date, language);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Button
          mode="outlined"
          icon="camera"
          onPress={() => setShowScanner(true)}
          style={styles.scanButton}
          contentStyle={styles.scanButtonContent}
        >
          {t('transactions.scanReceipt')}
        </Button>

        {scannedImageUri && (
          <View style={styles.receiptPreviewContainer}>
            <View style={styles.receiptPreview}>
              <Image source={{ uri: scannedImageUri }} style={styles.receiptImage} />
              <IconButton
                icon="close-circle"
                size={24}
                iconColor={theme.colors.error}
                style={styles.removeImageButton}
                onPress={clearScannedImage}
              />
            </View>
            <View style={styles.aiInfoContainer}>
              <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() }]}>
                <Text style={styles.confidenceText}>
                  {ocrConfidence >= 0.8 ? t('transactions.highConfidence') : ocrConfidence >= 0.5 ? t('transactions.mediumConfidence') : t('transactions.lowConfidence')}
                </Text>
              </View>
              {suggestedCategory && !selectedCategory && (
                <Text variant="bodySmall" style={{ color: theme.colors.warning, marginTop: 4 }}>
                  {t('transactions.aiSuggestedCategory')} {suggestedCategory}
                </Text>
              )}
              {suggestedCategory && selectedCategory && (
                <Text variant="bodySmall" style={{ color: theme.colors.success, marginTop: 4 }}>
                  {t('transactions.aiMatchedCategory')} {selectedCategory.name}
                </Text>
              )}
            </View>
          </View>
        )}

        <Text variant="bodyMedium" style={styles.label}>
          {t('transactions.transactionType')}
        </Text>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'income', label: t('transactions.income'), icon: 'arrow-up' },
            { value: 'expense', label: t('transactions.expense'), icon: 'arrow-down' },
          ]}
          style={styles.segmentedButtons}
        />

        <Text variant="bodyMedium" style={styles.label}>
          {t('transactions.amount')} ({t('transactions.thb')})
        </Text>
        <TextInput
          mode="outlined"
          placeholder="0.00"
          value={amount}
          onChangeText={(text) => setAmount(formatAmount(text))}
          keyboardType="decimal-pad"
          error={!!errors.amount}
          left={<TextInput.Affix text="฿" />}
          style={styles.input}
        />
        {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}

        <CategorySuggestionCard
          suggestion={aiCategorySuggestion || { suggestion: null, alternatives: [] }}
          categories={allCategories as any}
          onSelectCategory={(categoryId) => {
            const category = allCategories.find(c => c.id === categoryId);
            if (category) {
              setSelectedCategory(category);
              // If category is for different type, update type
              if (category.type !== type) {
                setType(category.type);
              }
            }
          }}
          onDismiss={() => setAiCategorySuggestion(null)}
          isLoading={categoryLoading}
        />

        <Text variant="bodyMedium" style={styles.label}>
          {t('transactions.category')}
        </Text>
        <Button
          mode="outlined"
          onPress={() => setShowCategoryModal(true)}
          style={[
            styles.categoryButton,
            suggestedCategory && !selectedCategory && { borderColor: theme.colors.warning },
          ]}
          icon={selectedCategory ? undefined : 'tag'}
        >
          {selectedCategory ? selectedCategory.name : t('transactions.selectCategory')}
        </Button>
        {suggestedCategory && !selectedCategory && (
          <HelperText type="info">{t('transactions.aiSuggestedCategory')} {suggestedCategory}</HelperText>
        )}
        {errors.category && <HelperText type="error">{errors.category}</HelperText>}

        <Text variant="bodyMedium" style={styles.label}>
          {t('transactions.description')}
        </Text>
        <TextInput
          mode="outlined"
          placeholder={t('transactions.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />

        <Text variant="bodyMedium" style={styles.label}>
          {t('transactions.date')}
        </Text>
        <DatePicker
          date={transactionDate}
          onDateChange={setTransactionDate}
          formatDate={formatDateForPicker}
        />

        {type === 'expense' && (
          <View style={styles.taxDeductibleContainer}>
            <Chip
              selected={isTaxDeductible}
              onPress={() => setIsTaxDeductible(!isTaxDeductible)}
              icon="shield-check"
              style={styles.taxChip}
            >
              {t('transactions.taxDeductible')}
            </Chip>
          </View>
        )}

        <Divider style={styles.divider} />
        
        <View style={styles.recurringHeader}>
          <View style={styles.recurringTitleRow}>
            <Text variant="titleMedium">{t('transactions.recurringTransaction')}</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
            />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            {t('transactions.recurringDescription')}
          </Text>
        </View>

        {isRecurring && (
          <View style={styles.recurringSection}>
            <Text variant="bodyMedium" style={styles.label}>
              {t('transactions.frequency')}
            </Text>
            <SegmentedButtons
              value={frequency}
              onValueChange={(value) => setFrequency(value as RecurringFrequency)}
              buttons={[
                { value: 'daily', label: t('transactions.daily') },
                { value: 'weekly', label: t('transactions.weekly') },
                { value: 'monthly', label: t('transactions.monthly') },
                { value: 'yearly', label: t('transactions.yearly') },
              ]}
              style={styles.segmentedButtons}
            />

            <Text variant="bodyMedium" style={styles.label}>
              {t('transactions.startDate')}
            </Text>
            <DatePicker
              date={startDate}
              onDateChange={setStartDate}
              formatDate={formatDateForPicker}
            />

            <View style={styles.endDateToggle}>
              <Text variant="bodyMedium">{t('transactions.endDate')}</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
              />
            </View>

            {hasEndDate && (
              <DatePicker
                date={endDate || new Date()}
                onDateChange={setEndDate}
                formatDate={formatDateForPicker}
                minimumDate={startDate}
              />
            )}
            {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}

            <View style={styles.previewContainer}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {t('transactions.nextDue')}: {getNextDuePreview()}
              </Text>
            </View>
          </View>
        )}

        {errors.submit && (
          <HelperText type="error" style={styles.submitError}>
            {errors.submit}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
          buttonColor={type === 'income' ? theme.colors.income : theme.colors.expense}
        >
          {isRecurring ? t('transactions.recurringCreated') : t('common.save')}
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={loading} style={styles.cancelButton}>
          {t('common.cancel')}
        </Button>
      </ScrollView>

      <Portal>
        <Modal
          visible={showCategoryModal}
          onDismiss={() => setShowCategoryModal(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('transactions.selectCategory')}
          </Text>
          <ScrollView>
            {categories.map((category) => (
              <List.Item
                key={category.id}
                title={category.name}
                description={category.nameTh}
                left={() => (
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}30` }]}>
                    <Text style={{ color: category.color }}>●</Text>
                  </View>
                )}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryModal(false);
                }}
                style={selectedCategory?.id === category.id ? styles.selectedCategory : undefined}
              />
            ))}
          </ScrollView>
          <Button onPress={() => setShowCategoryModal(false)} style={styles.modalCloseButton}>
            {t('common.cancel')}
          </Button>
        </Modal>
      </Portal>

      <ReceiptScanner
        visible={showScanner}
        onScanComplete={handleScanComplete}
        onCancel={() => setShowScanner(false)}
        availableCategories={allCategories}
      />
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
  scanButton: {
    marginBottom: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  scanButtonContent: {
    paddingVertical: 12,
  },
  receiptPreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  receiptPreview: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    margin: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  aiInfoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    marginBottom: 8,
    marginTop: 16,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  categoryButton: {
    justifyContent: 'flex-start',
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  taxDeductibleContainer: {
    marginTop: 16,
    flexDirection: 'row',
  },
  taxChip: {
    borderRadius: 16,
  },
  divider: {
    marginVertical: 24,
  },
  recurringHeader: {
    marginBottom: 8,
  },
  recurringTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringSection: {
    marginTop: 8,
  },
  endDateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  previewContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  submitError: {
    textAlign: 'center',
    marginTop: 16,
  },
  saveButton: {
    marginTop: 32,
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
  modalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedCategory: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalCloseButton: {
    marginTop: 16,
  },
});
