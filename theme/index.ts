import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Type } from 'react-native-paper/lib/typescript/types';
import type { AppTheme } from '@/types/theme';

const fontConfig: Record<string, MD3Type> = {
  displayLarge: { fontFamily: 'sans-serif', fontSize: 57, fontWeight: '400', letterSpacing: 0, lineHeight: 64 },
  displayMedium: { fontFamily: 'sans-serif', fontSize: 45, fontWeight: '400', letterSpacing: 0, lineHeight: 52 },
  displaySmall: { fontFamily: 'sans-serif', fontSize: 36, fontWeight: '400', letterSpacing: 0, lineHeight: 44 },
  headlineLarge: { fontFamily: 'sans-serif', fontSize: 32, fontWeight: '400', letterSpacing: 0, lineHeight: 40 },
  headlineMedium: { fontFamily: 'sans-serif', fontSize: 28, fontWeight: '400', letterSpacing: 0, lineHeight: 36 },
  headlineSmall: { fontFamily: 'sans-serif', fontSize: 24, fontWeight: '400', letterSpacing: 0, lineHeight: 32 },
  titleLarge: { fontFamily: 'sans-serif-medium', fontSize: 22, fontWeight: '500', letterSpacing: 0, lineHeight: 28 },
  titleMedium: { fontFamily: 'sans-serif-medium', fontSize: 16, fontWeight: '500', letterSpacing: 0.15, lineHeight: 24 },
  titleSmall: { fontFamily: 'sans-serif-medium', fontSize: 14, fontWeight: '500', letterSpacing: 0.1, lineHeight: 20 },
  bodyLarge: { fontFamily: 'sans-serif', fontSize: 16, fontWeight: '400', letterSpacing: 0.15, lineHeight: 24 },
  bodyMedium: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: '400', letterSpacing: 0.25, lineHeight: 20 },
  bodySmall: { fontFamily: 'sans-serif', fontSize: 12, fontWeight: '400', letterSpacing: 0.4, lineHeight: 16 },
  labelLarge: { fontFamily: 'sans-serif-medium', fontSize: 14, fontWeight: '500', letterSpacing: 0.1, lineHeight: 20 },
  labelMedium: { fontFamily: 'sans-serif-medium', fontSize: 12, fontWeight: '500', letterSpacing: 0.5, lineHeight: 16 },
  labelSmall: { fontFamily: 'sans-serif-medium', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, lineHeight: 16 },
};

const baseTheme = {
  version: 3 as const,
  roundness: 8,
  animation: {
    scale: 1.0,
    defaultAnimationDuration: 300,
  },
};

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  ...baseTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CCFBF1',
    onPrimaryContainer: '#042F2E',
    
    secondary: '#0369A1',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E0F2FE',
    onSecondaryContainer: '#082F49',
    
    tertiary: '#7C3AED',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#EDE9FE',
    onTertiaryContainer: '#2E1065',
    
    error: '#EF4444',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#450A0A',
    
    background: '#FAFAFA',
    onBackground: '#1F2937',
    surface: '#FFFFFF',
    onSurface: '#1F2937',
    surfaceVariant: '#E5E7EB',
    onSurfaceVariant: '#4B5563',
    outline: '#9CA3AF',
    outlineVariant: '#D1D5DB',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#1F2937',
    inverseOnSurface: '#F3F4F6',
    inversePrimary: '#5EEAD4',
    elevation: MD3LightTheme.colors.elevation,
    surfaceDisabled: '#E5E7EB',
    onSurfaceDisabled: '#9CA3AF',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    income: '#10B981',
    expense: '#EF4444',
    tax: '#8B5CF6',
    
    chartPrimary: '#0F766E',
    chartSecondary: '#0369A1',
    chartTertiary: '#7C3AED',
    chartQuaternary: '#F59E0B',
    chartQuinary: '#EF4444',
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  ...baseTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#5EEAD4',
    onPrimary: '#042F2E',
    primaryContainer: '#115E59',
    onPrimaryContainer: '#CCFBF1',
    
    secondary: '#7DD3FC',
    onSecondary: '#082F49',
    secondaryContainer: '#075985',
    onSecondaryContainer: '#E0F2FE',
    
    tertiary: '#C4B5FD',
    onTertiary: '#2E1065',
    tertiaryContainer: '#6D28D9',
    onTertiaryContainer: '#EDE9FE',
    
    error: '#F87171',
    onError: '#450A0A',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FEE2E2',
    
    background: '#111827',
    onBackground: '#F9FAFB',
    surface: '#1F2937',
    onSurface: '#F9FAFB',
    surfaceVariant: '#374151',
    onSurfaceVariant: '#D1D5DB',
    outline: '#6B7280',
    outlineVariant: '#4B5563',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#F9FAFB',
    inverseOnSurface: '#1F2937',
    inversePrimary: '#0F766E',
    elevation: MD3DarkTheme.colors.elevation,
    surfaceDisabled: '#374151',
    onSurfaceDisabled: '#6B7280',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
    
    income: '#34D399',
    expense: '#F87171',
    tax: '#A78BFA',
    
    chartPrimary: '#5EEAD4',
    chartSecondary: '#7DD3FC',
    chartTertiary: '#C4B5FD',
    chartQuaternary: '#FBBF24',
    chartQuinary: '#F87171',
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export { useTheme } from 'react-native-paper';
