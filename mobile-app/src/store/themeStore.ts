import { create } from 'zustand';
import { Appearance } from 'react-native';
import { AppTheme } from '../theme/types';
import { lightTheme, darkTheme, createTenantTheme } from '../theme/theme';
import { localStorage } from '../core/storage/localStorage';
import { STORAGE_KEYS } from '../config/constants';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  theme: AppTheme;
  tenantColor: string | null;

  setMode: (mode: ThemeMode) => void;
  setTenantColor: (color: string | null) => void;
  toggleTheme: () => void;
}

function resolveActiveTheme(mode: ThemeMode, tenantColor?: string | null): AppTheme {
  const isSystemDark = Appearance.getColorScheme() === 'dark';
  const isDark = mode === 'system' ? isSystemDark : mode === 'dark';
  const base = isDark ? darkTheme : lightTheme;
  return createTenantTheme(base, tenantColor);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const savedMode = (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as ThemeMode) || 'system';

  return {
    mode: savedMode,
    theme: resolveActiveTheme(savedMode),
    tenantColor: null,

    setMode: (mode: ThemeMode) => {
      localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
      set({
        mode,
        theme: resolveActiveTheme(mode, get().tenantColor),
      });
    },

    setTenantColor: (tenantColor: string | null) => {
      set({
        tenantColor,
        theme: resolveActiveTheme(get().mode, tenantColor),
      });
    },

    toggleTheme: () => {
      const current = get().mode;
      const nextMode: ThemeMode = current === 'dark' ? 'light' : 'dark';
      get().setMode(nextMode);
    },
  };
});
