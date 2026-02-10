
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';

import { lightTheme, darkTheme } from '@/theme';
import { db, initializeDatabase } from '@/database/db';
import { useDatabaseSeed } from '@/hooks/useDatabaseSeed';
import { useRecurringScheduler } from '@/hooks/useRecurringScheduler';
import migrations from '@/drizzle/migrations';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthProvider, useAuth } from '@/services/security/AuthContext';

function MigrationWrapper({ children }: { children: React.ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const { seeded } = useDatabaseSeed(success);
  const { t } = useTranslation();
  
  useEffect(() => {
    if (success) {
      initializeDatabase().catch(console.error);
    }
  }, [success]);
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 8 }}>
          {t('errors.databaseError')}
        </Text>
        <Text variant="bodyMedium" style={{ textAlign: 'center', color: '#EF4444', marginBottom: 16 }}>
          {error.message}
        </Text>
        <Text variant="bodySmall" style={{ textAlign: 'center', color: '#6B7280' }}>
          {t('errors.clearAppData')}
        </Text>
      </View>
    );
  }
  
  if (!success || !seeded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text variant="bodyMedium" style={{ marginTop: 16 }}>
          {t('errors.initializingDatabase')}
        </Text>
      </View>
    );
  }
  
  return <>{children}</>;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  
  // Determine active theme
  const activeTheme = themeMode === 'system' 
    ? (systemColorScheme === 'dark' ? darkTheme : lightTheme)
    : (themeMode === 'dark' ? darkTheme : lightTheme);
  
  const statusBarStyle = themeMode === 'system'
    ? (systemColorScheme === 'dark' ? 'light' : 'dark')
    : (themeMode === 'dark' ? 'light' : 'dark');
  
  return (
    <PaperProvider theme={activeTheme}>
      {children}
      <StatusBar style={statusBarStyle} />
    </PaperProvider>
  );
}

function RecurringScheduler() {
  // Enable recurring transaction processing
  useRecurringScheduler(true);
  return null;
}

// App Lock Guard - redirects to lock screen when needed
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (isLoading) return;
    
    const isAuthGroup = segments[0] === '(auth)';
    
    // If not authenticated and not on lock screen, redirect to lock
    if (!isAuthenticated && !isAuthGroup) {
      router.replace('/(auth)/lock');
    }
    
    // If authenticated and on lock screen, redirect to tabs
    if (isAuthenticated && isAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);
  
  // Don't render children while loading or not authenticated (unless on auth screen)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }
  
  const isAuthGroup = segments[0] === '(auth)';
  if (!isAuthenticated && !isAuthGroup) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  
  return (
    <AuthGuard>
      <RecurringScheduler />
      <Stack key={language} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="transactions/new" 
          options={{ 
            headerShown: true,
            title: t('transactions.newTransaction'),
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="(app)/categories" 
          options={{ 
            headerShown: true,
            title: t('settings.categories'),
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="(app)/recurring" 
          options={{ 
            headerShown: true,
            title: t('transactions.recurringTransactions'),
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="(app)/security" 
          options={{ 
            headerShown: true,
            title: t('settings.security') || 'Security',
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="(app)/privacy" 
          options={{ 
            headerShown: true,
            title: t('settings.privacyPolicy') || 'Privacy Policy',
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="(app)/terms" 
          options={{ 
            headerShown: true,
            title: t('settings.termsOfService') || 'Terms of Service',
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="(app)/support" 
          options={{ 
            headerShown: true,
            title: t('settings.helpSupport') || 'Help & Support',
            presentation: 'card',
          }} 
        />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  return (
    <MigrationWrapper>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </MigrationWrapper>
  );
}
