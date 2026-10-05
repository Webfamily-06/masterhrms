import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { SettingsService, normalizeScopeId } from "../services/settings/settings.service";
import { SettingScopeType } from "../services/settings/settings-registry";
import { prisma } from "../prisma";

export const settingsRouter = Router();

function resolveScopeAndId(req: AuthRequest, requestedScope: string): {
  scope: SettingScopeType;
  scopeId: string | null;
} {
  const normScope = requestedScope.toUpperCase() as SettingScopeType;
  if (!["PLATFORM", "TENANT", "USER"].includes(normScope)) {
    throw new Error(`Invalid scope '${requestedScope}'. Allowed: PLATFORM, TENANT, USER`);
  }

  const isSuper = req.user?.roles?.includes("super_admin");

  if (normScope === "PLATFORM") {
    if (!isSuper) {
      const err: any = new Error("Forbidden: Super Admin access required for PLATFORM scope");
      err.status = 403;
      throw err;
    }
    return { scope: "PLATFORM", scopeId: null };
  }

  if (normScope === "TENANT") {
    const tenantId = isSuper && req.query.tenantId ? String(req.query.tenantId) : req.user?.tenantId;
    if (!tenantId) {
      const err: any = new Error("Tenant context is required for TENANT scope");
      err.status = 400;
      throw err;
    }
    return { scope: "TENANT", scopeId: tenantId };
  }

  // USER scope
  return { scope: "USER", scopeId: req.user?.userId || null };
}

/**
 * GET /api/v1/settings/:scope/:group
 * Read settings for a group (secrets masked as { set: true })
 */
settingsRouter.get("/:scope/:group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const data = await SettingsService.getGroup(scope, scopeId, group);
    return res.json(data);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings" });
  }
});

/**
 * PUT /api/v1/settings/:scope/:group
 * Save settings for a group atomically.
 * Body = changed fields only.
 */
settingsRouter.put("/:scope/:group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    const result = await SettingsService.setGroup(scope, scopeId, group, req.body, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to save settings" });
  }
});

/**
 * DELETE /api/v1/settings/:scope/:group/:key
 * Remove a single setting override (reverts to fallback).
 */
settingsRouter.delete("/:scope/:group/:key", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const { group, key } = req.params;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    const result = await SettingsService.deleteSetting(scope, scopeId, group, key, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to delete setting override" });
  }
});

/**
 * POST /api/v1/settings/:scope/:group/reset
 * Reset settings in a group to defaults
 */
settingsRouter.post("/:scope/:group/reset", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await SettingsService.resetGroup(scope, scopeId, group, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to reset settings" });
  }
});

/**
 * GET /api/v1/settings/:scope/:group/history
 * Audit trail / version history
 */
settingsRouter.get("/:scope/:group/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const normScopeId = normalizeScopeId(scope, scopeId);
    const audits = await prisma.settingAudit.findMany({
      where: {
        scope,
        scopeId: normScopeId,
        key: { startsWith: `${group}.` },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json(audits);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings history" });
  }
});
