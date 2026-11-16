import React from 'react';
import { QueryClient, QueryClientProvider, QueryKey } from '@tanstack/react-query';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Enterprise Query Client Configuration:
 * - 5-minute staleTime for reference data
 * - Maximum 2 automatic retries on failure (skip 401/403/404)
 * - Window focus refetching disabled on mobile to conserve battery and bandwidth
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: (failureCount, error: any) => {
        const status = error?.status || error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Tenant-Aware Query Key Helper:
 * Automatically prefixes query keys with the authoritative tenant ID.
 * Strict: Never falls back to an unsafe 'default' tenant key.
 */
export function createTenantQueryKey(keyParts: (string | number | object)[]): QueryKey {
  const tenantId =
    useTenantStore.getState().currentTenant?.id ||
    useAuthStore.getState().user?.profile?.tenantId;

  if (!tenantId) {
    // Isolated unassigned partition preventing cross-tenant leakage
    return ['__no_tenant_context__', ...keyParts];
  }

  return [tenantId, ...keyParts];
}

/**
 * Purges all cached queries across the application to prevent
 * cross-tenant contamination during workspace switching or logout.
 */
export async function purgeQueryCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
