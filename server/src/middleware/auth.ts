import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { prisma, rawPrisma } from "../prisma";
import { getWorkspacePolicy, assertWorkspaceActive } from "../services/workspace-policy.service";

export interface AuthRequest extends Request {
  user?: JwtPayload & {
    workspaceRole?: string;
    permissions?: string[];
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    if ((decoded as any).mfaPending) return res.status(401).json({ error: "Complete two-factor verification first." });
    const userId = decoded.userId || (decoded as any).id;
    const account = await (rawPrisma || prisma).user.findUnique({ where: { id: userId }, include: { profile: true, roles: true } });
    if (!account) return res.status(401).json({ error: "Account no longer exists." });
    const isSuper = account.roles.some((r) => r.role === "super_admin");
    // Constitutional Security: Tenant context must NEVER be overridable through untrusted client headers or query parameters
    const tenantId = account.profile?.tenantId || (isSuper && decoded.tenantId ? decoded.tenantId : null);
    const roles = account.roles.filter((r) => r.role === "super_admin" || r.tenantId === tenantId).map((r) => r.role);
    if (!isSuper && tenantId) {
      try { assertWorkspaceActive(await getWorkspacePolicy(tenantId)); }
      catch (error: any) { return res.status(error.status || 503).json({ error: error.message }); }
    }
    if (!isSuper && !tenantId && !req.originalUrl.startsWith("/api/auth/")) {
      return res.status(403).json({ error: "Complete workspace onboarding first." });
    }

    req.user = {
      ...decoded,
      userId,
      tenantId: tenantId ?? null,
      roles,
    };
    (req.user as any).id = userId;
    next();
  } catch (err: any) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name)) {
      return res.status(401).json({ error: "Unauthorized: Token expired or invalid" });
    }
    console.error("[requireAuth] Error:", err?.message || err);
    return res.status(503).json({ error: err?.message || "Unable to verify workspace access. Please retry." });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole("super_admin")(req, res, next);
}

/**
 * requirePermission - Dynamic permission validator
 * Resolves user role, active status, module enablement, and action permission.
 * Format: module.resource.action (e.g. finance.invoices.view)
 */
export function requirePermission(permissionCode: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Strict Role Separation: Super Admin does not automatically bypass tenant checks on tenant-scoped endpoints
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Forbidden: Valid workspace context is required for tenant-scoped operations" });
    }

    try {
      // 2. Check if Module is enabled in this workspace
      const moduleKey = permissionCode.split(".")[0];
      let tenantMod: any = null;
      const db = rawPrisma || prisma;
      try {
        tenantMod = await db.tenantModule.findUnique({
          where: {
            tenantId_moduleKey: {
              tenantId,
              moduleKey,
            },
          },
        });
      } catch {
        tenantMod = null;
      }

      if (tenantMod && !tenantMod.isEnabled) {
        return res.status(403).json({
          error: "Forbidden: The " + moduleKey.toUpperCase() + " module is currently disabled for this workspace",
        });
      }

      // 3. Resolve User Role Assignment
      let assignment: any = null;
      try {
        assignment = await db.userRoleAssignment.findUnique({
          where: {
            userId_tenantId: {
              userId: req.user.userId,
              tenantId,
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        });
      } catch {
        assignment = null;
      }

      if (!assignment || !assignment.role || !assignment.role.isActive) {
        if (req.user.roles?.includes("admin") || req.user.roles?.includes("hr_admin") || req.user.roles?.includes("Workspace Admin")) {
          return next();
        }
        return res.status(403).json({
          error: "Forbidden: No active role assigned in this workspace",
        });
      }

      // Workspace Admin role has full access
      if (assignment.role.name === "Workspace Admin") {
        return next();
      }

      // 4. Verify permission exists on role
      const hasPerm = assignment.role.permissions.some(
        (rp) => rp.permission.code === permissionCode
      );

      if (!hasPerm) {
        return res.status(403).json({
          error: "Forbidden: You do not have permission (" + permissionCode + ") to perform this action",
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({ error: "Internal authorization check error: " + err.message });
    }
  };
}
