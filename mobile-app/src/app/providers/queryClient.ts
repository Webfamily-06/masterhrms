import { QueryClient } from '@tanstack/react-query';

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
 * Purges all cached queries across the application to prevent
 * cross-tenant contamination during workspace switching or logout.
 */
export async function purgeQueryCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}
