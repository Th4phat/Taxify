import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu, Portal, Dialog, Text, RadioButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExportService } from '@/services/export/export.service';
import type { Transaction, Category, TaxProfile, TaxCalculationResult } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ExportButtonProps {
  transactions: Array<Transaction & { category?: Category }>;
  taxYear: number;
  taxResult?: TaxCalculationResult;
  taxProfile?: TaxProfile;
  variant?: 'button' | 'icon' | 'fab';
  disabled?: boolean;
}

export function ExportButton({
  transactions,
  taxYear,
  taxResult,
  taxProfile,
  variant = 'button',
  disabled = false,
}: ExportButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [exportType, setExportType] = useState<'transactions' | 'tax_report'>('transactions');
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async () => {
    setMenuVisible(false);
    setExporting(true);
    
    try {
      if (exportType === 'transactions') {
        await ExportService.exportTransactions(transactions, taxYear);
      } else if (taxResult && taxProfile) {
        await ExportService.exportTaxReport({
          taxYear,
          taxResult,
          taxProfile,
          transactions,
          documents: [],
          generatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
      setDialogVisible(false);
    }
  };
  
  const openExportDialog = (type: 'transactions' | 'tax_report') => {
    setExportType(type);
    setDialogVisible(true);
  };
  
  if (variant === 'fab') {
    return (
      <>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              icon="export"
              onPress={() => setMenuVisible(true)}
              disabled={disabled || transactions.length === 0}
              loading={exporting}
            >
              {t('export.export')}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => openExportDialog('transactions')}
            title={t('export.transactionsCSV')}
            leadingIcon="file-delimited"
          />
          {taxResult && taxProfile && (
            <Menu.Item
              onPress={() => openExportDialog('tax_report')}
              title={t('export.taxReportCSV')}
              leadingIcon="file-document"
            />
          )}
        </Menu>
        
        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>{t('export.title')}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                {exportType === 'transactions' 
                  ? t('export.aboutToExportTransactions', { count: transactions.length })
                  : t('export.aboutToExportTaxReport', { year: taxYear })}
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.outline }}>
                {t('export.description')}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>{t('common.cancel')}</Button>
              <Button onPress={handleExport} loading={exporting} mode="contained">
                {t('export.export')}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </>
    );
  }
  
  return (
    <>
      <Button
        mode="outlined"
        icon="export"
        onPress={() => setMenuVisible(true)}
        disabled={disabled || transactions.length === 0}
        loading={exporting}
      >
        {t('export.export')}
      </Button>
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
      >
        <Menu.Item
          onPress={() => openExportDialog('transactions')}
          title={t('export.transactionsCSV')}
          leadingIcon="file-delimited"
        />
        {taxResult && taxProfile && (
          <Menu.Item
            onPress={() => openExportDialog('tax_report')}
            title={t('export.taxReportCSV')}
            leadingIcon="file-document"
          />
        )}
      </Menu>
      
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('export.title')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {exportType === 'transactions' 
                ? t('export.aboutToExportTransactions', { count: transactions.length })
                : t('export.aboutToExportTaxReport', { year: taxYear })}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.outline }}>
              {t('export.description')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleExport} loading={exporting} mode="contained">
              {t('export.export')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});

export default ExportButton;
