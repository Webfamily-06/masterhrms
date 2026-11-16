import { PermissionService } from '../src/core/permissions/permissionService';
import {
  normalizeToCanonicalRoles,
  resolvePrimaryRole,
  CanonicalRole,
} from '../src/types/roles.types';
import { useAuthStore } from '../src/store/authStore';
import { useTenantStore } from '../src/store/tenantStore';
import { createTenantQueryKey, purgeQueryCache } from '../src/app/providers/QueryProvider';
import { ERP_MODULE_REGISTRY, ErpModuleKey } from '../src/types/modules.types';
import { TenantService } from '../src/core/tenant/tenantService';
import { apiClient } from '../src/core/api/apiClient';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Phase 3: Role & Permission Navigation Engine & Security', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useAuthStore.getState().logout();
    await useTenantStore.getState().clearTenant();
  });

  describe('1. Authoritative Permission Resolver & Wildcard Expansion', () => {
    it('returns false for empty or null permissions without synthesizing from roles', () => {
      expect(PermissionService.hasPermission([], 'hrm.dashboard.view')).toBe(false);
      expect(PermissionService.hasPermission(null, 'hrm.dashboard.view')).toBe(false);
      expect(PermissionService.hasPermission(undefined, 'hrm.dashboard.view')).toBe(false);
    });

    it('validates exact dot-notation permission codes', () => {
      const perms = ['hrm.dashboard.view', 'hrm.employees.create', 'hrm.payroll.approve'];
      expect(PermissionService.hasPermission(perms, 'hrm.dashboard.view')).toBe(true);
      expect(PermissionService.hasPermission(perms, 'hrm.employees.create')).toBe(true);
      expect(PermissionService.hasPermission(perms, 'hrm.employees.delete')).toBe(false);
    });

    it('satisfies any permission with global wildcard "*"', () => {
      const superAdminPerms = ['*'];
      expect(PermissionService.hasPermission(superAdminPerms, 'hrm.dashboard.view')).toBe(true);
      expect(PermissionService.hasPermission(superAdminPerms, 'finance.invoices.delete')).toBe(true);
      expect(PermissionService.hasPermission(superAdminPerms, 'any.custom.permission')).toBe(true);
    });

    it('expands module-level wildcards ("module.*" and "module:*")', () => {
      const managerPerms = ['hrm.*', 'project:*'];
      expect(PermissionService.hasPermission(managerPerms, 'hrm.dashboard.view')).toBe(true);
      expect(PermissionService.hasPermission(managerPerms, 'hrm.attendance.approve')).toBe(true);
      expect(PermissionService.hasPermission(managerPerms, 'project.tasks.create')).toBe(true);
      expect(PermissionService.hasPermission(managerPerms, 'finance.invoices.view')).toBe(false);
    });

    it('expands resource-level wildcards ("module.resource.*")', () => {
      const hrSpecialistPerms = ['hrm.employees.*'];
      expect(PermissionService.hasPermission(hrSpecialistPerms, 'hrm.employees.view')).toBe(true);
      expect(PermissionService.hasPermission(hrSpecialistPerms, 'hrm.employees.create')).toBe(true);
      expect(PermissionService.hasPermission(hrSpecialistPerms, 'hrm.employees.delete')).toBe(true);
      expect(PermissionService.hasPermission(hrSpecialistPerms, 'hrm.payroll.view')).toBe(false);
    });

    it('resolves cross-notation equivalence (dot vs colon)', () => {
      const perms = ['hr:employees:read', 'hrm.attendance.view'];
      expect(PermissionService.hasPermission(perms, 'hr.employees.read')).toBe(true);
      expect(PermissionService.hasPermission(perms, 'hrm:attendance:view')).toBe(true);
    });

    it('evaluates hasAnyPermission correctly (OR logic)', () => {
      const perms = ['hrm.employees.view'];
      expect(
        PermissionService.hasAnyPermission(perms, ['hrm.payroll.approve', 'hrm.employees.view'])
      ).toBe(true);
      expect(
        PermissionService.hasAnyPermission(perms, ['hrm.payroll.approve', 'finance.invoices.create'])
      ).toBe(false);
    });

    it('evaluates hasAllPermissions correctly (AND logic)', () => {
      const perms = ['hrm.employees.view', 'hrm.payroll.approve'];
      expect(
        PermissionService.hasAllPermissions(perms, ['hrm.employees.view', 'hrm.payroll.approve'])
      ).toBe(true);
      expect(
        PermissionService.hasAllPermissions(perms, ['hrm.employees.view', 'hrm.payroll.delete'])
      ).toBe(false);
    });
  });

  describe('2. Unknown Role Handling & Zero-Fallback Rule', () => {
    it('never defaults empty roles to employee (enters NO_VALID_ROLE state)', () => {
      const canonical = normalizeToCanonicalRoles([]);
      expect(canonical).toEqual([]);
      expect(resolvePrimaryRole(canonical)).toBeNull();
    });

    it('never defaults unrecognized role strings to employee', () => {
      const canonical = normalizeToCanonicalRoles(['contractor', 'guest', 'auditor', 'unknown_role']);
      expect(canonical).toEqual([]);
      expect(resolvePrimaryRole(canonical)).toBeNull();
    });

    it('normalizes recognized aliases to canonical roles', () => {
      expect(normalizeToCanonicalRoles(['admin'])).toEqual(['tenant_admin']);
      expect(normalizeToCanonicalRoles(['workspace_admin'])).toEqual(['tenant_admin']);
      expect(normalizeToCanonicalRoles(['Workspace Admin'])).toEqual(['tenant_admin']);
      expect(normalizeToCanonicalRoles(['hr'])).toEqual(['hr_admin']);
      expect(normalizeToCanonicalRoles(['team_lead'])).toEqual(['manager']);
      expect(normalizeToCanonicalRoles(['staff'])).toEqual(['employee']);
      expect(normalizeToCanonicalRoles(['super_admin'])).toEqual(['super_admin']);
    });
  });

  describe('3. Multiple Roles & Runtime Persona Switcher', () => {
    it('sorts multiple assigned roles by privilege precedence', () => {
      const roles = ['employee', 'manager', 'tenant_admin'];
      const canonical = normalizeToCanonicalRoles(roles);
      expect(canonical).toEqual(['tenant_admin', 'manager', 'employee']);
      expect(resolvePrimaryRole(canonical)).toBe('tenant_admin');
    });

    it('allows runtime switching of active persona between assigned roles', () => {
      const store = useAuthStore.getState();
      store.setUser({
        id: 'usr-1',
        email: 'lead@company.com',
        roles: ['employee', 'manager'],
        permissions: ['hrm.attendance.view', 'hrm.attendance.approve'],
      });

      expect(useAuthStore.getState().activeRole).toBe('manager');

      // Switch to employee persona
      useAuthStore.getState().setActiveRole('employee');
      expect(useAuthStore.getState().activeRole).toBe('employee');

      // Attempt invalid switch to unassigned role fails closed
      useAuthStore.getState().setActiveRole('tenant_admin' as CanonicalRole);
      expect(useAuthStore.getState().activeRole).toBe('employee');
    });
  });

  describe('4. Authoritative Module Registry & Subscription Gating', () => {
    it('contains all 9 authoritative ERP module definitions', () => {
      const keys: ErpModuleKey[] = [
        'hrm',
        'pos',
        'inventory',
        'crm',
        'finance',
        'project',
        'support',
        'procurement',
        'analytics',
      ];

      for (const key of keys) {
        expect(ERP_MODULE_REGISTRY[key]).toBeDefined();
        expect(ERP_MODULE_REGISTRY[key].key).toBe(key);
        expect(ERP_MODULE_REGISTRY[key].permission).toMatch(/\.dashboard\.view$/);
      }
    });

    it('identifies core platform modules correctly', () => {
      expect(ERP_MODULE_REGISTRY.hrm.isCore).toBe(true);
      expect(ERP_MODULE_REGISTRY.project.isCore).toBe(true);
      expect(ERP_MODULE_REGISTRY.support.isCore).toBe(true);
      expect(ERP_MODULE_REGISTRY.analytics.isCore).toBe(true);
      expect(ERP_MODULE_REGISTRY.pos.isCore).toBe(false);
      expect(ERP_MODULE_REGISTRY.inventory.isCore).toBe(false);
    });
  });

  describe('5. Tenant Switching & Query Cache Isolation', () => {
    it('strictly isolates query keys by active tenant ID', () => {
      useTenantStore.setState({
        currentTenant: {
          resolved: true,
          id: 'tenant-omega-44',
          name: 'Omega Corp',
          slug: 'omega',
          logoUrl: '/logo.webp',
          logoDark: '/white-logo.webp',
          faviconUrl: '/favicon.webp',
          primaryColor: '#0F766E',
          timezone: 'Asia/Kolkata',
          isWhiteLabeled: false,
        },
      });

      const key = createTenantQueryKey(['attendance', 'summary']);
      expect(key[0]).toBe('tenant-omega-44');
      expect(key[1]).toBe('attendance');
      expect(key[2]).toBe('summary');
    });

    it('never uses "default_tenant" fallback when tenant is absent', () => {
      useTenantStore.setState({ currentTenant: null });
      useAuthStore.setState({ user: null });

      const key = createTenantQueryKey(['attendance', 'summary']);
      expect(key[0]).toBe('__no_tenant_context__');
      expect(key[0]).not.toBe('default');
      expect(key[0]).not.toBe('default_tenant');
    });

    it('purges query cache cleanly on tenant switch / logout', async () => {
      await expect(purgeQueryCache()).resolves.not.toThrow();
    });

    it('executes atomic tenant switch and re-hydrates authoritative profile', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            resolved: true,
            id: 'tenant-delta-99',
            name: 'Delta Corp',
            slug: 'delta',
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-delta-1',
            email: 'admin@delta.com',
            roles: ['tenant_admin', 'employee'],
            permissions: ['hrm.dashboard.view', 'hrm.*'],
            enabledModules: ['hrm', 'project'],
            allowedDashboards: ['hrm', 'project'],
            profile: { tenantId: 'tenant-delta-99' },
          },
        });

      const result = await TenantService.switchTenant('delta');

      expect(apiClient.get).toHaveBeenNthCalledWith(
        1,
        '/api/v1/auth/public/tenant/resolve?slug=delta',
        expect.anything()
      );
      expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/auth/me');

      expect(result.success).toBe(true);
      expect(result.tenant.id).toBe('tenant-delta-99');
      expect(result.activeRole).toBe('tenant_admin');
      expect(useTenantStore.getState().currentTenant?.id).toBe('tenant-delta-99');
      expect(useAuthStore.getState().activeRole).toBe('tenant_admin');
      expect(useAuthStore.getState().permissions).toContain('hrm.*');
    });

    it('fails closed when destination tenant resolution fails', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          resolved: false,
        },
      });

      await expect(TenantService.switchTenant('nonexistent_tenant')).rejects.toThrow();

      // State is purged and fail-closed
      expect(useTenantStore.getState().currentTenant).toBeNull();
      expect(useAuthStore.getState().activeRole).toBeNull();
    });
  });

  describe('6. Super Admin Isolation', () => {
    it('sets isSuperAdmin flag strictly when super_admin role is present', () => {
      const store = useAuthStore.getState();
      store.setUser({
        id: 'super-root',
        email: 'root@masterhrms.com',
        roles: ['super_admin'],
        permissions: ['*'],
      });

      expect(useAuthStore.getState().isSuperAdmin).toBe(true);
      expect(useAuthStore.getState().activeRole).toBe('super_admin');
    });

    it('does not conflate super_admin with tenant_admin', () => {
      const store = useAuthStore.getState();
      store.setUser({
        id: 'tenant-lead',
        email: 'admin@acme.com',
        roles: ['tenant_admin'],
        permissions: ['hrm.*'],
      });

      expect(useAuthStore.getState().isSuperAdmin).toBe(false);
      expect(useAuthStore.getState().activeRole).toBe('tenant_admin');
    });
  });
});
