import { Router, Response, Request } from "express";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import {
  validateWorkspaceSlug,
  getWorkspaceUrl,
  getCustomDomainUrl,
  getRootUrl,
  getSuperAdminUrl,
  getBaseDomain,
  invalidateWorkspaceCache,
} from "../lib/workspace-host";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { WorkspaceHostRequest } from "../middleware/workspace-host.middleware";
import { SettingsService } from "../services/settings/settings.service";

export const workspaceRoutingRouter = Router();

// ─────────────────────────────────────────────
// 1. PUBLIC: Live Workspace Availability Check
// GET /api/workspace/check-slug?slug=xxx
// ─────────────────────────────────────────────
workspaceRoutingRouter.get("/check-slug", async (req: Request, res: Response) => {
  try {
    const rawSlug = String(req.query.slug || "").trim().toLowerCase();

    const validation = validateWorkspaceSlug(rawSlug);
    if (!validation.valid) {
      return res.json({
        available: false,
        slug: rawSlug,
        reason: validation.reason,
      });
    }

    // Check if active tenant has this slug
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: rawSlug },
      select: { id: true },
    });
    if (existingTenant) {
      return res.json({
        available: false,
        slug: rawSlug,
        reason: "taken",
      });
    }

    // Check if reserved by an active 30-day redirect
    const activeRedirect = await (prisma as any).workspaceSlugRedirect.findFirst({
      where: {
        oldSlug: rawSlug,
        redirectUntil: { gte: new Date() },
      },
      select: { id: true },
    });
    if (activeRedirect) {
      return res.json({
        available: false,
        slug: rawSlug,
        reason: "reserved_redirect",
      });
    }

    return res.json({
      available: true,
      slug: rawSlug,
    });
  } catch (err: any) {
    console.error("[CheckSlug Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to check workspace availability" });
  }
});

