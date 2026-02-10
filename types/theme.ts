import type { MD3Theme } from 'react-native-paper';

export interface AppThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  elevation: MD3Theme['colors']['elevation'];
  surfaceDisabled: string;
  onSurfaceDisabled: string;
  backdrop: string;
  success: string;
  warning: string;
  info: string;
  income: string;
  expense: string;
  tax: string;
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  chartQuaternary: string;
  chartQuinary: string;
}

export interface AppThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface AppTheme extends MD3Theme {
  colors: AppThemeColors;
  spacing: AppThemeSpacing;
}
