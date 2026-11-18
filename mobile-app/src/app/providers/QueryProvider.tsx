import React from 'react';
import { QueryClientProvider, QueryKey } from '@tanstack/react-query';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { queryClient, purgeQueryCache } from './queryClient';

export { queryClient, purgeQueryCache };

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

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
