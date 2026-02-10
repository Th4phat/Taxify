
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { 
  Text, 
  List, 
  Switch, 
  Divider, 
  useTheme, 
  Button, 
  Portal, 
  Dialog,
  RadioButton,
} from 'react-native-paper';

import { deleteAllTransactions } from '@/database/repositories/transaction.repo';
import { useSettingsStore, type ThemeMode, type Language } from '@/stores/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('settings.title'),
    });
  }, [navigation, t]);
  
  const {
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    notificationsEnabled,
    setNotificationsEnabled,
    dailyReminder,
    setDailyReminder,
    taxDeadlineReminder,
    setTaxDeadlineReminder,
  } = useSettingsStore();
  
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  
  const handleDeleteAllData = async () => {
    try {
      await deleteAllTransactions();
      setDeleteDialogVisible(false);
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };
  
  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light': return t('settings.themeLight');
      case 'dark': return t('settings.themeDark');
      case 'system': return t('settings.themeSystem');
    }
  };
  
  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case 'en': return t('settings.langEnglish');
      case 'th': return t('settings.langThai');
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.appearance')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.theme')}
            description={getThemeLabel(themeMode)}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            onPress={() => setThemeDialogVisible(true)}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('settings.language')}
            description={getLanguageLabel(language)}
            left={(props) => <List.Icon {...props} icon="translate" />}
            onPress={() => setLanguageDialogVisible(true)}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.security')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.appLock')}
            description={t('settings.appLockDesc') || 'PIN and biometric authentication'}
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            onPress={() => router.push('/security')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.notifications')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.enableNotifications')}
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t('settings.dailyReminder')}
            description={t('settings.dailyReminderDesc')}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            right={() => (
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                disabled={!notificationsEnabled}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t('settings.taxDeadlineReminder')}
            description={t('settings.taxDeadlineReminderDesc')}
            left={(props) => <List.Icon {...props} icon="calendar-clock" />}
            right={() => (
              <Switch
                value={taxDeadlineReminder}
                onValueChange={setTaxDeadlineReminder}
                disabled={!notificationsEnabled}
              />
            )}
          />
        </List.Section>
        
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.aiFeatures')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.aiTaxAssistant')}
            description={t('settings.aiTaxAssistantDesc')}
            left={(props) => <List.Icon {...props} icon="robot" color={theme.colors.primary} />}
            onPress={() => router.push('/ai-chat' as any)}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('settings.aiInsights')}
            description={t('settings.aiInsightsDesc')}
            left={(props) => <List.Icon {...props} icon="auto-fix" color={theme.colors.primary} />}
            onPress={() => router.push('/insights' as any)}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>

        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.categories')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.manageCategories')}
            description={t('settings.manageCategoriesDesc')}
            left={(props) => <List.Icon {...props} icon="tag-multiple" />}
            onPress={() => router.push('/categories')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>

        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.recurring')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.manageRecurring')}
            description={t('settings.manageRecurringDesc')}
            left={(props) => <List.Icon {...props} icon="repeat" />}
            onPress={() => router.push('/recurring')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.dataPrivacy')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.exportData')}
            description={t('settings.exportDataDesc')}
            left={(props) => <List.Icon {...props} icon="export" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title={t('settings.importData')}
            description={t('settings.importDataDesc')}
            left={(props) => <List.Icon {...props} icon="import" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title={t('settings.clearAllData')}
            description={t('settings.clearAllDataDesc')}
            left={(props) => <List.Icon {...props} icon="delete-alert" color={theme.colors.error} />}
            titleStyle={{ color: theme.colors.error }}
            onPress={() => setDeleteDialogVisible(true)}
          />
        </List.Section>
        
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.about')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.privacyPolicy')}
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            onPress={() => router.push('/privacy')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('settings.termsOfService')}
            left={(props) => <List.Icon {...props} icon="file-document" />}
            onPress={() => router.push('/terms')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('settings.helpSupport')}
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            onPress={() => router.push('/support')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title={t('settings.version')}
            description={t('settings.versionBuild')}
            left={(props) => <List.Icon {...props} icon="information" />}
          />
        </List.Section>
        
        <View style={{ height: 32 }} />
      </ScrollView>
      
      <Portal>
        <Dialog visible={themeDialogVisible} onDismiss={() => setThemeDialogVisible(false)}>
          <Dialog.Title>{t('dialogs.chooseTheme')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group 
              onValueChange={(value) => {
                setThemeMode(value as ThemeMode);
                setThemeDialogVisible(false);
              }} 
              value={themeMode}
            >
              <RadioButton.Item label={t('settings.themeLight')} value="light" />
              <RadioButton.Item label={t('settings.themeDark')} value="dark" />
              <RadioButton.Item label={t('settings.themeSystem')} value="system" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setThemeDialogVisible(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Portal>
        <Dialog visible={languageDialogVisible} onDismiss={() => setLanguageDialogVisible(false)}>
          <Dialog.Title>{t('dialogs.chooseLanguage')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group 
              onValueChange={(value) => {
                setLanguage(value as Language);
                setLanguageDialogVisible(false);
              }} 
              value={language}
            >
              <RadioButton.Item label={t('settings.langEnglish')} value="en" />
              <RadioButton.Item label={t('settings.langThai')} value="th" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('dialogs.deleteAllTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('dialogs.deleteAllMessage')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleDeleteAllData} textColor={theme.colors.error}>
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
