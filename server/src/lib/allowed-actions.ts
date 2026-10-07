import { UserSecurityContext } from "./data-scope";

export type EntityType =
  | "Employee"
  | "LeaveRequest"
  | "AttendanceRegularization"
  | "ApprovalRequest"
  | "ExpenseClaim"
  | "WorkflowDefinition"
  | "Generic";

export interface EntityRecordContext {
  id?: string;
  employeeId?: string | null;
  requesterId?: string | null;
  userId?: string | null;
  status?: string | null;
  currentApproverId?: string | null;
  isLocked?: boolean;
}

/**
 * Computes allowed actions dynamically for an entity record based on:
 * - entity type
 * - record lifecycle / workflow state
 * - authenticated user's ownership & security context
 */
export function computeAllowedActions(
  entityType: EntityType,
  record: EntityRecordContext,
  userContext: UserSecurityContext,
  permissions: string[] = []
): string[] {
  const actions = new Set<string>(["VIEW"]);

  const isOwner =
    (record.employeeId && record.employeeId === userContext.employeeId) ||
    (record.requesterId && record.requesterId === userContext.userId) ||
    (record.userId && record.userId === userContext.userId);

  const isAdmin = userContext.isTenantAdmin;
  const status = (record.status || "").toUpperCase();

  switch (entityType) {
    case "Employee": {
      if (isAdmin || permissions.includes("hr.employees.update")) {
        actions.add("EDIT");
        actions.add("TRANSFER");
        actions.add("DEACTIVATE");
      }
      if (isAdmin || permissions.includes("hr.employees.delete")) {
        actions.add("DELETE");
      }
      if (isOwner) {
        actions.add("EDIT_PROFILE");
        actions.add("REQUEST_CHANGE");
      }
      break;
    }

    case "LeaveRequest": {
      if (status === "DRAFT") {
        if (isOwner || isAdmin) {
          actions.add("EDIT");
          actions.add("SUBMIT");
          actions.add("DELETE");
        }
      } else if (status === "PENDING") {
        if (isOwner) {
          actions.add("WITHDRAW");
        }
        if (
          isAdmin ||
          record.currentApproverId === userContext.employeeId ||
          permissions.includes("hr.leave.approve")
        ) {
          actions.add("APPROVE");
          actions.add("REJECT");
          actions.add("DELEGATE");
        }
      } else if (status === "APPROVED") {
        if (isAdmin || permissions.includes("hr.leave.cancel")) {
          actions.add("CANCEL");
        }
        actions.add("DOWNLOAD_RECEIPT");
      } else if (status === "REJECTED") {
        if (isOwner) {
          actions.add("RESUBMIT");
        }
      }
      break;
    }

    case "ApprovalRequest": {
      if (status === "PENDING") {
        if (isOwner) {
          actions.add("WITHDRAW");
        }
        if (
          isAdmin ||
          record.currentApproverId === userContext.userId ||
          record.currentApproverId === userContext.employeeId
        ) {
          actions.add("APPROVE");
          actions.add("REJECT");
          actions.add("DELEGATE");
        }
      } else if (status === "REJECTED" && isOwner) {
        actions.add("RESUBMIT");
      }
      break;
    }

    case "ExpenseClaim": {
      if (status === "DRAFT") {
        if (isOwner || isAdmin) {
          actions.add("EDIT");
          actions.add("SUBMIT");
          actions.add("DELETE");
        }
      } else if (status === "PENDING") {
        if (isOwner) {
          actions.add("WITHDRAW");
        }
        if (isAdmin || permissions.includes("finance.expense.approve")) {
          actions.add("APPROVE");
          actions.add("REJECT");
        }
      }
      break;
    }

    default: {
      if (isAdmin) {
        actions.add("EDIT");
        actions.add("DELETE");
      }
      break;
    }
  }

  return Array.from(actions);
}

/**
 * Attaches computed `allowedActions` to an entity or list of entities.
 */
export function attachAllowedActions<T extends EntityRecordContext>(
  entityType: EntityType,
  data: T | T[],
  userContext: UserSecurityContext,
  permissions: string[] = []
): (T & { allowedActions: string[] }) | (T & { allowedActions: string[] })[] {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      allowedActions: computeAllowedActions(entityType, item, userContext, permissions),
    }));
  }

  return {
    ...data,
    allowedActions: computeAllowedActions(entityType, data, userContext, permissions),
  };
}
