export const hasRole = (role: string, userRoles: string[] = []) =>
    userRoles.includes(role);

export const hasPermission = (userPermissions: string[], permission: string | string[]) =>
    Array.isArray(permission)
        ? permission.some(p => userPermissions.includes(p))
        : userPermissions.includes(permission);