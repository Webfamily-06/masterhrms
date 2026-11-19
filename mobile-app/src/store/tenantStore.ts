import { create } from 'zustand';
import { TenantResolveResponse } from '../types/tenant.types';
import { secureStorage } from '../core/storage/secureStorage';
import { STORAGE_KEYS } from '../config/constants';
import { configureInterceptorDependencies } from '../core/api/interceptors';
import { purgeQueryCache } from '../core/query/queryClient';
import { realtimeManager } from '../core/realtime/realtimeManager';
import { useAuthStore } from './authStore';

interface TenantState {
  currentTenant: TenantResolveResponse | null;
  isResolved: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTenant: (tenant: TenantResolveResponse) => Promise<void>;
  clearTenant: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  currentTenant: null,
  isResolved: false,
  isLoading: false,
  error: null,

  setTenant: async (tenant: TenantResolveResponse) => {
    const previousTenantId = get().currentTenant?.id;
    const isTenantSwitch = Boolean(previousTenantId && tenant.id && previousTenantId !== tenant.id);

    if (isTenantSwitch) {
      realtimeManager.disconnectAll();
      try {
        await purgeQueryCache();
      } catch {
        // Ignore in mock/unit test environments
      }
    }

    if (tenant.id) {
      await secureStorage.setItem(STORAGE_KEYS.TENANT_ID, tenant.id);
    }
    if (tenant.slug) {
      await secureStorage.setItem(STORAGE_KEYS.TENANT_SLUG, tenant.slug);
    }

    set({
      currentTenant: tenant,
      isResolved: tenant.resolved,
      isLoading: false,
      error: null,
    });
  },

  clearTenant: async () => {
    realtimeManager.disconnectAll();
    try {
      await purgeQueryCache();
    } catch {
      // Ignore in mock/unit test environments
    }

    await secureStorage.removeItem(STORAGE_KEYS.TENANT_ID);
    await secureStorage.removeItem(STORAGE_KEYS.TENANT_SLUG);

    set({
      currentTenant: null,
      isResolved: false,
      isLoading: false,
      error: null,
    });
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error, isLoading: false }),
}));

// Re-configure interceptor with both auth and tenant accessors
configureInterceptorDependencies({
  getAccessToken: () => useAuthStore.getState().token,
  getTenantHeaders: () => {
    const tenant = useTenantStore.getState().currentTenant;
    return {
      tenantId: tenant?.id,
      tenantSlug: tenant?.slug,
    };
  },
  onSessionExpired: () => {
    useAuthStore.getState().logout();
  },
  updateAccessToken: (newToken: string) => {
    useAuthStore.getState().setToken(newToken);
  },
});
