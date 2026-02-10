
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';

interface TabIconProps {
  color: string;
  size: number;
}

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  
  return (
    <Tabs
      key={language} // Force re-render when language changes
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
          headerTitle: t('dashboard.title'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabs.transactions'),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
          headerTitle: t('transactions.title'),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: t('tabs.tax'),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <MaterialCommunityIcons name="calculator-variant" size={size} color={color} />
          ),
          headerTitle: t('tax.title'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
          headerTitle: t('settings.title'),
        }}
      />
    </Tabs>
  );
}
