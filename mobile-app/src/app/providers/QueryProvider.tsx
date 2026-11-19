import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, purgeQueryCache } from '../../core/query/queryClient';
import { createTenantQueryKey } from '../../core/query/tenantQueryKeys';

export { queryClient, purgeQueryCache, createTenantQueryKey };

/**
 * Thin QueryProvider wrapper around TanStack React Query.
 * Decoupled from stores and business logic to eliminate circular dependencies.
 */
export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
