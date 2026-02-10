
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { AIChat } from '@/components/ai/AIChat';
import type { AppTheme } from '@/types/theme';
import { useTranslation } from '@/hooks/useTranslation';

export default function AIChatScreen() {
  const theme = useTheme<AppTheme>();
  const navigation = useNavigation();
  const { t } = useTranslation();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'AI Tax Assistant',
      headerStyle: {
        backgroundColor: theme.colors.primaryContainer,
      },
      headerTintColor: theme.colors.onPrimaryContainer,
    });
  }, [navigation, theme]);

  return (
    <AIChat
      onSessionChange={(sessionId) => {
        console.log('Active session:', sessionId);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
