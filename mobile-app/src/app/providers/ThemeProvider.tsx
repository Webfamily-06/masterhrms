import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, StatusBar, Platform } from 'react-native';
import { AppTheme } from '../../theme/types';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { useTenantStore } from '../../store/tenantStore';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, mode, setMode, toggleTheme, setTenantColor, hydrateTheme } = useThemeStore();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  // Hydrate persisted theme mode on initial boot
  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  // Sync tenant primary branding color into theme whenever tenant changes
  useEffect(() => {
    setTenantColor(currentTenant?.primaryColor || null);
  }, [currentTenant?.primaryColor, setTenantColor]);

  // Listen for system appearance changes when mode is 'system'
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      if (useThemeStore.getState().mode === 'system') {
        useThemeStore.getState().setMode('system');
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        isDark: theme.isDark,
        setMode,
        toggleTheme,
      }}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        {...(Platform.OS === 'android' ? { backgroundColor: theme.colors.background } : {})}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
