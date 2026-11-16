import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, StatusBar, Platform } from 'react-native';
import { AppTheme } from '../../theme/types';
import { useThemeStore } from '../../store/themeStore';
import { useTenantStore } from '../../store/tenantStore';

interface ThemeContextValue {
  theme: AppTheme;
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, mode, setMode, toggleTheme, setTenantColor } = useThemeStore();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  // Sync tenant primary branding color into theme whenever tenant changes
  useEffect(() => {
    setTenantColor(currentTenant?.primaryColor || null);
  }, [currentTenant?.primaryColor, setTenantColor]);

  // Listen for system appearance changes when mode is 'system'
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      if (mode === 'system') {
        useThemeStore.getState().setMode('system');
      }
    });
    return () => subscription.remove();
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleTheme }}>
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
