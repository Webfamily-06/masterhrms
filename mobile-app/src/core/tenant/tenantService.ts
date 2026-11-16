import { apiClient } from '../api/apiClient';
import { TenantResolveResponse } from '../../types/tenant.types';
import { ApiError } from '../api/apiErrors';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { purgeQueryCache } from '../../app/providers/QueryProvider';
import { AuthService } from '../auth/authService';

export interface TenantSwitchResult {
  success: boolean;
  tenant: TenantResolveResponse;
  activeRole: string | null;
}

export class TenantService {
  /**
   * Resolves tenant organization details (name, slug, logo, brand color, subscription status)
   * via the public endpoint: GET /api/v1/auth/public/tenant/resolve?slug={slug}
   */
  public static async resolveTenant(slug: string): Promise<TenantResolveResponse> {
    try {
      const cleanSlug = slug.trim().toLowerCase();
      const response = await apiClient.get<TenantResolveResponse>(
        `/api/v1/auth/public/tenant/resolve?slug=${encodeURIComponent(cleanSlug)}`,
        { skipAuth: true } as any
      );

      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Secure, Atomic Tenant-Switching Lifecycle:
   * 1. Cancels all active in-flight queries to prevent stale data landing in cache.
   * 2. Purges the TanStack query cache completely.
   * 3. Clears former tenant context from store and secure storage.
   * 4. Resolves destination tenant metadata via /api/v1/auth/public/tenant/resolve.
   * 5. Validates tenant existence (fails closed if unverified).
   * 6. Sets destination tenant in useTenantStore (which updates Axios interceptor headers).
   * 7. Re-hydrates current user profile and permissions from GET /api/v1/auth/me.
   * 8. Refreshes canonical roles, active persona, enabledModules, and allowedDashboards.
   * 9. On any error, purges cache again, clears tenant, and leaves app in safe fail-closed state.
   */
  public static async switchTenant(destinationSlugOrId: string): Promise<TenantSwitchResult> {
    // Step 1 & 2: Cancel in-flight queries and purge cache
    await purgeQueryCache();

    // Step 3: Clear prior tenant context
    await useTenantStore.getState().clearTenant();

    try {
      // Step 4 & 5: Resolve destination tenant
      const resolved = await this.resolveTenant(destinationSlugOrId);
      if (!resolved || !resolved.resolved || !resolved.id) {
        throw new Error(`Failed to resolve destination tenant "${destinationSlugOrId}". Workspace does not exist.`);
      }

      // Step 6: Commit new tenant in store
      await useTenantStore.getState().setTenant(resolved);

      // Step 7 & 8: Re-hydrate user profile and authoritative permissions for new tenant
      await AuthService.getCurrentUser();

      const activeRole = useAuthStore.getState().activeRole;

      return {
        success: true,
        tenant: resolved,
        activeRole,
      };
    } catch (error: any) {
      // Fail-closed: ensure no partial tenant state is left active
      await purgeQueryCache();
      await useTenantStore.getState().clearTenant();
      throw error instanceof ApiError ? error : ApiError.fromAxiosError(error);
    }
  }
}
