import { LightPalette, DarkPalette } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, Shadows } from './spacing';
import { AppTheme } from './types';

export const lightTheme: AppTheme = {
  isDark: false,
  colors: LightPalette,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: Shadows,
};

export const darkTheme: AppTheme = {
  isDark: true,
  colors: DarkPalette,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: Shadows,
};

/**
 * Dynamically applies primary tenant color overlay to an existing theme
 */
export function createTenantTheme(baseTheme: AppTheme, tenantPrimaryColor?: string | null): AppTheme {
  if (!tenantPrimaryColor) return baseTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: tenantPrimaryColor,
    },
  };
}
