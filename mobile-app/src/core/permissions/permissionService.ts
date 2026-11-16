/**
 * Permission Service for MasterHRMS Mobile.
 *
 * Implements strict, authoritative client-side permission matching.
 * Never synthesizes permissions from role names.
 * Supports backend dot notation (module.resource.action), colon notation (module:resource:action),
 * and wildcards (*, module.*, module.resource.*).
 */

function normalizePermissionCode(code: string): string {
  return code.trim().toLowerCase();
}

/**
 * Checks if a single user-held permission satisfies a required permission.
 */
function matchesRule(userPerm: string, requiredPerm: string): boolean {
  if (userPerm === '*' || userPerm === 'all') {
    return true;
  }

  if (userPerm === requiredPerm) {
    return true;
  }

  // Handle dot notation wildcards (e.g. "hrm.*" or "hrm.employees.*")
  if (userPerm.endsWith('.*')) {
    const prefix = userPerm.slice(0, -2);
    if (requiredPerm.startsWith(prefix + '.') || requiredPerm === prefix) {
      return true;
    }
  }

  // Handle colon notation wildcards (e.g. "hr:*" or "hr:employees:*")
  if (userPerm.endsWith(':*')) {
    const prefix = userPerm.slice(0, -2);
    if (requiredPerm.startsWith(prefix + ':') || requiredPerm === prefix) {
      return true;
    }
  }

  // Handle cross-notation equivalence (e.g. "hrm.employees.view" matches "hrm:employees:view")
  const dotEquiv = userPerm.replace(/:/g, '.');
  const reqDotEquiv = requiredPerm.replace(/:/g, '.');
  if (dotEquiv === reqDotEquiv) {
    return true;
  }
  if (dotEquiv.endsWith('.*')) {
    const prefix = dotEquiv.slice(0, -2);
    if (reqDotEquiv.startsWith(prefix + '.') || reqDotEquiv === prefix) {
      return true;
    }
  }

  return false;
}

export class PermissionService {
  /**
   * Verifies if user has the specified permission.
   */
  static hasPermission(
    userPermissions: string[] | undefined | null,
    requiredPermission: string
  ): boolean {
    if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
      return false;
    }
    if (!requiredPermission) {
      return true;
    }

    const cleanRequired = normalizePermissionCode(requiredPermission);

    return userPermissions.some((perm) => {
      if (!perm || typeof perm !== 'string') return false;
      return matchesRule(normalizePermissionCode(perm), cleanRequired);
    });
  }

  /**
   * Verifies if user has AT LEAST ONE of the specified permissions (OR logic).
   */
  static hasAnyPermission(
    userPermissions: string[] | undefined | null,
    requiredPermissions: string[]
  ): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.some((req) => this.hasPermission(userPermissions, req));
  }

  /**
   * Verifies if user has ALL of the specified permissions (AND logic).
   */
  static hasAllPermissions(
    userPermissions: string[] | undefined | null,
    requiredPermissions: string[]
  ): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.every((req) => this.hasPermission(userPermissions, req));
  }
}
