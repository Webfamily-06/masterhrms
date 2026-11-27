import type { Response, NextFunction } from "express";
import { rawPrisma as prisma } from "../prisma";
import type { AuthRequest } from "../middleware/auth";

/**
 * Super Admin Platform Audit Trail + shared RBAC helpers.
 *
 * Every privileged / destructive Super Admin mutation is persisted twice:
 *  1. `setting_audits` (scope = PLATFORM, key = "super_audit.<action>") — tenant-independent,
 *     so the record survives even permanent tenant deletion.
 *  2. `audit_logs` (tenant-scoped) when the target tenant still exists, so tenant admins
 *     can see Super Admin actions taken against their workspace.
 */

const SENSITIVE_KEY = /pass(word)?|secret|token|api[_-]?key|private|otp|backup[_-]?codes|cvv|card/i;

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactSensitive(v, depth + 1));
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : redactSensitive(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

export interface SuperAuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  tenantId?: string | null;
  before?: unknown;
  after?: unknown;
}

export async function writeSuperAuditLog(req: AuthRequest, entry: SuperAuditEntry): Promise<void> {
  const actorId = req.user?.impersonatorUserId || req.user?.userId || "SYSTEM";
  const actorEmail = req.user?.impersonatorEmail || req.user?.email || null;
  const ipAddress = (req.ip || "").slice(0, 45) || null;
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 255) || null;
  const action = entry.action.slice(0, 50);
  const before = redactSensitive(entry.before ?? null);
  const after = redactSensitive(entry.after ?? null);

  try {
    await prisma.settingAudit.create({
      data: {
        scope: "PLATFORM",
        scopeId: entry.tenantId || null,
        key: `super_audit.${entry.action}`.slice(0, 100),
        oldValueMasked: before as any,
        newValueMasked: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId || null,
          tenantId: entry.tenantId || null,
          actorEmail,
          after,
        } as any,
        changedBy: actorId.slice(0, 36),
        ipAddress,
        userAgent,
      },
    });
  } catch (err: any) {
    console.error("[SuperAudit] Failed to persist platform audit record:", err?.message || err);
  }

  if (entry.tenantId) {
    try {
      const tenantExists = await prisma.tenant.findUnique({ where: { id: entry.tenantId }, select: { id: true } });
      if (tenantExists) {
        await prisma.auditLog.create({
          data: {
            tenantId: entry.tenantId,
            actorId: actorId === "SYSTEM" ? null : actorId.slice(0, 36),
            actorEmail,
            action,
            entityType: entry.entityType.slice(0, 100),
            entityId: entry.entityId ? String(entry.entityId).slice(0, 64) : null,
            beforeJson: before as any,
            afterJson: after as any,
            ipAddress,
            userAgent,
          },
        });
      }
    } catch (err: any) {
      console.error("[SuperAudit] Failed to persist tenant audit record:", err?.message || err);
    }
  }
}

/**
 * Router-level middleware: automatically records every successful (2xx/3xx) mutating
 * Super Admin request (POST/PUT/PATCH/DELETE) with redacted request body.
 * Handlers may enrich the record via `res.locals.superAudit = { before, after, action, tenantId }`.
 */
export function superAuditMiddleware(scopeLabel: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();

    res.on("finish", () => {
      if (res.statusCode >= 400 || !req.user) return;
      const routePath = String((req as any).route?.path || req.path || "");
      const fullPath = `${req.baseUrl || ""}${routePath}`;
      const params = (req.params || {}) as Record<string, string>;
      const override = (res.locals?.superAudit || {}) as Partial<SuperAuditEntry>;

      const isTenantRoute = /\/tenants\/:(id|tenantId)\b/.test(fullPath) || /\/impersonate\/:tenantId/.test(fullPath);
      const tenantId = override.tenantId ?? (isTenantRoute ? params.id || params.tenantId || null : null);

      const segments = routePath.split("/").filter((s) => s && !s.startsWith(":"));
      const entityType = override.entityType || `${scopeLabel}:${segments[0] || "root"}`;
      const defaultAction = `${req.method} ${fullPath}`.replace(/\s+/g, " ");

      void writeSuperAuditLog(req, {
        action: override.action || defaultAction,
        entityType,
        entityId: override.entityId ?? (params.id || params.tenantId || params.filename || params.slug || null),
        tenantId,
        before: override.before,
        after: override.after ?? { params, body: req.body, query: req.query },
      });
    });

    next();
  };
}

/** Tenant workspace administrator roles (normalized: lowercase, no separators). */
const TENANT_ADMIN_ROLE_KEYS = new Set([
  "superadmin",
  "admin",
  "tenantadmin",
  "workspaceadmin",
  "organizationadmin",
  "companyadmin",
  "owner",
  "hradmin",
  "hrmanager",
]);

export function isTenantAdminRole(roles: string[] | undefined | null): boolean {
  return (roles || []).some((r) => TENANT_ADMIN_ROLE_KEYS.has(String(r).toLowerCase().replace(/[-_\s]/g, "")));
}

export function requireTenantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isTenantAdminRole(req.user.roles)) {
    return res.status(403).json({ error: "Forbidden: Workspace administrator permissions required.", code: "TENANT_ADMIN_REQUIRED" });
  }
  return next();
}

export function isSuperAdminUser(req: AuthRequest): boolean {
  return Boolean(req.user?.roles?.includes("super_admin"));
}
