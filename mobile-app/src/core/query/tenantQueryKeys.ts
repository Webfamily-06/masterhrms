import { QueryKey } from '@tanstack/react-query';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Tenant-Aware Query Key Helper:
 * Automatically prefixes query keys with the authoritative tenant ID.
 * Strict: Never falls back to an unsafe 'default' tenant key.
 *
 * @param keyParts Array of strings, numbers, or objects representing query key segments
 * @param explicitTenantId Optional tenant ID override (defaults to current tenant/auth store context)
 */
export function createTenantQueryKey(
  keyParts: (string | number | object)[],
  explicitTenantId?: string
): QueryKey {
  const tenantId =
    explicitTenantId ||
    useTenantStore.getState().currentTenant?.id ||
    useAuthStore.getState().user?.profile?.tenantId;

  if (!tenantId) {
    // Isolated unassigned partition preventing cross-tenant leakage
    return ['__no_tenant_context__', ...keyParts];
  }

  return [tenantId, ...keyParts];
}