// ─────────────────────────────────────────────
// 2. PUBLIC: Current Host Workspace Information
// GET /api/public/workspace
// ─────────────────────────────────────────────
workspaceRoutingRouter.get("/public/workspace", async (req: WorkspaceHostRequest, res: Response) => {
  try {
    const hostContext = req.hostContext;

    if (!hostContext || hostContext.type === "public") {
      return res.json({
        resolved: false,
        isRoot: true,
        name: "Master HRMS Platform",
        slug: "root",
        baseDomain: getBaseDomain(),
        rootUrl: getRootUrl(),
      });
    }

    if (hostContext.type === "super") {
      return res.json({
        resolved: false,
        isSuper: true,
        name: "Master HRMS Super Admin",
        baseDomain: getBaseDomain(),
        superAdminUrl: getSuperAdminUrl(),
      });
    }

    if (hostContext.type === "tenant") {
      if (req.workspaceNotFound || !req.resolvedTenant) {
        return res.status(404).json({
          resolved: false,
          error: "Workspace not found",
          code: "WORKSPACE_NOT_FOUND",
          slug: hostContext.slug,
          baseDomain: hostContext.baseDomain,
        });
      }

      const tenant = req.resolvedTenant;
      const brandingGroup = await SettingsService.getGroup("TENANT", tenant.id, "branding");

      return res.json({
        resolved: true,
        id: tenant.id,
        tenantId: tenant.id,
        name: brandingGroup.values["branding.app_name"] || tenant.name,
        slug: tenant.slug,
        logoUrl: brandingGroup.mediaUrls["branding.logo_light_id"] || tenant.logoUrl || null,
        logoDark: brandingGroup.mediaUrls["branding.logo_dark_id"] || tenant.logoUrl || null,
        faviconUrl: brandingGroup.mediaUrls["branding.favicon_id"] || null,
        primaryColor: brandingGroup.values["branding.primary_color"] || null,
        footerText: brandingGroup.values["branding.footer_text"] || null,
        timezone: tenant.timezone || "Asia/Kolkata",
        status: tenant.status,
        baseDomain: hostContext.baseDomain,
        workspaceUrl: getWorkspaceUrl(tenant.slug),
      });
    }

    if (hostContext.type === "custom_domain") {
      if (!req.resolvedTenant) {
        return res.status(404).json({
          resolved: false,
          error: "Custom domain not active or workspace not found.",
          code: "CUSTOM_DOMAIN_NOT_FOUND",
          domain: hostContext.domain,
        });
      }

      const tenant = req.resolvedTenant;
      const brandingGroup = await SettingsService.getGroup("TENANT", tenant.id, "branding");

      return res.json({
        resolved: true,
        isCustomDomain: true,
        customDomain: hostContext.domain,
        id: tenant.id,
        tenantId: tenant.id,
        name: brandingGroup.values["branding.app_name"] || tenant.name,
        slug: tenant.slug,
        logoUrl: brandingGroup.mediaUrls["branding.logo_light_id"] || tenant.logoUrl || null,
        logoDark: brandingGroup.mediaUrls["branding.logo_dark_id"] || tenant.logoUrl || null,
        faviconUrl: brandingGroup.mediaUrls["branding.favicon_id"] || null,
        primaryColor: brandingGroup.values["branding.primary_color"] || null,
        timezone: tenant.timezone || "Asia/Kolkata",
        status: tenant.status,
        baseDomain: hostContext.baseDomain,
        workspaceUrl: getCustomDomainUrl(hostContext.domain),
        defaultWorkspaceUrl: getWorkspaceUrl(tenant.slug),
      });
    }

    return res.status(404).json({
      resolved: false,
      error: "Unknown host context",
      code: "UNKNOWN_HOST",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to resolve workspace" });
  }
});

// ─────────────────────────────────────────────
// 3. PUBLIC: Find Workspace By Slug
// GET /api/public/workspace/:slug
// ─────────────────────────────────────────────
workspaceRoutingRouter.get("/public/workspace/:slug", async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });

    if (!tenant) {
      // Check if it was renamed
      const redirect = await (prisma as any).workspaceSlugRedirect.findFirst({
        where: {
          oldSlug: slug,
          redirectUntil: { gte: new Date() },
        },
        select: { newSlug: true },
      });

      if (redirect) {
        return res.json({
          exists: true,
          slug: redirect.newSlug,
          workspaceUrl: getWorkspaceUrl(redirect.newSlug),
          redirectedFrom: slug,
        });
      }

      return res.status(404).json({
        exists: false,
        error: "We couldn't find that workspace.",
      });
    }

    return res.json({
      exists: true,
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      workspaceUrl: getWorkspaceUrl(tenant.slug),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to query workspace" });
  }
});

// ─────────────────────────────────────────────
// 4. PUBLIC: Email Me My Workspace Links
// POST /api/public/workspace/email-links
// ─────────────────────────────────────────────
workspaceRoutingRouter.post("/public/workspace/email-links", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // Look up workspaces associated with this email
    if (normalizedEmail) {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          profile: { include: { tenant: true } },
          roles: { include: { tenant: true } },
        },
      });

      if (user) {
        const tenantMap = new Map<string, { name: string; slug: string; url: string }>();
        if (user.profile?.tenant) {
          tenantMap.set(user.profile.tenant.id, {
            name: user.profile.tenant.name,
            slug: user.profile.tenant.slug,
            url: getWorkspaceUrl(user.profile.tenant.slug),
          });
        }
        user.roles.forEach((r) => {
          if (r.tenant) {
            tenantMap.set(r.tenant.id, {
              name: r.tenant.name,
              slug: r.tenant.slug,
              url: getWorkspaceUrl(r.tenant.slug),
            });
          }
        });

        // Email would be dispatched here with tenant links
        console.log(`[Workspace Links] Dispatched to ${normalizedEmail}:`, Array.from(tenantMap.values()));
      }
    }

    // MANDATORY PRIVACY RULE: Always return the exact same generic message
    return res.json({
      success: true,
      message: "If this email is associated with any workspaces, we have sent the links to your inbox.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process request" });
  }
});

