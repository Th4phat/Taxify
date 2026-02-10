
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
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import {
  getTransactionById,
  updateTransaction,
  type TransactionWithCategory,
} from '@/database/repositories/transaction.repo';
import { getCategoriesByType, getAllCategories } from '@/database/repositories/category.repo';
import type { Category } from '@/database/repositories/category.repo';
import type { TransactionType } from '@/types';
import { ReceiptScanner } from '@/components/receipt/ReceiptScanner';
import type { GeminiReceiptData } from '@/services/receipt/gemini.service';
import { DatePicker } from '@/components/common/DatePicker';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';

function formatDate(date: Date, locale: string): string {
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const months = locale === 'th' ? monthsTh : monthsEn;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function EditTransactionScreen() {
  const theme = useTheme<AppTheme>();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadTransaction = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      const transaction = await getTransactionById(id);
      
      if (!transaction) {
        router.back();
        return;
      }

      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || '');
      setTransactionDate(transaction.transactionDate);
      setIsTaxDeductible(transaction.isTaxDeductible || false);
      setScannedImageUri(transaction.receiptImageUri);
      setOcrConfidence(transaction.ocrConfidence || 0);

      const cats = await getCategoriesByType(transaction.type);
      setCategories(cats);

      if (transaction.category) {
        const cat = cats.find(c => c.id === transaction.categoryId);
        setSelectedCategory(cat || null);
      }

      const allCats = await getAllCategories();
      setAllCategories(allCats);

      navigation.setOptions({
        headerTitle: t('transactions.editTransaction'),
        headerLeft: () => (
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
        ),
      });
    } catch (error) {
      console.error('Error loading transaction:', error);
    } finally {
      setLoading(false);
    }
  }, [id, navigation, t]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('transactions.editTransaction'),
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
        />
      ),
    });
  }, [navigation, t]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategoriesByType(type);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [type]);

  useEffect(() => {
    if (!loading) {
      loadCategories();
    }
  }, [type, loadCategories, loading]);

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
      if (data.merchantName && !description) {
        setDescription(data.merchantName);
      }
      setTransactionDate(data.date);

      setScannedImageUri(data.receiptImageUri);
      setOcrConfidence(data.confidence);
      setSuggestedCategory(data.suggestedCategory);

      if (data.categoryId) {
        const matchedCategory = allCategories.find((c) => c.id === data.categoryId);
        if (matchedCategory) {
          setSelectedCategory(matchedCategory);
        }
      }
    },
    [allCategories, description]
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = t('transactions.enterAmount');
    }

    if (!selectedCategory) {
      newErrors.category = t('transactions.selectCategory');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !id) return;

    setSaving(true);
    try {
      await updateTransaction(id, {
        amount: parseFloat(amount),
        type,
        categoryId: selectedCategory!.id,
        description: description || null,
        transactionDate,
        isTaxDeductible,
        deductibleAmount: isTaxDeductible ? parseFloat(amount) : null,
        section40Type: selectedCategory?.defaultSection40 || null,
        receiptImageUri: scannedImageUri,
        ocrConfidence: ocrConfidence > 0 ? ocrConfidence : null,
      });

      router.back();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setErrors({ submit: t('transactions.failedToSave') });
    } finally {
      setSaving(false);
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

  const formatDateForPicker = (date: Date) => formatDate(date, language);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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

        {errors.submit && (
          <HelperText type="error" style={styles.submitError}>
            {errors.submit}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          buttonColor={theme.colors.primary}
        >
          {t('common.saveChanges')}
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={saving} style={styles.cancelButton}>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  taxDeductibleContainer: {
    marginTop: 16,
    flexDirection: 'row',
  },
  taxChip: {
    borderRadius: 16,
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
