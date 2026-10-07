import { PrismaClient } from "@prisma/client";

export type DataScope =
  | "SELF"
  | "TEAM_DIRECT"
  | "TEAM_ALL"
  | "DEPARTMENT"
  | "BRANCH"
  | "ALL";

export interface UserSecurityContext {
  userId: string;
  tenantId: string;
  roles: string[];
  employeeId?: string | null;
  employeeCode?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  managerId?: string | null;
  directReportEmployeeIds: string[];
  allSubordinateEmployeeIds: string[];
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
}

export type UserContext = UserSecurityContext;

/**
 * Resolves the authenticated user's complete organizational security context
 * strictly from server-side database records.
 * 
 * Never trusts any client-provided IDs for employee, department, branch, or manager.
 */
export async function resolveUserSecurityContext(
  userId: string,
  tenantId: string,
  roles: string[] = [],
  db: PrismaClient
): Promise<UserSecurityContext> {
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin =
    isSuperAdmin ||
    roles.includes("admin") ||
    roles.includes("hr_admin") ||
    roles.includes("Workspace Admin");

  // Query employee linked to this user in this tenant
  let employee: any = null;
  try {
    employee = await (db as any).employee.findFirst({
      where: {
        userId,
        tenantId,
      },
      select: {
        id: true,
        employeeCode: true,
        departmentId: true,
        branchId: true,
        managerId: true,
      },
    });
  } catch (err) {
    employee = null;
  }

  const employeeId = employee?.id ?? null;
  const directReportEmployeeIds: string[] = [];
  const allSubordinateEmployeeIds: string[] = [];

  if (employeeId) {
    // 1. Resolve direct reports (where managerId === employeeId)
    try {
      const directReports = await (db as any).employee.findMany({
        where: {
          tenantId,
          managerId: employeeId,
        },
        select: { id: true },
      });
      for (const dr of directReports) {
        directReportEmployeeIds.push(dr.id);
      }

      // 2. Resolve all recursive subordinates (Breadth-First Search)
      const queue = [...directReportEmployeeIds];
      const visited = new Set<string>(queue);

      while (queue.length > 0) {
        const currentBatch = queue.splice(0, 50);
        const subReports = await (db as any).employee.findMany({
          where: {
            tenantId,
            managerId: { in: currentBatch },
          },
          select: { id: true },
        });

        for (const sub of subReports) {
          if (!visited.has(sub.id)) {
            visited.add(sub.id);
            queue.push(sub.id);
          }
        }
      }

      allSubordinateEmployeeIds.push(...Array.from(visited));
    } catch (err) {
      console.error("[resolveUserSecurityContext] Failed resolving subordinates:", err);
    }
  }

  return {
    userId,
    tenantId,
    roles,
    employeeId,
    employeeCode: employee?.employeeCode ?? null,
    departmentId: employee?.departmentId ?? null,
    branchId: employee?.branchId ?? null,
    managerId: employee?.managerId ?? null,
    directReportEmployeeIds,
    allSubordinateEmployeeIds,
    isSuperAdmin,
    isTenantAdmin,
  };
}

/**
 * Builds a Prisma `where` filter object based on the required DataScope and SecurityContext.
 * 
 * @param scope Effective DataScope (SELF, TEAM_DIRECT, TEAM_ALL, DEPARTMENT, BRANCH, ALL)
 * @param context Resolved SecurityContext
 * @param targetEntity The type of entity being queried ('employee' | 'employee_dependent')
 */
export function buildDataScopeFilter(
  scope: DataScope,
  context: UserSecurityContext,
  targetEntity: "employee" | "employee_dependent" = "employee_dependent"
): Record<string, any> {
  // Tenant Admins or Super Admins default to organization-wide access if scope is ALL
  if (scope === "ALL" || context.isTenantAdmin) {
    return {};
  }

  const selfId = context.employeeId;
  // If user has no associated employee record in this tenant, they can only match nothing safely
  if (!selfId) {
    return targetEntity === "employee"
      ? { id: "__NO_ACCESS__" }
      : { employeeId: "__NO_ACCESS__" };
  }

  switch (scope) {
    case "SELF":
      return targetEntity === "employee"
        ? { id: selfId }
        : { employeeId: selfId };

    case "TEAM_DIRECT": {
      const allowedIds = [selfId, ...context.directReportEmployeeIds];
      return targetEntity === "employee"
        ? { id: { in: allowedIds } }
        : { employeeId: { in: allowedIds } };
    }

    case "TEAM_ALL": {
      const allowedIds = [selfId, ...context.allSubordinateEmployeeIds];
      return targetEntity === "employee"
        ? { id: { in: allowedIds } }
        : { employeeId: { in: allowedIds } };
    }

    case "DEPARTMENT": {
      if (!context.departmentId) {
        return targetEntity === "employee"
          ? { id: selfId }
          : { employeeId: selfId };
      }
      return targetEntity === "employee"
        ? { departmentId: context.departmentId }
        : { employee: { departmentId: context.departmentId } };
    }

    case "BRANCH": {
      if (!context.branchId) {
        return targetEntity === "employee"
          ? { id: selfId }
          : { employeeId: selfId };
      }
      return targetEntity === "employee"
        ? { branchId: context.branchId }
        : { employee: { branchId: context.branchId } };
    }

    default:
      return targetEntity === "employee"
        ? { id: selfId }
        : { employeeId: selfId };
  }
}

/**
 * Validates whether a specific record is within the permitted data scope.
 */
export function canAccessRecord(
  record: {
    id?: string;
    employeeId?: string | null;
    departmentId?: string | null;
    branchId?: string | null;
  },
  scope: DataScope,
  context: UserSecurityContext
): boolean {
  if (scope === "ALL" || context.isTenantAdmin) {
    return true;
  }

  const recordOwnerId = record.employeeId || record.id;
  if (!recordOwnerId || !context.employeeId) {
    return false;
  }

  switch (scope) {
    case "SELF":
      return recordOwnerId === context.employeeId;

    case "TEAM_DIRECT":
      return (
        recordOwnerId === context.employeeId ||
        context.directReportEmployeeIds.includes(recordOwnerId)
      );

    case "TEAM_ALL":
      return (
        recordOwnerId === context.employeeId ||
        context.allSubordinateEmployeeIds.includes(recordOwnerId)
      );

    case "DEPARTMENT":
      return (
        record.departmentId === context.departmentId ||
        recordOwnerId === context.employeeId
      );

    case "BRANCH":
      return (
        record.branchId === context.branchId ||
        recordOwnerId === context.employeeId
      );

    default:
      return recordOwnerId === context.employeeId;
  }
}

export const buildDataScopePrismaFilter = buildDataScopeFilter;