// ─────────────────────────────────────────────
// 5. AUTHENTICATED: Rename Workspace
// POST /api/workspace/rename
// ─────────────────────────────────────────────
workspaceRoutingRouter.post(
  "/rename",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context missing" });
      }

      // Only tenant admins or super admins can rename
      const isTenantAdmin = req.user?.roles?.some((r) => ["admin", "hr_admin", "super_admin"].includes(r));
      if (!isTenantAdmin) {
        return res.status(403).json({ error: "Forbidden: Only workspace administrators can rename this workspace." });
      }

      const { newSlug: rawNewSlug } = req.body;
      const newSlug = String(rawNewSlug || "").trim().toLowerCase();

      // 1. Slug validation
      const validation = validateWorkspaceSlug(newSlug);
      if (!validation.valid) {
        return res.status(400).json({
          error: `Invalid workspace name: ${validation.reason}`,
          code: "INVALID_SLUG",
          reason: validation.reason,
        });
      }

      // 2. Fetch current tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const oldSlug = tenant.slug.toLowerCase();
      if (oldSlug === newSlug) {
        return res.status(400).json({ error: "New workspace name must be different from current name." });
      }

      // 3. 30-Day Throttle: maximum one rename per 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentRename = await (prisma as any).workspaceSlugHistory.findFirst({
        where: {
          tenantId,
          changedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { changedAt: "desc" },
      });

      if (recentRename) {
        const nextAllowed = new Date(recentRename.changedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        return res.status(400).json({
          error: "Your workspace can only be renamed once every 30 days.",
          code: "RENAME_THROTTLED",
          lastRenamedAt: recentRename.changedAt.toISOString(),
          nextAllowedAt: nextAllowed.toISOString(),
        });
      }

      // 4. Global Uniqueness Check
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: newSlug },
      });
      if (existingTenant) {
        return res.status(409).json({
          error: "This workspace address is already taken. Please choose another.",
          code: "SLUG_TAKEN",
        });
      }

      const activeRedirect = await (prisma as any).workspaceSlugRedirect.findFirst({
        where: {
          oldSlug: newSlug,
          redirectUntil: { gte: new Date() },
        },
      });
      if (activeRedirect) {
        return res.status(409).json({
          error: "This workspace address is currently reserved by a redirect.",
          code: "SLUG_RESERVED",
        });
      }

      // 5. Perform Rename Transaction
      const redirectUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userId = req.user?.userId || "system";

      await prisma.$transaction([
        // Update tenant's active slug
        prisma.tenant.update({
          where: { id: tenantId },
          data: { slug: newSlug },
        }),
        // Record slug history
        (prisma as any).workspaceSlugHistory.create({
          data: {
            tenantId,
            oldSlug,
            newSlug,
            changedAt: new Date(),
            releaseAt: redirectUntil,
            changedBy: userId,
          },
        }),
        // Create 30-day redirect
        (prisma as any).workspaceSlugRedirect.upsert({
          where: { oldSlug },
          create: {
            tenantId,
            oldSlug,
            newSlug,
            redirectUntil,
          },
          update: {
            tenantId,
            newSlug,
            redirectUntil,
          },
        }),
      ]);

      // 6. Invalidate Routing Cache
      invalidateWorkspaceCache(oldSlug);
      invalidateWorkspaceCache(newSlug);

      return res.json({
        success: true,
        oldSlug,
        newSlug,
        oldWorkspaceUrl: getWorkspaceUrl(oldSlug),
        newWorkspaceUrl: getWorkspaceUrl(newSlug),
        redirectUntil: redirectUntil.toISOString(),
        message: "Workspace renamed successfully. Your previous address will redirect to the new address for 30 days.",
      });
    } catch (err: any) {
      console.error("[Workspace Rename Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to rename workspace" });
    }
  }
);

// ─────────────────────────────────────────────
// 6. AUTHENTICATED: View Slug Rename History
// GET /api/workspace/slug-history
// ─────────────────────────────────────────────
workspaceRoutingRouter.get(
  "/slug-history",
  requireAuth,
  resolveTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context missing" });
      }

      const history = await (prisma as any).workspaceSlugHistory.findMany({
        where: { tenantId },
        orderBy: { changedAt: "desc" },
      });

      return res.json({
        success: true,
        history,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch slug history" });
    }
  }
);
