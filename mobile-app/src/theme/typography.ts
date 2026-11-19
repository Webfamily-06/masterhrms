import { TextStyle, Platform } from 'react-native';

export const FontFamily = {
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  medium: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  semiBold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export const Typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    includeFontPadding: false,
  },
  h4: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    includeFontPadding: false,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    includeFontPadding: false,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    includeFontPadding: false,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    includeFontPadding: false,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
};

export const AppTypography = {
  ...Typography,
  fontFamily: FontFamily,
};
