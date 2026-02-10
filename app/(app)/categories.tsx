
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Text, 
  useTheme, 
  List, 
  Button, 
  Portal, 
  Modal, 
  TextInput,
  SegmentedButtons,
  Chip,
  IconButton,
} from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/types/theme';
import type { Category } from '@/database/repositories/category.repo';
import { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '@/database/repositories/category.repo';
import { generateUUIDSync } from '@/utils/uuid';
import { useTranslation } from '@/hooks/useTranslation';
import type { TransactionType } from '@/types';

const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#6B7280', '#374151',
];

const CATEGORY_ICONS = [
  'food', 'car', 'home', 'shopping', 'medical-bag',
  'school', 'plane', 'movie', 'music', 'gamepad-variant',
  'gift', 'cash', 'credit-card', 'bank', 'chart-line',
  'briefcase', 'tools', 'phone', 'wifi', 'lightning-bolt',
  'coffee', 'glass-cocktail', 'dumbbell', 'paw', 'baby-carriage',
];

export default function CategoriesScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('settings.categories'),
    });
  }, [navigation, t]);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formNameTh, setFormNameTh] = useState('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formColor, setFormColor] = useState(CATEGORY_COLORS[0]);
  const [formIcon, setFormIcon] = useState(CATEGORY_ICONS[0]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const loadCategories = useCallback(async () => {
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  
  const filteredCategories = categories.filter((cat) => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });
  
  const resetForm = () => {
    setFormName('');
    setFormNameTh('');
    setFormType('expense');
    setFormColor(CATEGORY_COLORS[0]);
    setFormIcon(CATEGORY_ICONS[0]);
    setFormErrors({});
    setEditingCategory(null);
  };
  
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };
  
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormNameTh(category.nameTh || '');
    setFormType(category.type);
    setFormColor(category.color);
    setFormIcon(category.icon);
    setFormErrors({});
    setShowModal(true);
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formName.trim()) {
      errors.name = t('categoryScreen.categoryNameRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      if (editingCategory) {
        // Update existing
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          nameTh: formNameTh.trim() || null,
          type: formType,
          color: formColor,
          icon: formIcon,
        });
      } else {
        // Create new
        await createCategory({
          name: formName.trim(),
          nameTh: formNameTh.trim() || null,
          type: formType,
          color: formColor,
          icon: formIcon,
          isSystem: false,
          isActive: true,
          displayOrder: categories.length,
        });
      }
      
      setShowModal(false);
      resetForm();
      await loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      setDeleteConfirmId(null);
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };
  
  const renderCategoryItem = (category: Category) => (
    <List.Item
      key={category.id}
      title={category.name}
      description={category.nameTh || category.type}
      left={() => (
        <View 
          style={[
            styles.categoryIcon, 
            { backgroundColor: `${category.color}30` }
          ]} 
        >
          <MaterialCommunityIcons 
            name={category.icon as any} 
            size={24} 
            color={category.color} 
          />
        </View>
      )}
      right={() => (
        <View style={styles.categoryActions}>
          {!category.isSystem && (
            <>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => openEditModal(category)}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => setDeleteConfirmId(category.id)}
              />
            </>
          )}
          {category.isSystem && (
            <Chip style={styles.systemChip}>{t('common.system')}</Chip>
          )}
        </View>
      )}
      style={styles.categoryItem}
    />
  );
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as TransactionType | 'all')}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('transactions.income') },
            { value: 'expense', label: t('transactions.expense') },
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredCategories.map(renderCategoryItem)}
        
        {filteredCategories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('categoryScreen.noCategoriesFound')}
            </Text>
          </View>
        )}
        
        <View style={{ height: 80 }} />
      </ScrollView>
      
      <Button
        mode="contained"
        icon="plus"
        onPress={openCreateModal}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        textColor={theme.colors.onPrimary}
      >
        Add Category
      </Button>
      
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingCategory ? t('categoryScreen.editCategory') : t('categoryScreen.newCategory')}
          </Text>
          
          <ScrollView>
            <Text variant="bodyMedium" style={styles.label}>{t('categoryScreen.type')}</Text>
            <SegmentedButtons
              value={formType}
              onValueChange={(value) => setFormType(value as TransactionType)}
              buttons={[
                { value: 'income', label: t('transactions.income') },
                { value: 'expense', label: t('transactions.expense') },
              ]}
              style={styles.segmentedButtons}
            />
            
            <Text variant="bodyMedium" style={styles.label}>{t('categoryScreen.nameEnglish')} ({t('categoryScreen.required')})</Text>
            <TextInput
              mode="outlined"
              value={formName}
              onChangeText={setFormName}
              placeholder={t('categoryScreen.placeholderEnglish')}
              error={!!formErrors.name}
              style={styles.input}
            />
            {formErrors.name && (
              <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                {formErrors.name}
              </Text>
            )}
            
            <Text variant="bodyMedium" style={styles.label}>{t('categoryScreen.nameThai')}</Text>
            <TextInput
              mode="outlined"
              value={formNameTh}
              onChangeText={setFormNameTh}
              placeholder={t('categoryScreen.placeholderThai')}
              style={styles.input}
            />
            
            <Text variant="bodyMedium" style={styles.label}>{t('categoryScreen.color')}</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setFormColor(color)}
                >
                  {formColor === color && (
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Text variant="bodyMedium" style={styles.label}>{t('categoryScreen.icon')}</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    formIcon === icon && styles.iconOptionSelected,
                    { borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setFormIcon(icon)}
                >
                  <MaterialCommunityIcons 
                    name={icon as any} 
                    size={24} 
                    color={formIcon === icon ? theme.colors.primary : theme.colors.onSurface} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.previewContainer}>
              <Text variant="bodySmall" style={styles.label}>{t('categoryScreen.preview')}</Text>
              <View style={[styles.preview, { backgroundColor: `${formColor}20` }]}>
                <MaterialCommunityIcons 
                  name={formIcon as any} 
                  size={32} 
                  color={formColor} 
                />
                <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '500' }}>
                  {formName || 'Category Name'}
                </Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalActions}>
            <Button onPress={() => setShowModal(false)} style={styles.modalButton}>
              {t('common.cancel')}
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSave}
              style={styles.modalButton}
            >
              {t('common.save')}
            </Button>
          </View>
        </Modal>
      </Portal>
      
      <Portal>
        <Modal
          visible={!!deleteConfirmId}
          onDismiss={() => setDeleteConfirmId(null)}
          contentContainerStyle={[
            styles.deleteModalContainer,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('categoryScreen.deleteCategory')}
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 24 }}>
            {t('categoryScreen.deleteCategoryMessage')}
          </Text>
          <View style={styles.modalActions}>
            <Button onPress={() => setDeleteConfirmId(null)} style={styles.modalButton}>
              {t('common.cancel')}
            </Button>
            <Button 
              mode="contained" 
              onPress={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              buttonColor={theme.colors.error}
              style={styles.modalButton}
            >
              {t('common.delete')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    marginVertical: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemChip: {
    marginRight: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 28,
  },
  modalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  deleteModalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  iconOptionSelected: {
    borderColor: '#0F766E',
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
  },
  previewContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
