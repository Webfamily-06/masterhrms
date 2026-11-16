import { TextStyle, ViewStyle } from 'react-native';
import { LightPalette } from './colors';
import { Spacing, BorderRadius } from './spacing';

export type ThemeColors = typeof LightPalette;

export interface AppTheme {
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  typography: Record<string, TextStyle>;
  shadows: Record<string, ViewStyle>;
}
