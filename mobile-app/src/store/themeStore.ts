import { create } from 'zustand';
import { Appearance } from 'react-native';
import { AppTheme } from '../theme/types';
import { lightTheme, darkTheme, createTenantTheme } from '../theme/theme';
import { localStorage } from '../core/storage/localStorage';
import { STORAGE_KEYS } from '../config/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  theme: AppTheme;
  tenantColor: string | null;
  hydrated: boolean;

  setMode: (mode: ThemeMode) => void;
  setTenantColor: (color: string | null) => void;
  toggleTheme: () => void;
  hydrateTheme: () => Promise<void>;
}

function resolveActiveTheme(mode: ThemeMode, tenantColor?: string | null): AppTheme {
  const isSystemDark = Appearance.getColorScheme() === 'dark';
  const isDark = mode === 'system' ? isSystemDark : mode === 'dark';
  const base = isDark ? darkTheme : lightTheme;
  return createTenantTheme(base, tenantColor);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const rawSaved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
  const savedMode: ThemeMode =
    rawSaved === 'light' || rawSaved === 'dark' || rawSaved === 'system' ? rawSaved : 'light';

  return {
    mode: savedMode,
    theme: resolveActiveTheme(savedMode),
    tenantColor: null,
    hydrated: false,

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
      const currentlyDark = get().theme.isDark;
      const nextMode: ThemeMode = currentlyDark ? 'light' : 'dark';
      get().setMode(nextMode);
    },

    hydrateTheme: async () => {
      try {
        const stored = await localStorage.getItemAsync(STORAGE_KEYS.THEME_MODE);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          set({
            mode: stored,
            theme: resolveActiveTheme(stored, get().tenantColor),
            hydrated: true,
          });
          return;
        }
      } catch {
        // Ignore
      }
      set({ hydrated: true });
    },
  };
});
