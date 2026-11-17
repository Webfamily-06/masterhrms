/**
 * Strict Canonical Roles whitelist for MasterHRMS Mobile.
 * Never defaults unknown roles to employee.
 */
export type CanonicalRole =
  | 'tenant_admin'
  | 'hr_admin'
  | 'manager'
  | 'employee';

export interface RoleDescriptor {
  role: CanonicalRole;
  title: string;
  badgeLabel: string;
  description: string;
}

export const CANONICAL_ROLE_DESCRIPTORS: Record<CanonicalRole, RoleDescriptor> = {
  tenant_admin: {
    role: 'tenant_admin',
    title: 'Organization Administrator',
    badgeLabel: 'Workspace Admin',
    description: 'Tenant organization settings, security and module configuration',
  },
  hr_admin: {
    role: 'hr_admin',
    title: 'HR Administrator',
    badgeLabel: 'HR Admin',
    description: 'Employee registry, organization attendance, leave and payroll',
  },
  manager: {
    role: 'manager',
    title: 'Team Manager',
    badgeLabel: 'Manager',
    description: 'Team attendance oversight, leave approvals and project tasks',
  },
  employee: {
    role: 'employee',
    title: 'Employee',
    badgeLabel: 'Self-Service',
    description: 'Personal attendance check-in, leave requests and payslips',
  },
};

/**
 * Precedence order for default active persona when user has multiple roles
 */
export const ROLE_HIERARCHY_ORDER: CanonicalRole[] = [
  'tenant_admin',
  'hr_admin',
  'manager',
  'employee',
];

/**
 * Normalizes raw server roles to canonical mobile roles.
 * Unknown roles are completely ignored (NOT defaulted to employee).
 * Super Admin is strictly forbidden on mobile and will be ignored/filtered out.
 */
export function normalizeToCanonicalRoles(rawRoles: (string | undefined | null)[]): CanonicalRole[] {
  if (!rawRoles || !Array.isArray(rawRoles)) return [];

  const canonicalSet = new Set<CanonicalRole>();

  for (const raw of rawRoles) {
    if (!raw) continue;
    const clean = String(raw).trim().toLowerCase();

    // Super Admin is strictly excluded from mobile application
    if (clean === 'super_admin' || clean === 'superadmin') {
      continue;
    } else if (
      clean === 'tenant_admin' ||
      clean === 'workspace_admin' ||
      clean === 'admin' ||
      clean === 'workspace admin' ||
      clean === 'tenant admin'
    ) {
      canonicalSet.add('tenant_admin');
    } else if (clean === 'hr_admin' || clean === 'hr' || clean === 'hr admin') {
      canonicalSet.add('hr_admin');
    } else if (clean === 'manager' || clean === 'team_lead') {
      canonicalSet.add('manager');
    } else if (clean === 'employee' || clean === 'staff') {
      canonicalSet.add('employee');
    }
  }

  // Return sorted by hierarchy precedence
  return ROLE_HIERARCHY_ORDER.filter((r) => canonicalSet.has(r));
}

/**
 * Resolves the primary initial persona from a list of canonical roles
 */
export function resolvePrimaryRole(roles: CanonicalRole[]): CanonicalRole | null {
  if (!roles || roles.length === 0) return null;
  for (const r of ROLE_HIERARCHY_ORDER) {
    if (roles.includes(r)) return r;
  }
  return null;
}
