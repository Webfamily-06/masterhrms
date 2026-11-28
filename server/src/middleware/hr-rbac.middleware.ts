import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";

const HR_ADMIN_ROLE_TOKENS = [
  "super_admin",
  "tenant_admin",
  "workspace_admin",
  "admin",
  "owner",
  "hr_admin",
  "hr_manager",
  "hr",
  "manager",
  "recruiter",
  "payroll_admin",
];

const HR_ADMIN_WORKSPACE_ROLE_NAMES = [
  "workspace admin",
  "tenant admin",
  "hr admin",
  "hr manager",
  "administrator",
  "super admin",
  "owner",
];

export interface HrRbacOptions {
  /** Optional permission prefixes or substrings that also grant access (e.g. ["hrm.recruitment", "recruitment.manage"]) */
  allowedPermissions?: string[];
  /** Optional custom message when denied */
  deniedMessage?: string;
  /** Allow read-only HTTP methods (GET, HEAD, OPTIONS) for all authenticated tenant users */
  allowReads?: boolean;
  /** Optional allowlist of self-service route matchers permitted for non-HR employees */
  allowSelfService?: Array<{ method: string; pattern: RegExp }>;
}

/**
 * Checks whether the authenticated user carries HR, Manager, Tenant Admin, or Super Admin authority
 * (consistent with P22-SEC-002 in hr-meetings.routes.ts).
 */
export function isHrOrAdminUser(req: AuthRequest, allowedPermissions: string[] = []): boolean {
  const user = req.user;
  if (!user) return false;

  const roles = (user.roles || []).map((r) => String(r).toLowerCase().trim());
  const singleRole = String((user as any).role || "").toLowerCase().trim();
  if (singleRole) roles.push(singleRole);

  const wsRole = String((user as any).workspaceRole || "").toLowerCase().trim();
  const perms = (user.permissions || []).map((p) => String(p).toLowerCase().trim());

  if (roles.some((r) => HR_ADMIN_ROLE_TOKENS.includes(r))) {
    return true;
  }
  if (wsRole && HR_ADMIN_WORKSPACE_ROLE_NAMES.includes(wsRole)) {
    return true;
  }
  if (allowedPermissions.length > 0) {
    const normalized = allowedPermissions.map((p) => p.toLowerCase());
    if (perms.some((p) => normalized.some((token) => p.includes(token)))) {
      return true;
    }
  }
  return false;
}

/**
 * Express middleware enforcing HR/Admin/Manager RBAC on HR module routers (DEFECT-041 / P22-SEC-002 parity).
 */
export function requireHrOrAdmin(options: HrRbacOptions = {}) {
  const {
    allowedPermissions = [],
    deniedMessage = "Access denied: HR Administrator or Manager privileges are required for this action.",
    allowReads = false,
    allowSelfService = [],
  } = options;

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === "OPTIONS" || method === "HEAD") {
      return next();
    }
    if (allowReads && method === "GET") {
      return next();
    }

    if (isHrOrAdminUser(req, allowedPermissions)) {
      return next();
    }

    const reqPath = req.path || "";
    if (
      allowSelfService.some(
        (rule) => rule.method.toUpperCase() === method && rule.pattern.test(reqPath)
      )
    ) {
      return next();
    }

    return res.status(403).json({
      error: deniedMessage,
      code: "HR_ROLE_REQUIRED",
    });
  };
}
